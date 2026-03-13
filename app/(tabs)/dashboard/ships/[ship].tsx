import * as ImagePicker from 'expo-image-picker';
import Checkbox from 'expo-checkbox';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';

import { LoginGate } from '@/components/LoginGate';
import { formatImageCategoryLabel, imageCategoryAllowsSections, IMAGE_CATEGORY_ORDER } from '@/constants/imageCategories';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/services/authApi';
import { ApiLittleShipImageCategory, fetchKnownShips, fetchLittleShipImageCategories } from '@/services/publicApi';
import {
  ApiDashboardShip,
  ApiDashboardShipImage,
  fetchDashboardShip,
  updateDashboardShip,
  updateDashboardShipImageCategory,
  updateDashboardShipImagePositions,
  updateDashboardShipProfileImage,
  uploadDashboardShipImages,
} from '@/services/dashboardApi';
import { useLocalSearchParams } from 'expo-router';

const ANNIVERSARY_RETURN_YEARS = [1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2025] as const;

type EditableImageState = {
  id: number;
  caption: string;
  imageCategory: string;
  categoryAttribute: string;
};

type ImageSectionGroup = {
  key: string;
  title: string;
  images: ApiDashboardShipImage[];
};

type DashboardCategoryGroup = {
  category: string;
  allImages: ApiDashboardShipImage[];
  images: ApiDashboardShipImage[];
  sections: ImageSectionGroup[];
};

type SubsectionManagerState = {
  category: string;
  subsectionName: string;
  selectedImageIds: number[];
};

type ShipDraft = {
  builder: string;
  build_year: string;
  construction: string;
  displacement: string;
  length: string;
  beam: string;
  draft: string;
  engine: string;
  ship_type: string;
  operations_used: string;
  other_names: string;
  ship_history_html: string;
  narrative: string;
  archive: string;
  language: string;
  return_status: string;
  anniversary_returns_attended: string;
  source: string;
  web_url: string;
};

function sortImages(images: ApiDashboardShipImage[]) {
  return [...images].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.id - right.id;
  });
}

function normalizeCategoryAttribute(value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : '';
}

function buildCategoryGroups(
  images: ApiDashboardShipImage[],
  categoryTree: ApiLittleShipImageCategory[] = [],
): DashboardCategoryGroup[] {
  const imagesByCategory = new Map<string, ApiDashboardShipImage[]>();
  const categoryTreeBySlug = new Map(categoryTree.map((category) => [category.slug.toLowerCase(), category] as const));

  images.forEach((image) => {
    const category = (image.image_category || 'ship image').trim().toLowerCase();
    imagesByCategory.set(category, [...(imagesByCategory.get(category) ?? []), image]);
  });

  return IMAGE_CATEGORY_ORDER.map((category) => {
    const categoryImages = sortImages(imagesByCategory.get(category) ?? []);

    if (!imageCategoryAllowsSections(category)) {
      return {
        category,
        allImages: categoryImages,
        images: categoryImages,
        sections: [],
      };
    }

    const uncategorized: ApiDashboardShipImage[] = [];
    const sectionMap = new Map<string, ApiDashboardShipImage[]>();
    const apiSections = categoryTreeBySlug.get(category)?.subcategories ?? [];

    categoryImages.forEach((image) => {
      const sectionName = normalizeCategoryAttribute(image.category_attribute);
      if (!sectionName) {
        uncategorized.push(image);
        return;
      }

      sectionMap.set(sectionName, [...(sectionMap.get(sectionName) ?? []), image]);
    });

    apiSections.forEach((section) => {
      if (!sectionMap.has(section.name)) {
        sectionMap.set(section.name, []);
      }
    });

    return {
      category,
      allImages: categoryImages,
      images: uncategorized,
      sections: Array.from(sectionMap.entries()).map(([title, sectionImages]) => ({
        key: `${category}:${title}`,
        title,
        images: sectionImages,
      })),
    };
  });
}

function createShipDraft(ship: ApiDashboardShip): ShipDraft {
  return {
    builder: ship.builder ?? '',
    build_year: ship.build_year ?? '',
    construction: ship.construction ?? '',
    displacement: ship.displacement ?? '',
    length: ship.length ?? '',
    beam: ship.beam ?? '',
    draft: ship.draft ?? '',
    engine: ship.engine ?? '',
    ship_type: ship.ship_type ?? '',
    operations_used: ship.operations_used ?? '',
    other_names: ship.other_names.join(', '),
    ship_history_html: ship.ship_history_html || ship.ship_history || '',
    narrative: ship.narrative ?? '',
    archive: ship.archive ?? '',
    language: ship.language ?? '',
    return_status: ship.return_status ?? '',
    anniversary_returns_attended: ship.anniversary_returns_attended.join(', '),
    source: ship.source ?? '',
    web_url: ship.web_url ?? '',
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function renderHtmlAsText(value: string | null | undefined) {
  if (!value) return '';

  const withBreaks = value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*p\b[^>]*>/gi, '')
    .replace(/<\s*li\b[^>]*>/gi, '- ')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<\s*\/?(ul|ol)\b[^>]*>/gi, '\n');

  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ''))
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function buildShipUpdatePayload(ship: ApiDashboardShip, draft: ShipDraft, imageCaption?: Record<string, string>) {
  return {
    adls_id: ship.adls_id,
    adls_member: ship.adls_member ? 'Yes' : 'No',
    builder: draft.builder.trim() || null,
    build_year: draft.build_year.trim() || null,
    construction: draft.construction.trim() || null,
    displacement: draft.displacement.trim() || null,
    length: draft.length.trim() || null,
    beam: draft.beam.trim() || null,
    draft: draft.draft.trim() || null,
    engine: draft.engine.trim() || null,
    ship_type: draft.ship_type.trim() || null,
    operations_used: draft.operations_used.trim() || null,
    other_names: draft.other_names.trim() || null,
    ship_history_html: draft.ship_history_html.trim() || null,
    narrative: draft.narrative.trim() || null,
    archive: draft.archive.trim() || null,
    language: draft.language.trim() || null,
    return_status: draft.return_status.trim() || null,
    anniversary_returns_attended: draft.anniversary_returns_attended
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value)),
    source: draft.source.trim() || null,
    web_url: draft.web_url.trim() || null,
    image_caption: imageCaption,
  };
}

function ShipField({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'number-pad' | 'url';
  readOnly?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        editable={!readOnly}
        multiline={multiline}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor="#7A90A5"
        style={[styles.input, multiline ? styles.textArea : null, readOnly ? styles.readOnlyInput : null]}
        value={value}
      />
    </View>
  );
}

function DraggableImageRow({
  image,
  index,
  disabled,
  allowDrag,
  canSelectProfile,
  showReorderHint,
  onEdit,
  onDrag,
  onSelectProfile,
}: {
  image: ApiDashboardShipImage;
  index: number;
  disabled: boolean;
  allowDrag: boolean;
  canSelectProfile: boolean;
  showReorderHint: boolean;
  onEdit: () => void;
  onDrag: () => void;
  onSelectProfile: () => void;
}) {
  return (
    <View style={styles.reorderRow}>
      {canSelectProfile ? (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: image.ship_profile_image }}
          disabled={disabled}
          onPress={onSelectProfile}
          style={[styles.profileRadio, disabled ? styles.buttonDisabled : null]}>
          <View style={[styles.profileRadioOuter, image.ship_profile_image ? styles.profileRadioOuterActive : null]}>
            {image.ship_profile_image ? <View style={styles.profileRadioInner} /> : null}
          </View>
          <Text style={styles.profileRadioLabel}>Profile</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onEdit} style={styles.reorderPreview}>
        <Image source={{ uri: image.image_url || undefined }} style={styles.reorderThumb} />
        <View style={styles.reorderCopy}>
          <Text style={styles.reorderTitle}>{image.caption || image.category_attribute || `Image ${index + 1}`}</Text>
          {imageCategoryAllowsSections(image.image_category) ? (
            <View style={styles.reorderMetaRow}>
              <View style={styles.reorderMetaBadge}>
                <Text style={styles.reorderMetaBadgeText}>
                  {normalizeCategoryAttribute(image.category_attribute) || 'Uncategorized'}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.reorderEditBadge}>
            <Text style={styles.reorderEditBadgeText}>Edit</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || !allowDrag}
        onLongPress={allowDrag ? onDrag : undefined}
        delayLongPress={120}
        style={[styles.dragHandle, disabled || !allowDrag ? styles.buttonDisabled : null]}>
        <Text style={styles.dragHandleText}>{allowDrag ? 'Re-order' : 'Edit only'}</Text>
        {allowDrag && showReorderHint ? <Text style={styles.dragHandleSubtext}>Hold and drag up/down</Text> : null}
      </Pressable>
    </View>
  );
}

export default function DashboardShipDetailScreen() {
  const { ship } = useLocalSearchParams<{ ship?: string }>();
  const { authLoading, isAuthenticated, authToken } = useAuth();
  const [data, setData] = useState<ApiDashboardShip | null>(null);
  const [shipDraft, setShipDraft] = useState<ShipDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<ApiDashboardShipImage | null>(null);
  const [editableImage, setEditableImage] = useState<EditableImageState | null>(null);
  const [publicImageCategories, setPublicImageCategories] = useState<ApiLittleShipImageCategory[]>([]);
  const [isSubsectionMenuOpen, setIsSubsectionMenuOpen] = useState(false);
  const [isCreatingSubsection, setIsCreatingSubsection] = useState(false);
  const [subsectionManager, setSubsectionManager] = useState<SubsectionManagerState | null>(null);

  const loadShip = async (resetLoading = false) => {
    if (!authToken || !ship) return;
    if (resetLoading) setLoading(true);

    try {
      const payload = await fetchDashboardShip(ship, authToken);
      setData(payload);
      setShipDraft(createShipDraft(payload));
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load ship detail.');
    } finally {
      if (resetLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!authToken || !ship) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const payload = await fetchDashboardShip(ship, authToken);
        if (!mounted) return;
        setData(payload);
        setShipDraft(createShipDraft(payload));
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof ApiRequestError ? fetchError.message : 'Unable to load ship detail.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authToken, ship]);

  useEffect(() => {
    let mounted = true;

    if (!data?.adls_id) {
      setPublicImageCategories([]);
      return;
    }

    (async () => {
      try {
        const knownShips = await fetchKnownShips();
        if (!mounted) return;

        const matchedShip = knownShips.rows.find((row) => Number(row.adls_id) === Number(data.adls_id));
        if (!matchedShip?.slug) {
          setPublicImageCategories([]);
          return;
        }

        const payload = await fetchLittleShipImageCategories(matchedShip.slug);
        if (!mounted) return;
        setPublicImageCategories(payload.data.categories ?? []);
      } catch (fetchError) {
        if (!mounted) return;
        console.warn('Unable to load public image categories for dashboard ship', {
          shipId: data.adls_id,
          error: fetchError,
        });
        setPublicImageCategories([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [data?.adls_id]);

  const groupedImages = useMemo(
    () => buildCategoryGroups(data?.images ?? [], publicImageCategories),
    [data?.images, publicImageCategories],
  );
  const subsectionOptions = useMemo(() => {
    const category = editableImage?.imageCategory;
    if (!imageCategoryAllowsSections(category)) return [] as string[];

    const match = groupedImages.find((group) => group.category === category);
    return match ? match.sections.map((section) => section.title) : [];
  }, [editableImage?.imageCategory, groupedImages]);
  const subsectionManagerOptions = useMemo(() => {
    const category = subsectionManager?.category;
    if (!category) return [] as string[];

    const match = groupedImages.find((group) => group.category === category);
    return match ? match.sections.map((section) => section.title) : [];
  }, [groupedImages, subsectionManager?.category]);
  const shipHistoryText = useMemo(() => renderHtmlAsText(shipDraft?.ship_history_html), [shipDraft?.ship_history_html]);

  const openImageEditor = (image: ApiDashboardShipImage) => {
    const currentCategory = image.image_category || 'ship image';

    setEditingImage(image);
    setEditableImage({
      id: image.id,
      caption: image.caption || '',
      imageCategory: currentCategory,
      categoryAttribute: normalizeCategoryAttribute(image.category_attribute),
    });
    setIsSubsectionMenuOpen(false);
    setIsCreatingSubsection(false);
  };

  const closeImageEditor = () => {
    if (saving) return;
    setEditingImage(null);
    setEditableImage(null);
    setIsSubsectionMenuOpen(false);
    setIsCreatingSubsection(false);
  };

  const updateDraftField = (key: keyof ShipDraft, value: string) => {
    setShipDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const toggleAnniversaryReturnYear = (year: number, checked: boolean) => {
    setShipDraft((current) => {
      if (!current) return current;

      const existingYears = current.anniversary_returns_attended
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));

      const nextYears = checked
        ? Array.from(new Set([...existingYears, year])).sort((left, right) => left - right)
        : existingYears.filter((value) => value !== year);

      return {
        ...current,
        anniversary_returns_attended: nextYears.join(', '),
      };
    });
  };

  const handleSaveShip = async () => {
    if (!authToken || !ship || !data || !shipDraft) return;
    setSaving(true);

    try {
      await updateDashboardShip(ship, buildShipUpdatePayload(data, shipDraft), authToken);
      await loadShip();
      setEditMode(false);
    } catch (saveError) {
      Alert.alert(
        'Update failed',
        saveError instanceof ApiRequestError ? saveError.message : 'Unable to save ship details right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async (category: string) => {
    if (!authToken || !ship) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access required', 'Please allow photo library access to upload ship images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 0,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploadingCategory(category);

    try {
      await uploadDashboardShipImages(
        ship,
        {
          image_category: category,
          images: result.assets.map((asset, index) => ({
            uri: asset.uri,
            name: asset.fileName || `ship-image-${Date.now()}-${index}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          })),
        },
        authToken,
      );
      await loadShip();
    } catch (uploadError) {
      Alert.alert(
        'Upload failed',
        uploadError instanceof ApiRequestError ? uploadError.message : 'Unable to upload images right now.',
      );
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleReorderDrop = async (category: string, orderedIds: number[]) => {
    if (!authToken || !ship || !data || saving) return;
    const existingIds = sortImages(data.images.filter((item) => (item.image_category || 'ship image') === category)).map((item) => item.id);
    if (orderedIds.every((id, index) => id === existingIds[index])) return;

    setSaving(true);

    try {
      await updateDashboardShipImagePositions(
        ship,
        {
          ordered_ids: orderedIds,
          image_category: category,
        },
        authToken,
      );
      await loadShip();
    } catch (reorderError) {
      Alert.alert(
        'Reorder failed',
        reorderError instanceof ApiRequestError ? reorderError.message : 'Unable to update image order right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImage = async () => {
    if (!authToken || !ship || !data || !editingImage || !editableImage || !shipDraft) return;

    const nextCategory = editableImage.imageCategory.trim().toLowerCase();
    const originalCategory = editingImage.image_category || 'ship image';
    const nextCategoryAttribute = imageCategoryAllowsSections(nextCategory)
      ? normalizeCategoryAttribute(editableImage.categoryAttribute)
      : '';
    const originalCategoryAttribute = normalizeCategoryAttribute(editingImage.category_attribute);

    setSaving(true);

    try {
      if ((editingImage.caption || '') !== editableImage.caption) {
        await updateDashboardShip(
          ship,
          buildShipUpdatePayload(data, shipDraft, { [String(editingImage.id)]: editableImage.caption.trim() }),
          authToken,
        );
      }

      if (originalCategory !== nextCategory || originalCategoryAttribute !== nextCategoryAttribute) {
        await updateDashboardShipImageCategory(
          ship,
          editingImage.id,
          {
            image_category: nextCategory,
            category_attribute: nextCategoryAttribute || null,
          },
          authToken,
        );
      }

      const originalCategoryIds = sortImages(
        data.images.filter((item) => (item.image_category || 'ship image') === originalCategory),
      ).map((item) => item.id);
      const targetCategoryBaseIds = sortImages(
        data.images.filter((item) => (item.image_category || 'ship image') === nextCategory && item.id !== editingImage.id),
      ).map((item) => item.id);

      if (originalCategory !== nextCategory) {
        const reorderedTargetIds = [...targetCategoryBaseIds, editingImage.id];
        if (originalCategoryIds.filter((id) => id !== editingImage.id).length > 0) {
          await updateDashboardShipImagePositions(
            ship,
            {
              ordered_ids: originalCategoryIds.filter((id) => id !== editingImage.id),
              image_category: originalCategory,
            },
            authToken,
          );
        }
        await updateDashboardShipImagePositions(ship, { ordered_ids: reorderedTargetIds, image_category: nextCategory }, authToken);
      }

      await loadShip();
      closeImageEditor();
    } catch (saveError) {
      Alert.alert(
        'Update failed',
        saveError instanceof ApiRequestError ? saveError.message : 'Unable to update image details right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openSubsectionManager = (category: string) => {
    setSubsectionManager({
      category,
      subsectionName: '',
      selectedImageIds: [],
    });
  };

  const closeSubsectionManager = () => {
    if (saving) return;
    setSubsectionManager(null);
  };

  const toggleSubsectionManagerImage = (imageId: number) => {
    setSubsectionManager((current) => {
      if (!current) return current;
      const selectedImageIds = current.selectedImageIds.includes(imageId)
        ? current.selectedImageIds.filter((id) => id !== imageId)
        : [...current.selectedImageIds, imageId];

      return {
        ...current,
        selectedImageIds,
      };
    });
  };

  const handleSaveSubsectionManager = async () => {
    if (!authToken || !ship || !data || !subsectionManager) return;

    const subsectionName = normalizeCategoryAttribute(subsectionManager.subsectionName);
    if (!subsectionName) {
      Alert.alert('Subsection required', 'Enter a subsection name before saving.');
      return;
    }
    if (subsectionManager.selectedImageIds.length === 0) {
      Alert.alert('Select images', 'Choose at least one image to add to this subsection.');
      return;
    }

    setSaving(true);

    try {
      const targetImages = data.images.filter((image) => subsectionManager.selectedImageIds.includes(image.id));
      for (const image of targetImages) {
        await updateDashboardShipImageCategory(
          ship,
          image.id,
          {
            image_category: subsectionManager.category,
            category_attribute: subsectionName,
          },
          authToken,
        );
      }

      await loadShip();
      setSubsectionManager(null);
    } catch (saveError) {
      Alert.alert(
        'Update failed',
        saveError instanceof ApiRequestError ? saveError.message : 'Unable to create subsection right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSelectProfileImage = async (imageId: number) => {
    if (!authToken || !ship || !data || saving) return;
    setSaving(true);

    try {
      await updateDashboardShipProfileImage(ship, imageId, authToken);
      await loadShip();
    } catch (profileError) {
      Alert.alert(
        'Update failed',
        profileError instanceof ApiRequestError ? profileError.message : 'Unable to update the profile image right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#0E4A72" />
      </View>
    );
  }

  if (!isAuthenticated) return <LoginGate area="My Ship" />;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {data && shipDraft ? (
          <>
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <View style={styles.titleCopy}>
                  <Text style={styles.title}>{data.ship_name}</Text>
                  <Text style={styles.meta}>{[data.builder, data.build_year, data.ship_type].filter(Boolean).join(' • ')}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => {
                    if (editMode) {
                      setShipDraft(createShipDraft(data));
                    }
                    setEditMode((current) => !current);
                  }}
                  style={[styles.editButton, editMode ? styles.editButtonActive : null]}>
                  <Text style={[styles.editButtonLabel, editMode ? styles.editButtonLabelActive : null]}>
                    {editMode ? 'Cancel' : 'Edit'}
                  </Text>
                </Pressable>
              </View>

              {editMode ? (
                <>
                  <ShipField label="Builder" value={shipDraft.builder} onChangeText={(value) => updateDraftField('builder', value)} readOnly />
                  <View style={styles.twoColumnRow}>
                    <View style={styles.halfField}>
                      <ShipField
                        label="Build Year"
                        value={shipDraft.build_year}
                        onChangeText={(value) => updateDraftField('build_year', value)}
                        keyboardType="number-pad"
                        readOnly
                      />
                    </View>
                    <View style={styles.halfField}>
                      <ShipField
                        label="Ship Type"
                        value={shipDraft.ship_type}
                        onChangeText={(value) => updateDraftField('ship_type', value)}
                        readOnly
                      />
                    </View>
                  </View>
                  <ShipField label="Construction" value={shipDraft.construction} onChangeText={(value) => updateDraftField('construction', value)} />
                  <View style={styles.twoColumnRow}>
                    <View style={styles.halfField}>
                      <ShipField label="Length" value={shipDraft.length} onChangeText={(value) => updateDraftField('length', value)} />
                    </View>
                    <View style={styles.halfField}>
                      <ShipField label="Beam" value={shipDraft.beam} onChangeText={(value) => updateDraftField('beam', value)} />
                    </View>
                  </View>
                  <View style={styles.twoColumnRow}>
                    <View style={styles.halfField}>
                      <ShipField label="Draft" value={shipDraft.draft} onChangeText={(value) => updateDraftField('draft', value)} />
                    </View>
                    <View style={styles.halfField}>
                      <ShipField label="Displacement" value={shipDraft.displacement} onChangeText={(value) => updateDraftField('displacement', value)} />
                    </View>
                  </View>
                  <ShipField label="Engine" value={shipDraft.engine} onChangeText={(value) => updateDraftField('engine', value)} />
                  <ShipField
                    label="Website"
                    value={shipDraft.web_url}
                    onChangeText={(value) => updateDraftField('web_url', value)}
                    keyboardType="url"
                  />
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Participated In Anniversary Returns</Text>
                    <Text style={styles.fieldHint}>Every 5 years since ADLS formation, excluding Covid years.</Text>
                    <View style={styles.checkboxGrid}>
                      {ANNIVERSARY_RETURN_YEARS.map((year) => {
                        const selectedYears = shipDraft.anniversary_returns_attended
                          .split(',')
                          .map((value) => Number.parseInt(value.trim(), 10))
                          .filter((value) => Number.isFinite(value));
                        const checked = selectedYears.includes(year);

                        return (
                          <Pressable
                            key={year}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked }}
                            onPress={() => toggleAnniversaryReturnYear(year, !checked)}
                            style={styles.checkboxRow}>
                            <Checkbox
                              color={checked ? '#0E4A72' : undefined}
                              style={styles.checkbox}
                              value={checked}
                              onValueChange={(value) => toggleAnniversaryReturnYear(year, value)}
                            />
                            <Text style={styles.checkboxLabel}>{String(year)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <ShipField
                    label="Ship History"
                    value={shipDraft.ship_history_html}
                    onChangeText={(value) => updateDraftField('ship_history_html', value)}
                    multiline
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={handleSaveShip}
                    style={[styles.primaryButton, saving ? styles.buttonDisabled : null]}>
                    <Text style={styles.primaryButtonLabel}>{saving ? 'Saving...' : 'Save ship details'}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.body}>{shipHistoryText || 'No ship history recorded.'}</Text>
                  <View style={styles.summaryGrid}>
                    {[
                      ['Length', data.length],
                      ['Beam', data.beam],
                      ['Draft', data.draft],
                      ['Engine', data.engine],
                      ['Construction', data.construction],
                      ['Other Names', data.other_names.join(', ') || null],
                    ].map(([label, value]) =>
                      value ? (
                        <View key={label} style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>{label}</Text>
                          <Text style={styles.summaryValue}>{String(value)}</Text>
                        </View>
                      ) : null,
                    )}
                  </View>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Associated Users</Text>
              {data.associated_users.map((user) => (
                <View key={user.id} style={styles.associatedUserCard}>
                  <View style={styles.associatedUserHeader}>
                    <View style={styles.associatedUserCopy}>
                      <Text style={styles.associatedUserName}>{user.name}</Text>
                      <Text style={styles.associatedUserType}>
                        {user.user_type ? `(${user.user_type.charAt(0).toUpperCase()}${user.user_type.slice(1)})` : '(Member)'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.associatedUserStatusBadge,
                        user.subscription_up_to_date
                          ? styles.associatedUserStatusBadgeCurrent
                          : styles.associatedUserStatusBadgeOverdue,
                      ]}>
                      <Text
                        style={[
                          styles.associatedUserStatusText,
                          user.subscription_up_to_date
                            ? styles.associatedUserStatusTextCurrent
                            : styles.associatedUserStatusTextOverdue,
                        ]}>
                        {user.subscription_up_to_date ? 'Up to date' : 'Overdue'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.associatedUserMeta}>
                    {`Due ${user.subscription_due_date || 'Unknown'} | Last paid ${user.subscription_last_paid_at || 'Never'}`}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Anniversary Returns</Text>
              <Text style={styles.body}>{data.anniversary_returns_attended.join(', ') || 'None recorded'}</Text>
            </View>

            {groupedImages.map(({ category, allImages, images, sections }) => (
              <View key={category} style={styles.card}>
                <Text style={styles.sectionTitle}>{formatImageCategoryLabel(category)}</Text>
                {editMode ? (
                  <View style={styles.reorderList}>
                    {imageCategoryAllowsSections(category) ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => openSubsectionManager(category)}
                        style={[styles.secondaryActionButton, saving ? styles.buttonDisabled : null]}>
                        <Text style={styles.secondaryActionButtonText}>Add subsection</Text>
                      </Pressable>
                    ) : null}
                    {imageCategoryAllowsSections(category) && (sections.length > 0 || images.length > 0) ? (
                      <View style={styles.sectionSummaryWrap}>
                        {sections.map((section) => (
                          <View key={section.key} style={styles.sectionSummaryChip}>
                            <Text style={styles.sectionSummaryChipText}>{`${section.title} (${section.images.length})`}</Text>
                          </View>
                        ))}
                        {images.length > 0 ? (
                          <View style={styles.sectionSummaryChip}>
                            <Text style={styles.sectionSummaryChipText}>{`Uncategorized (${images.length})`}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {imageCategoryAllowsSections(category) ? (
                      <>
                        {sections.map((section) => (
                          <View key={section.key} style={styles.sectionGroup}>
                            <Text style={styles.sectionGroupTitle}>{section.title}</Text>
                            <View style={styles.reorderDraggableList}>
                              {section.images.map((item, index) => (
                                <DraggableImageRow
                                  key={item.id}
                                  allowDrag={false}
                                  canSelectProfile={false}
                                  disabled={saving}
                                  image={item}
                                  index={index}
                                  showReorderHint={false}
                                  onDrag={() => {}}
                                  onEdit={() => openImageEditor(item)}
                                  onSelectProfile={() => {}}
                                />
                              ))}
                            </View>
                          </View>
                        ))}
                        {images.length > 0 ? (
                          <View style={styles.sectionGroup}>
                            <Text style={styles.sectionGroupTitle}>Uncategorized</Text>
                            <View style={styles.reorderDraggableList}>
                              {images.map((item, index) => (
                                <DraggableImageRow
                                  key={item.id}
                                  allowDrag={false}
                                  canSelectProfile={false}
                                  disabled={saving}
                                  image={item}
                                  index={index}
                                  showReorderHint={false}
                                  onDrag={() => {}}
                                  onEdit={() => openImageEditor(item)}
                                  onSelectProfile={() => {}}
                                />
                              ))}
                            </View>
                          </View>
                        ) : null}
                        {allImages.length === 0 ? <Text style={styles.emptyText}>No images in this category yet.</Text> : null}
                        <Text style={styles.dragHint}>
                          Images are grouped by subsection while editing. Tap a row to change caption, category, or subsection.
                        </Text>
                      </>
                    ) : (
                      <>
                        <DraggableFlatList
                          activationDistance={8}
                          containerStyle={styles.reorderDraggableList}
                          data={allImages}
                          keyExtractor={(item) => String(item.id)}
                          nestedScrollEnabled
                          onDragEnd={({ data: reorderedImages, from, to }) => {
                            if (from !== to) {
                              void handleReorderDrop(
                                category,
                                reorderedImages.map((item) => item.id),
                              );
                            }
                          }}
                          renderItem={({ item, getIndex, drag, isActive }) => (
                            <View style={isActive ? styles.draggingRow : undefined}>
                              <DraggableImageRow
                                allowDrag
                                canSelectProfile={category === 'ship image'}
                                disabled={saving}
                                image={item}
                                index={getIndex() ?? 0}
                                showReorderHint
                                onDrag={drag}
                                onEdit={() => openImageEditor(item)}
                                onSelectProfile={() => {
                                  void handleSelectProfileImage(item.id);
                                }}
                              />
                            </View>
                          )}
                          scrollEnabled={false}
                        />
                        <Text style={styles.dragHint}>
                          Hold the drag handle, then move the row up or down. Tap the row to edit caption, category, or subsection.
                        </Text>
                      </>
                    )}
                  </View>
                ) : (
                  <>
                    {sections.map((section) => (
                      <View key={section.key} style={styles.sectionGroup}>
                        <Text style={styles.sectionGroupTitle}>{section.title}</Text>
                        <View style={styles.imageGrid}>
                          {section.images.map((image) => (
                            <View key={image.id} style={styles.imageTile}>
                              <Image source={{ uri: image.image_url || undefined }} style={styles.image} />
                              <Text style={styles.imageCaption}>{image.caption || image.category_attribute || data.ship_name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                    {images.length > 0 ? (
                      <View style={styles.sectionGroup}>
                        {sections.length > 0 ? <Text style={styles.sectionGroupTitle}>Uncategorized</Text> : null}
                        <View style={styles.imageGrid}>
                          {images.map((image) => (
                            <View key={image.id} style={styles.imageTile}>
                              <Image source={{ uri: image.image_url || undefined }} style={styles.image} />
                              <Text style={styles.imageCaption}>{image.caption || image.category_attribute || data.ship_name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    {allImages.length === 0 ? <Text style={styles.emptyText}>No images in this category yet.</Text> : null}
                  </>
                )}
                {editMode ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={uploadingCategory === category}
                    onPress={() => handleAddImage(category)}
                    style={[styles.addImageButton, uploadingCategory === category ? styles.buttonDisabled : null]}>
                    <Text style={styles.addImageLabel}>
                      {uploadingCategory === category ? 'Uploading...' : `Add image to ${formatImageCategoryLabel(category)}`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <Modal animationType="slide" transparent visible={!!editingImage && !!editableImage} onRequestClose={closeImageEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit image</Text>
            {editingImage?.image_url ? <Image source={{ uri: editingImage.image_url }} style={styles.modalImage} /> : null}

            <Text style={styles.fieldLabel}>Caption</Text>
            <TextInput
              multiline
              onChangeText={(caption) => setEditableImage((current) => (current ? { ...current, caption } : current))}
              placeholder="Add a caption"
              placeholderTextColor="#7A90A5"
              style={[styles.input, styles.textArea]}
              value={editableImage?.caption ?? ''}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryList}>
              {IMAGE_CATEGORY_ORDER.map((category) => {
                const selected = editableImage?.imageCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() =>
                      {
                        setIsSubsectionMenuOpen(false);
                        setIsCreatingSubsection(false);
                        setEditableImage((current) =>
                          current
                            ? {
                                ...current,
                                imageCategory: category,
                                categoryAttribute: imageCategoryAllowsSections(category) ? current.categoryAttribute : '',
                              }
                            : current,
                        );
                      }
                    }
                    style={[styles.categoryChip, selected ? styles.categoryChipActive : null]}>
                    <Text style={[styles.categoryChipLabel, selected ? styles.categoryChipLabelActive : null]}>
                      {formatImageCategoryLabel(category)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {imageCategoryAllowsSections(editableImage?.imageCategory) ? (
              <>
                <Text style={styles.fieldLabel}>Subsection</Text>
                <View style={styles.dropdownWrap}>
                  {!isCreatingSubsection ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setIsSubsectionMenuOpen((current) => !current)}
                        style={styles.dropdownButton}>
                        <Text style={styles.dropdownButtonText}>
                          {editableImage?.categoryAttribute?.trim() || 'Uncategorized'}
                        </Text>
                        <Text style={styles.dropdownChevron}>{isSubsectionMenuOpen ? '▲' : '▼'}</Text>
                      </Pressable>

                      {isSubsectionMenuOpen ? (
                        <View style={styles.dropdownMenu}>
                          <Pressable
                            onPress={() => {
                              setEditableImage((current) => (current ? { ...current, categoryAttribute: '' } : current));
                              setIsSubsectionMenuOpen(false);
                            }}
                            style={styles.dropdownOption}>
                            <Text style={styles.dropdownOptionText}>Uncategorized</Text>
                          </Pressable>
                          {subsectionOptions.map((option) => (
                            <Pressable
                              key={option}
                              onPress={() => {
                                setEditableImage((current) => (current ? { ...current, categoryAttribute: option } : current));
                                setIsSubsectionMenuOpen(false);
                              }}
                              style={styles.dropdownOption}>
                              <Text style={styles.dropdownOptionText}>{option}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setIsSubsectionMenuOpen(false);
                          setIsCreatingSubsection(true);
                          setEditableImage((current) =>
                            current && !current.categoryAttribute
                              ? { ...current, categoryAttribute: '' }
                              : current,
                          );
                        }}
                        style={styles.secondaryInlineButton}>
                        <Text style={styles.secondaryInlineButtonText}>Create new subsection</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <TextInput
                        autoFocus
                        onChangeText={(categoryAttribute) =>
                          setEditableImage((current) => (current ? { ...current, categoryAttribute } : current))
                        }
                        placeholder="Enter new subsection name"
                        placeholderTextColor="#7A90A5"
                        style={styles.input}
                        value={editableImage?.categoryAttribute ?? ''}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setIsCreatingSubsection(false);
                          setIsSubsectionMenuOpen(false);
                        }}
                        style={styles.secondaryInlineButton}>
                        <Text style={styles.secondaryInlineButtonText}>Choose existing subsection</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable disabled={saving} onPress={closeImageEditor} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={handleSaveImage}
                style={[styles.primaryButton, saving ? styles.buttonDisabled : null]}>
                <Text style={styles.primaryButtonLabel}>{saving ? 'Saving...' : 'Save changes'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={!!subsectionManager} onRequestClose={closeSubsectionManager}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {`Add ${formatImageCategoryLabel(subsectionManager?.category || '')} subsection`}
            </Text>

            <Text style={styles.fieldLabel}>Subsection name</Text>
            <TextInput
              autoFocus
              onChangeText={(subsectionName) =>
                setSubsectionManager((current) => (current ? { ...current, subsectionName } : current))
              }
              placeholder="Enter subsection name"
              placeholderTextColor="#7A90A5"
              style={styles.input}
              value={subsectionManager?.subsectionName ?? ''}
            />

            {subsectionManagerOptions.length > 0 ? (
              <View style={styles.dropdownWrap}>
                <Text style={styles.fieldLabel}>Existing subsections</Text>
                <View style={styles.sectionSummaryWrap}>
                  {subsectionManagerOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() =>
                        setSubsectionManager((current) => (current ? { ...current, subsectionName: option } : current))
                      }
                      style={styles.sectionSummaryChip}>
                      <Text style={styles.sectionSummaryChipText}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Select images</Text>
            <ScrollView contentContainerStyle={styles.managerImageGrid}>
              {(groupedImages.find((group) => group.category === subsectionManager?.category)?.allImages ?? []).map((image) => {
                const selected = subsectionManager?.selectedImageIds.includes(image.id) ?? false;

                return (
                  <Pressable
                    key={image.id}
                    onPress={() => toggleSubsectionManagerImage(image.id)}
                    style={[styles.managerImageTile, selected ? styles.managerImageTileSelected : null]}>
                    <Image source={{ uri: image.image_url || undefined }} style={styles.managerImageThumb} />
                    <Text style={styles.managerImageCaption}>{image.caption || image.category_attribute || data?.ship_name || 'Image'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable disabled={saving} onPress={closeSubsectionManager} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={handleSaveSubsectionManager}
                style={[styles.primaryButton, saving ? styles.buttonDisabled : null]}>
                <Text style={styles.primaryButtonLabel}>{saving ? 'Saving...' : 'Save subsection'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' },
  container: { backgroundColor: '#F4F8FB', padding: 16, gap: 12, paddingBottom: 28 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E2EC', borderRadius: 16, padding: 14, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleCopy: { flex: 1, gap: 4 },
  title: { color: '#173F5F', fontSize: 22, fontWeight: '700' },
  sectionTitle: { color: '#173F5F', fontSize: 16, fontWeight: '700' },
  meta: { color: '#4E6A81' },
  body: { color: '#355A74', lineHeight: 20 },
  summaryGrid: { gap: 8 },
  summaryItem: { paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E3EAF1' },
  summaryLabel: { color: '#6A8297', fontSize: 12, fontWeight: '700' },
  summaryValue: { color: '#173F5F', marginTop: 2 },
  associatedUserCard: {
    borderTopWidth: 1,
    borderTopColor: '#E3EAF1',
    paddingTop: 12,
    gap: 4,
  },
  associatedUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  associatedUserCopy: {
    flex: 1,
    gap: 2,
  },
  associatedUserName: {
    color: '#173F5F',
    fontSize: 15,
    fontWeight: '700',
  },
  associatedUserType: {
    color: '#4E6A81',
    fontSize: 13,
  },
  associatedUserStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  associatedUserStatusBadgeCurrent: {
    backgroundColor: '#E3F3E7',
  },
  associatedUserStatusBadgeOverdue: {
    backgroundColor: '#F7E3EB',
  },
  associatedUserStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  associatedUserStatusTextCurrent: {
    color: '#2F7A46',
  },
  associatedUserStatusTextOverdue: {
    color: '#A03C62',
  },
  associatedUserMeta: {
    color: '#4E6A81',
    fontSize: 13,
  },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageTile: { width: '47%', gap: 6 },
  image: { width: '100%', height: 120, borderRadius: 10, backgroundColor: '#E2E9F0' },
  imageCaption: { color: '#355A74', fontSize: 12 },
  sectionGroup: { gap: 8 },
  sectionGroupTitle: { color: '#4E6A81', fontSize: 13, fontWeight: '700' },
  sectionSummaryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sectionSummaryChip: {
    backgroundColor: '#EDF4FA',
    borderWidth: 1,
    borderColor: '#C9D8E5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionSummaryChipText: { color: '#355A74', fontSize: 12, fontWeight: '700' },
  managerImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  managerImageTile: {
    width: '47%',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 12,
    backgroundColor: '#F9FBFD',
    padding: 8,
  },
  managerImageTileSelected: {
    borderColor: '#0E4A72',
    backgroundColor: '#EAF4FB',
  },
  managerImageThumb: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#E2E9F0',
  },
  managerImageCaption: {
    color: '#355A74',
    fontSize: 12,
  },
  emptyText: { color: '#5A7388', fontSize: 13 },
  errorText: { color: '#B00020' },
  editButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2F7A46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  editButtonActive: {
    backgroundColor: '#2F7A46',
  },
  editButtonLabel: {
    color: '#2F7A46',
    fontWeight: '700',
  },
  editButtonLabelActive: {
    color: '#FFF',
  },
  addImageButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#0E4A72',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addImageLabel: {
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryActionButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BCD1E3',
    backgroundColor: '#EDF4FA',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryActionButtonText: {
    color: '#0E4A72',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: '#355A74',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C9D8E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#173F5F',
    backgroundColor: '#F9FBFD',
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F8',
    color: '#5A7388',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  fieldHint: {
    color: '#5A7388',
    fontSize: 12,
    lineHeight: 18,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checkboxRow: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkbox: {
    borderRadius: 4,
  },
  checkboxLabel: {
    color: '#173F5F',
    fontWeight: '600',
  },
  reorderList: {
    gap: 10,
  },
  reorderDraggableList: {
    gap: 10,
  },
  reorderRow: {
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#F9FBFD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileRadio: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  profileRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#8BA2B7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  profileRadioOuterActive: {
    borderColor: '#0E4A72',
  },
  profileRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0E4A72',
  },
  profileRadioLabel: {
    color: '#4E6A81',
    fontSize: 11,
    fontWeight: '700',
  },
  reorderPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reorderThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E2E9F0',
  },
  reorderCopy: {
    flex: 1,
    gap: 4,
  },
  reorderMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reorderMetaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDF4FA',
    borderWidth: 1,
    borderColor: '#C9D8E5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reorderMetaBadgeText: {
    color: '#355A74',
    fontSize: 11,
    fontWeight: '700',
  },
  reorderTitle: {
    color: '#173F5F',
    fontWeight: '700',
  },
  reorderEditBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E3F3E7',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reorderEditBadgeText: {
    color: '#2F7A46',
    fontSize: 12,
    fontWeight: '700',
  },
  dragHandle: {
    borderRadius: 10,
    backgroundColor: '#E8F0F7',
    paddingHorizontal: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: 84,
  },
  dragHandleText: {
    color: '#0E4A72',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  dragHandleSubtext: {
    color: '#5A7388',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  draggingRow: {
    opacity: 0.92,
  },
  dragHint: {
    color: '#5A7388',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 35, 52, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    maxHeight: '92%',
  },
  modalTitle: {
    color: '#173F5F',
    fontSize: 20,
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#E2E9F0',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownWrap: {
    gap: 6,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#C9D8E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FBFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownButtonText: {
    color: '#173F5F',
    flex: 1,
  },
  dropdownChevron: {
    color: '#5A7388',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#C9D8E5',
    borderRadius: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3EAF1',
  },
  dropdownOptionText: {
    color: '#173F5F',
  },
  secondaryInlineButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BCD1E3',
    backgroundColor: '#EDF4FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryInlineButtonText: {
    color: '#0E4A72',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C9D8E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  categoryChipActive: {
    backgroundColor: '#0E4A72',
    borderColor: '#0E4A72',
  },
  categoryChipLabel: {
    color: '#355A74',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipLabelActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9D8E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  secondaryButtonLabel: {
    color: '#355A74',
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#0E4A72',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#FFF',
    fontWeight: '700',
  },
});
