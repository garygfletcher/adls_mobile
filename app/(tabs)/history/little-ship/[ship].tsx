import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { formatImageCategoryLabel, IMAGE_CATEGORY_ORDER } from '@/constants/imageCategories';
import {
  ApiLittleShipImageCategory,
  ApiLittleShipData,
  ApiLittleShipImageDetail,
  fetchLittleShipImageCategories,
  fetchKnownShips,
  fetchLittleShip,
} from '@/services/publicApi';

type NavAction =
  | { label: string; route: string; icon?: keyof typeof Ionicons.glyphMap }
  | { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }
  | { label: string; disabled: true; icon?: keyof typeof Ionicons.glyphMap };

type PreviewImageState = {
  url: string;
  caption: string | null;
};

type CategoryGallerySection = {
  key: string;
  label: string;
  images: ApiLittleShipImageDetail[];
  emptyMessage?: string | null;
};

function buildLegacyCategoryTree(imageDetails: ApiLittleShipImageDetail[]): ApiLittleShipImageCategory[] {
  const imagesByCategory = new Map<string, ApiLittleShipImageDetail[]>();

  imageDetails.forEach((detail) => {
    const category = (detail.image_category || 'ship image').trim().toLowerCase();
    imagesByCategory.set(category, [...(imagesByCategory.get(category) ?? []), detail]);
  });

  return IMAGE_CATEGORY_ORDER.map((slug) => {
    const categoryImages = imagesByCategory.get(slug) ?? [];

    if (slug !== 'restoration' && slug !== 'event') {
      return {
        slug,
        label: formatImageCategoryLabel(slug),
        count: categoryImages.length,
        images: categoryImages,
        subcategories: [],
      };
    }

    const uncategorized: ApiLittleShipImageDetail[] = [];
    const subcategories = new Map<string, ApiLittleShipImageDetail[]>();

    categoryImages.forEach((detail) => {
      const section = readCategoryAttribute(detail);
      if (!section) {
        uncategorized.push(detail);
        return;
      }

      subcategories.set(section, [...(subcategories.get(section) ?? []), detail]);
    });

    return {
      slug,
      label: formatImageCategoryLabel(slug),
      count: categoryImages.length,
      images: uncategorized,
      subcategories: Array.from(subcategories.entries()).map(([name, images]) => ({
        name,
        count: images.length,
        images,
      })),
    };
  });
}

function mergeCategoryTrees(
  primary: ApiLittleShipImageCategory[],
  fallback: ApiLittleShipImageCategory[],
): ApiLittleShipImageCategory[] {
  const primaryBySlug = new Map(primary.map((category) => [category.slug.toLowerCase(), category] as const));
  const fallbackBySlug = new Map(fallback.map((category) => [category.slug.toLowerCase(), category] as const));

  return IMAGE_CATEGORY_ORDER.map((slug) => {
    const preferred = primaryBySlug.get(slug);
    const legacy = fallbackBySlug.get(slug);

    if (!preferred && legacy) return legacy;
    if (!preferred) {
      return {
        slug,
        label: formatImageCategoryLabel(slug),
        count: 0,
        images: [],
        subcategories: [],
      };
    }
    if (!legacy) return preferred;

    return {
      ...preferred,
      count: preferred.count || legacy.count,
      images: preferred.images.length > 0 ? preferred.images : legacy.images,
      subcategories: preferred.subcategories.length > 0 ? preferred.subcategories : legacy.subcategories,
    };
  });
}

function readField(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function readFieldCandidates(fields: Record<string, unknown>, candidates: string[]) {
  for (const key of candidates) {
    const exact = readField(fields, key);
    if (exact) return exact;
  }

  const normalized = new Map<string, string>();
  Object.keys(fields).forEach((key) => normalized.set(key.trim().toLowerCase(), key));

  for (const candidate of candidates) {
    const match = normalized.get(candidate.trim().toLowerCase());
    if (!match) continue;
    const value = readField(fields, match);
    if (value) return value;
  }

  return null;
}

function readShipCandidates(ship: Record<string, unknown> | null | undefined, candidates: string[]) {
  if (!ship) return null;

  for (const key of candidates) {
    const value = ship[key];
    if (value === null || value === undefined) continue;
    const str = String(value).trim();
    if (str.length > 0) return str;
  }

  return null;
}

function formatPresenceValue(value: string | boolean | null | undefined) {
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (!value) return '-';
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'present', 'included', 'in list', '✓'].includes(normalized)) {
    return '✓';
  }
  if (['false', 'no', 'n', '0', 'absent', 'not present', '✗', 'x'].includes(normalized)) {
    return '✗';
  }
  return value;
}

function isAffirmative(value: string | null) {
  if (!value) return false;
  return ['true', 'yes', 'y', '1', 'present', 'included', 'in list', '✓'].includes(value.trim().toLowerCase());
}

function readNumberList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const num = Number(entry);
        return Number.isFinite(num) ? String(num) : null;
      })
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [] as string[];
}

function readCategoryAttribute(detail: ApiLittleShipImageDetail) {
  if (typeof detail.category_attribute === 'string' && detail.category_attribute.trim().length > 0) {
    return detail.category_attribute.trim();
  }
  const raw = detail.category_attributes;
  if (!raw || typeof raw !== 'object') return null;
  const attribute = raw.attribute;
  return typeof attribute === 'string' && attribute.trim().length > 0 ? attribute.trim() : null;
}

function buildImageCaption(detail: ApiLittleShipImageDetail, fallback: string) {
  return detail.caption?.trim() || readCategoryAttribute(detail) || fallback;
}

function splitTextList(value: string | null) {
  if (!value) return [] as string[];
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function renderNavAction(item: NavAction, key: string, router: ReturnType<typeof useRouter>) {
  const iconColor = '#0E2E4A';

  if ('disabled' in item) {
    return (
      <View key={key} style={[styles.navChip, styles.navChipDisabled]}>
        {item.icon ? <Ionicons name={item.icon} size={13} color="#8AA0B4" /> : null}
        <Text style={styles.navChipDisabledText}>{item.label}</Text>
      </View>
    );
  }

  const onPress = 'route' in item ? () => router.push(item.route as never) : item.onPress;

  return (
    <Pressable key={key} style={styles.navChip} onPress={onPress}>
      {item.icon ? <Ionicons name={item.icon} size={13} color={iconColor} /> : null}
      <Text style={styles.navChipText}>{item.label}</Text>
    </Pressable>
  );
}

export default function LittleShipDetailScreen() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const params = useLocalSearchParams<{ ship?: string | string[] }>();
  const slugParam = params.ship;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const [data, setData] = useState<ApiLittleShipData | null>(null);
  const [imageCategories, setImageCategories] = useState<ApiLittleShipImageCategory[]>([]);
  const [orderedShipSlugs, setOrderedShipSlugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImageState | null>(null);
  const isTouchingHeroGalleryRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchKnownShips();
        if (!mounted) return;
        const sorted = response.rows
          .filter(
            (row) => typeof row.slug === 'string' && row.slug.trim().length > 0 && row.has_narrative === true,
          )
          .sort((a, b) =>
            (a.display_name || a.ship_name).localeCompare(b.display_name || b.ship_name, undefined, {
              sensitivity: 'base',
            }),
          )
          .map((row) => String(row.slug));
        setOrderedShipSlugs([...new Set(sorted)]);
      } catch {
        if (!mounted) return;
        setOrderedShipSlugs([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!slug) {
      setError('Missing ship slug.');
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);
    setImageCategories([]);

    (async () => {
      try {
        const shipResponse = await fetchLittleShip(slug);
        const categoriesResponse = await fetchLittleShipImageCategories(slug).catch((categoryError) => {
          console.warn('Unable to load little ship image categories', { slug, error: categoryError });
          return null;
        });
        if (!mounted) return;
        setData(shipResponse.data);
        setImageCategories(categoriesResponse?.data.categories ?? []);
      } catch (fetchError) {
        if (!mounted) return;
        console.error('Unable to load little ship details', { slug, error: fetchError });
        setError('Unable to load little ship details.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const title = useMemo(() => {
    if (!data) return 'Little Ship';
    return (
      readField(data.fields, 'Ship Name') ||
      (typeof data.ship?.ship_name === 'string' ? data.ship.ship_name : null) ||
      data.slug ||
      'Little Ship'
    );
  }, [data]);

  const operations = data ? readField(data.fields, 'Operations Used') : null;
  const shipType = data ? readField(data.fields, 'Ship Type') : null;
  const member = data ? readField(data.fields, 'ADLS Member') : null;
  const isAdlsMember = isAffirmative(member);

  const tablePairs = data
    ? [
        ['ADLS ID', readFieldCandidates(data.fields, ['ADLS ID'])],
        ['Ship Name', title],
        ['Operations Used', operations],
        ['Ship Type', shipType],
        ['Length', readFieldCandidates(data.fields, ['Length'])],
        ['Beam', readFieldCandidates(data.fields, ['Beam'])],
        ['Builder', readFieldCandidates(data.fields, ['Builder'])],
        ['Build Year', readFieldCandidates(data.fields, ['Build Year'])],
        ['Archive', readFieldCandidates(data.fields, ['Archive'])],
        ['Language', readFieldCandidates(data.fields, ['Language'])],
        ['Source', readFieldCandidates(data.fields, ['Source'])],
        ['Website', readFieldCandidates(data.fields, ['Website'])],
        ['Last Updated', readFieldCandidates(data.fields, ['Last Updated'])],
        ['ADLS Member', member ? (isAdlsMember ? 'Yes' : 'No') : null],
      ]
    : [];

  const tableRows = useMemo(() => {
    const rows: [string, string | null, string, string | null][] = [];
    for (let index = 0; index < tablePairs.length; index += 2) {
      const left = tablePairs[index];
      const right = tablePairs[index + 1];
      rows.push([
        left?.[0] ?? '',
        (left?.[1] as string | null) ?? null,
        right?.[0] ?? '',
        (right?.[1] as string | null) ?? null,
      ]);
    }
    return rows;
  }, [tablePairs]);

  const historyText = data
    ? (typeof data.ship?.ship_history === 'string' ? data.ship.ship_history : null) ||
      (typeof data.ship?.narrative === 'string' ? data.ship.narrative : null)
    : null;

  const researchDisclaimer =
    '*This information may be subject to errors or omissions in research and is provided by third-party sources. Presence in the Orde Report includes a narrative, and other evidence may contradict that narrative.\n' +
    'Inclusion in the lists above does not necessarily refer to this exact ship. Some ships had duplicate names and further research should be conducted. Records on this page may include anecdotal or third-party material.';

  const redListPresence = data
    ? formatPresenceValue(
        readFieldCandidates(data.fields, ['Present in Red List', 'Red List']) ??
          data.present_in_red_list ??
          readShipCandidates(data.ship, ['present_in_red_list', 'red_list']),
      )
    : '-';
  const ordeReportPresence = data
    ? formatPresenceValue(
        readFieldCandidates(data.fields, ['Present in Orde Report', 'Orde Report']) ??
          data.present_in_orde_report ??
          readShipCandidates(data.ship, ['present_in_orde_report', 'orde_report']),
      )
    : '-';
  const smallCraftPresence = data
    ? formatPresenceValue(
        readFieldCandidates(data.fields, [
          'Present in Small Craft Service List',
          'Small Craft Service List',
          'Small Craft List',
        ]) ??
          data.present_in_small_craft_service_list ??
          readShipCandidates(data.ship, ['present_in_small_craft_service_list', 'small_craft_service_list']),
      )
    : '-';

  const imageDetails = data?.image_details ?? [];
  const effectiveImageCategories = useMemo(
    () => mergeCategoryTrees(imageCategories, buildLegacyCategoryTree(imageDetails)),
    [imageCategories, imageDetails],
  );
  const categoryMap = useMemo(
    () => new Map(effectiveImageCategories.map((category) => [category.slug.toLowerCase(), category] as const)),
    [effectiveImageCategories],
  );
  const heroImage =
    imageDetails.find((detail) => detail.ship_profile_image && detail.image_path)?.image_path ||
    categoryMap.get('ship image')?.images.find((detail) => detail.image_path)?.image_path ||
    imageDetails.find((detail) => detail.image_category?.toLowerCase() === 'ship image' && detail.image_path)?.image_path ||
    data?.images[0] ||
    null;

  const currentShipIndex = useMemo(() => {
    if (!slug) return -1;
    return orderedShipSlugs.indexOf(slug);
  }, [orderedShipSlugs, slug]);

  const previousShipSlug = currentShipIndex > 0 ? orderedShipSlugs[currentShipIndex - 1] : null;
  const nextShipSlug =
    currentShipIndex >= 0 && currentShipIndex < orderedShipSlugs.length - 1
      ? orderedShipSlugs[currentShipIndex + 1]
      : null;

  const anniversaryReturns = readNumberList(data?.ship?.anniversary_returns_attended);

  const internalImages = categoryMap.get('internal image')?.images ?? [];
  const shipImages = categoryMap.get('ship image')?.images ?? [];
  const restorationCategory = categoryMap.get('restoration');
  const eventCategory = categoryMap.get('event');
  const historicalDocuments = categoryMap.get('historical document')?.images ?? [];
  const crewImages = categoryMap.get('crew')?.images ?? [];
  const crewEntries = useMemo(() => {
    if (!data) return [] as string[];

    const fieldValue =
      readFieldCandidates(data.fields, ['Crew', 'Crew List', 'Captain', 'Captains', 'Skipper', 'Owner', 'Owners']) ??
      readShipCandidates(data.ship, ['crew', 'crew_list', 'captain', 'captains', 'skipper', 'owner', 'owners']);

    return splitTextList(fieldValue);
  }, [data]);

  const restorationSections = useMemo<CategoryGallerySection[]>(
    () => [
      ...((restorationCategory?.subcategories ?? []).map((subcategory) => ({
        key: `restoration-${subcategory.name}`,
        label: subcategory.name,
        images: subcategory.images,
        emptyMessage: `No images in ${subcategory.name} yet.`,
      })) as CategoryGallerySection[]),
      ...((restorationCategory?.images?.length ?? 0) > 0
        ? [
            {
              key: 'restoration-uncategorized',
              label: 'Uncategorized',
              images: restorationCategory?.images ?? [],
            },
          ]
        : []),
    ],
    [restorationCategory],
  );
  const eventSections = useMemo<CategoryGallerySection[]>(
    () => [
      ...((eventCategory?.subcategories ?? []).map((subcategory) => ({
        key: `event-${subcategory.name}`,
        label: subcategory.name,
        images: subcategory.images,
        emptyMessage: `No images in ${subcategory.name} yet.`,
      })) as CategoryGallerySection[]),
      ...((eventCategory?.images?.length ?? 0) > 0
        ? [
            {
              key: 'event-uncategorized',
              label: 'Uncategorized',
              images: eventCategory?.images ?? [],
            },
          ]
        : []),
    ],
    [eventCategory],
  );
  const additionalCategoryCards = useMemo(
    () =>
      IMAGE_CATEGORY_ORDER.map((slug) => categoryMap.get(slug))
        .filter((category): category is ApiLittleShipImageCategory => {
          if (!category) return false;
          return !['ship image', 'internal image', 'restoration', 'event', 'crew', 'historical document'].includes(
            category.slug,
          );
        }),
    [categoryMap],
  );

  const navigateToAdjacentShip = useCallback(
    (direction: 'prev' | 'next') => {
      const target = direction === 'next' ? nextShipSlug : previousShipSlug;
      if (!target) return;
      setPreviewImage(null);
      router.replace(`/history/little-ship/${target}`);
    },
    [nextShipSlug, previousShipSlug, router],
  );

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isTouchingHeroGalleryRef.current &&
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_, gestureState) => {
          if (isTouchingHeroGalleryRef.current) return;
          if (gestureState.dx <= -70) {
            navigateToAdjacentShip('next');
            return;
          }
          if (gestureState.dx >= 70) {
            navigateToAdjacentShip('prev');
          }
        },
      }),
    [navigateToAdjacentShip],
  );

  const navItems: NavAction[] = [
    { label: 'HOME', route: '/(tabs)' },
    { label: 'LITTLE SHIPS', route: '/history/all-known-ships' },
    { label: 'ABOUT THE ADLS', route: '/history' },
    { label: 'DLS FOR SALE', disabled: true },
    { label: 'DUNKIRK 1940', route: '/history/about-dunkirk' },
    { label: 'EVENTS', route: '/(tabs)/events' },
    { label: 'IDENTIFYING DLS', route: '/history/identifying-dls' },
    { label: 'SHOP', route: '/(tabs)/shop' },
    { label: 'DASHBOARD', route: '/(tabs)/account' },
    isAuthenticated
      ? {
          label: 'LOG OUT',
          onPress: () => {
            void logout();
            router.push('/(tabs)/account');
          },
        }
      : { label: 'LOG OUT', route: '/(tabs)/account' },
  ];

  const openExternalLink = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (linkError) {
      console.error('Unable to open link', { url, error: linkError });
    }
  }, []);

  const sourcePageUrl = 'https://www.operationdynamo.navy';
  const crewProfileName = data?.crew_profile?.name?.trim() || data?.crew_profile?.first_name?.trim() || null;
  const crewProfileImage = data?.crew_profile?.image_path || null;

  const openPreviewImage = useCallback((url: string | null | undefined, caption?: string | null) => {
    if (!url) return;
    setPreviewImage({ url, caption: caption ?? null });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container} {...swipeResponder.panHandlers}>
      <View style={styles.page}>
        {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {data ? (
          <>
            <View style={styles.shipHeader}>
              <View style={styles.shipHeaderTop}>
                <Text style={styles.shipTitle}>{title}</Text>
                <View style={styles.shipMetaChips}>
                  {shipType ? <Text style={styles.metaChip}>{shipType}</Text> : null}
                  {operations ? <Text style={styles.metaChip}>{operations}</Text> : null}
                  {member ? (
                    <Text style={[styles.metaChip, isAdlsMember ? styles.memberChip : styles.nonMemberChip]}>
                      {isAdlsMember ? 'ADLS Member' : 'Not an ADLS Member'}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.ctaRow}>
                <Pressable style={styles.backButton} onPress={() => router.push('/history/all-known-ships')}>
                  <Ionicons name="arrow-back" size={16} color="#F7F2E8" />
                  <Text style={styles.backButtonText}>BACK TO ALL KNOWN SHIPS</Text>
                </Pressable>
                <Text style={styles.swipeHint}>
                  Swipe to browse
                  {previousShipSlug || nextShipSlug
                    ? ` (${previousShipSlug ? '← previous' : ''}${previousShipSlug && nextShipSlug ? ' • ' : ''}${
                        nextShipSlug ? 'next →' : ''
                      })`
                    : ''}
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              {tableRows.map(([labelA, valueA, labelB, valueB], index) => (
                <View key={`${labelA}-${labelB}-${index}`} style={[styles.dataRow, index === 0 ? styles.firstDataRow : null]}>
                  <View style={styles.dataCell}>
                    <Text style={styles.dataLabel}>{labelA}</Text>
                    {labelA === 'Website' && valueA ? (
                      <Pressable onPress={() => void openExternalLink(valueA)}>
                        <Text style={[styles.dataValue, styles.linkValue]}>{valueA}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.dataValue}>{valueA ?? '-'}</Text>
                    )}
                  </View>
                  <View style={styles.dataCell}>
                    <Text style={styles.dataLabel}>{labelB || '-'}</Text>
                    {labelB === 'Website' && valueB ? (
                      <Pressable onPress={() => void openExternalLink(valueB)}>
                        <Text style={[styles.dataValue, styles.linkValue]}>{valueB}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.dataValue}>{valueB ?? '-'}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.researchHeaderRow}>
                <Text style={styles.sectionTitle}>Research Lists</Text>
                <Pressable style={styles.inlineLinkChip} onPress={() => void openExternalLink(sourcePageUrl)}>
                  <Ionicons name="globe-outline" size={14} color="#0E2E4A" />
                  <Text style={styles.inlineLinkText}>Open source page</Text>
                </Pressable>
              </View>
              <View style={styles.researchTable}>
                <View style={styles.researchColumn}>
                  <Text style={styles.researchLabel}>Present in Red List</Text>
                  <Text style={[styles.researchValue, redListPresence === '✓' ? styles.positiveValue : null]}>
                    {redListPresence}
                  </Text>
                </View>
                <View style={styles.researchColumn}>
                  <Text style={styles.researchLabel}>Present in Orde Report</Text>
                  <Text style={[styles.researchValue, ordeReportPresence === '✓' ? styles.positiveValue : null]}>
                    {ordeReportPresence}
                  </Text>
                </View>
                <View style={styles.researchColumn}>
                  <Text style={styles.researchLabel}>Present in Small Craft Service List</Text>
                  <Text style={[styles.researchValue, smallCraftPresence === '✓' ? styles.positiveValue : null]}>
                    {smallCraftPresence}
                  </Text>
                </View>
              </View>
              <Text style={styles.disclaimerText}>{researchDisclaimer}</Text>
            </View>

            {anniversaryReturns.length > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Anniversary Returns Attended</Text>
                <Text style={styles.sectionSubtitle}>This little ship attended the following anniversary returns to Dunkirk</Text>
                <View style={styles.returnChipRow}>
                  {anniversaryReturns.map((year) => (
                    <View key={year} style={styles.returnChip}>
                      <Text style={styles.returnChipText}>{year}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {heroImage ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ship Gallery</Text>
                <Pressable
                  onPress={() => openPreviewImage(heroImage, title)}
                  onTouchStart={() => {
                    isTouchingHeroGalleryRef.current = true;
                  }}
                  onTouchEnd={() => {
                    isTouchingHeroGalleryRef.current = false;
                  }}
                  onTouchCancel={() => {
                    isTouchingHeroGalleryRef.current = false;
                  }}>
                  <Image source={{ uri: heroImage }} style={styles.heroImage} />
                </Pressable>

                {internalImages.length > 0 ? (
                  <View style={styles.gallerySection}>
                    <Text style={styles.galleryLabel}>INTERNAL IMAGE</Text>
                    <View style={styles.galleryGrid}>
                      {internalImages.map((detail, index) => (
                        <Pressable
                          key={`${detail.image_path}-${index}`}
                          style={styles.galleryTile}
                          onPress={() => openPreviewImage(detail.image_path, buildImageCaption(detail, title))}>
                          <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                          <Text style={styles.galleryCaption}>{buildImageCaption(detail, title)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {shipImages.length > 0 ? (
                  <View style={styles.gallerySection}>
                    <Text style={styles.galleryLabel}>SHIP IMAGE</Text>
                    <View style={styles.galleryGrid}>
                      {shipImages.map((detail, index) => (
                        <Pressable
                          key={`${detail.image_path}-${index}`}
                          style={styles.galleryTile}
                          onPress={() => openPreviewImage(detail.image_path, buildImageCaption(detail, title))}>
                          <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                          <Text style={styles.galleryCaption}>{buildImageCaption(detail, title)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {historyText ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ship History</Text>
                <Text style={styles.historyText}>{historyText}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Restoration</Text>
              {restorationSections.length > 0 ? (
                restorationSections.map((section) => (
                  <View key={section.key} style={styles.albumSection}>
                    <Text style={styles.albumYear}>{section.label}</Text>
                    {section.images.length > 0 ? (
                      <View style={styles.galleryGrid}>
                        {section.images.map((detail, index) => (
                          <Pressable
                            key={`${detail.image_path}-${index}`}
                            style={styles.galleryTile}
                            onPress={() =>
                              openPreviewImage(
                                detail.image_path,
                                buildImageCaption(detail, `${title} restoration ${section.label}`),
                              )
                            }>
                            <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                            <Text style={styles.galleryCaption}>
                              {buildImageCaption(detail, `${title} restoration ${section.label}`)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>{section.emptyMessage ?? 'No images in this section yet.'}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No restoration images have been uploaded for this vessel.</Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Event</Text>
              {eventSections.length > 0 ? (
                eventSections.map((section) => (
                  <View key={section.key} style={styles.albumSection}>
                    <Text style={styles.albumYear}>{section.label}</Text>
                    {section.images.length > 0 ? (
                      <View style={styles.galleryGrid}>
                        {section.images.map((detail, index) => (
                          <Pressable
                            key={`${detail.image_path}-${index}`}
                            style={styles.galleryTile}
                            onPress={() =>
                              openPreviewImage(detail.image_path, buildImageCaption(detail, `${title} event ${section.label}`))
                            }>
                            <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                            <Text style={styles.galleryCaption}>
                              {buildImageCaption(detail, `${title} event ${section.label}`)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>{section.emptyMessage ?? 'No images in this section yet.'}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No event images have been uploaded for this vessel.</Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Crew</Text>
              {crewProfileName || crewProfileImage || crewEntries.length > 0 || crewImages.length > 0 ? (
                <View style={styles.crewSection}>
                  {crewProfileName || crewProfileImage ? (
                    <View style={styles.crewProfileCard}>
                      {crewProfileImage ? (
                        <Pressable onPress={() => openPreviewImage(crewProfileImage, crewProfileName)}>
                          <Image source={{ uri: crewProfileImage }} style={styles.crewProfileImage} />
                        </Pressable>
                      ) : null}
                      {crewProfileName ? <Text style={styles.crewProfileName}>{crewProfileName}</Text> : null}
                    </View>
                  ) : null}

                  {crewEntries.length > 0 ? (
                    <View style={styles.crewList}>
                      {crewEntries.map((entry, index) => (
                        <View key={`${entry}-${index}`} style={styles.crewChip}>
                          <Text style={styles.crewChipText}>{entry}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {crewImages.length > 0 ? (
                    <View style={styles.galleryGrid}>
                      {crewImages.map((detail, index) => (
                        <Pressable
                          key={`${detail.image_path}-${index}`}
                          style={styles.galleryTile}
                          onPress={() => openPreviewImage(detail.image_path, buildImageCaption(detail, title))}>
                          <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                          <Text style={styles.galleryCaption}>{buildImageCaption(detail, title)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  This Little Ships Captain has not updated their crew list or decided not to make it public.
                </Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Historical Documents</Text>
              {historicalDocuments.length > 0 ? (
                <View style={styles.galleryGrid}>
                  {historicalDocuments.map((detail, index) => (
                    <Pressable
                      key={`${detail.image_path}-${index}`}
                      style={styles.galleryTile}
                      onPress={() =>
                        openPreviewImage(detail.image_path, buildImageCaption(detail, `${title} historical document`))
                      }>
                      <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                      <Text style={styles.galleryCaption}>
                        {buildImageCaption(detail, `${title} historical document`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No historical documents have been uploaded for this ship.</Text>
              )}
            </View>

            {additionalCategoryCards.map((category) => (
              <View key={category.slug} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{category.label || formatImageCategoryLabel(category.slug)}</Text>
                {category.images.length > 0 ? (
                  <View style={styles.galleryGrid}>
                    {category.images.map((detail, index) => (
                      <Pressable
                        key={`${detail.image_path}-${index}`}
                        style={styles.galleryTile}
                        onPress={() =>
                          openPreviewImage(
                            detail.image_path,
                            buildImageCaption(detail, formatImageCategoryLabel(category.slug)),
                          )
                        }>
                        <Image source={{ uri: detail.image_path || undefined }} style={styles.galleryImage} />
                        <Text style={styles.galleryCaption}>
                          {buildImageCaption(detail, formatImageCategoryLabel(category.slug))}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No images have been uploaded in this category.</Text>
                )}
              </View>
            ))}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Journal</Text>
              <Text style={styles.emptyText}>This ship has no journal entries.</Text>
            </View>

            <View style={styles.footerCard}>
              <Text style={styles.footerLegal}>
                Some information on this page may be curated by third parties or owners; if you believe any content
                gives rise to copyright or related legal concerns, please contact us in the first instance so the
                matter can be reviewed and addressed appropriately.
              </Text>

              <View style={styles.footerBrandRow}>
                <Image source={require('../../../../assets/images/adls_logo.png')} style={styles.footerLogo} />
                <View style={styles.footerBrandCopy}>
                  <Text style={styles.footerBrandTitle}>The Association of Dunkirk Little Ships</Text>
                  <Text style={styles.footerBrandSub}>©2021-2026 The Association of Dunkirk Little Ships. All rights reserved.</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}
      </View>

      <Modal
        animationType="fade"
        visible={Boolean(previewImage)}
        onRequestClose={() => setPreviewImage(null)}
        transparent>
        <View style={styles.previewOverlay}>
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewImage(null)} />
          <View style={styles.previewCard}>
            <Pressable style={styles.previewClose} onPress={() => setPreviewImage(null)}>
              <Text style={styles.previewCloseText}>X</Text>
            </Pressable>
            {previewImage ? (
              <>
                <Image source={{ uri: previewImage.url }} style={styles.previewImage} resizeMode="contain" />
                {previewImage.caption ? (
                  <View style={styles.previewCaptionCard}>
                    <Text style={styles.previewCaption}>{previewImage.caption}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    paddingBottom: 36,
  },
  page: {
    gap: 14,
  },
  navWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 12,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E8F1F8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BCD1E3',
  },
  navChipText: {
    color: '#0E2E4A',
    fontSize: 11,
    fontWeight: '800',
  },
  navChipDisabled: {
    backgroundColor: '#F1F1F1',
    borderColor: '#CFCFCF',
  },
  navChipDisabledText: {
    color: '#8AA0B4',
    fontSize: 11,
    fontWeight: '800',
  },
  shipHeader: {
    gap: 12,
  },
  shipHeaderTop: {
    gap: 10,
  },
  shipTitle: {
    color: '#0E2E4A',
    fontSize: 34,
    fontWeight: '800',
  },
  shipMetaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#E8F1F8',
    borderWidth: 1,
    borderColor: '#BCD1E3',
    color: '#0E2E4A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '700',
  },
  memberChip: {
    backgroundColor: '#E3F0E2',
    borderColor: '#B8D0B4',
    color: '#23522D',
  },
  nonMemberChip: {
    backgroundColor: '#F5E3E1',
    borderColor: '#E1B8B0',
    color: '#8E2B2B',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0E4A72',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#F7F2E8',
    fontSize: 12,
    fontWeight: '800',
  },
  swipeHint: {
    color: '#5B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: '#0E2E4A',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#4A5D72',
    fontSize: 14,
    lineHeight: 20,
  },
  dataRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E6EDF4',
  },
  firstDataRow: {
    borderTopWidth: 0,
  },
  dataCell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingRight: 10,
  },
  dataLabel: {
    color: '#345A73',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dataValue: {
    color: '#153D5D',
    fontSize: 15,
    lineHeight: 22,
  },
  linkValue: {
    color: '#145C89',
    textDecorationLine: 'underline',
  },
  researchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inlineLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BCD1E3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E8F1F8',
  },
  inlineLinkText: {
    color: '#0E2E4A',
    fontSize: 12,
    fontWeight: '700',
  },
  researchTable: {
    flexDirection: 'row',
    gap: 10,
  },
  researchColumn: {
    flex: 1,
    backgroundColor: '#F1F6FB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    minHeight: 118,
    justifyContent: 'space-between',
  },
  researchLabel: {
    color: '#4A5D72',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  researchValue: {
    color: '#0E2E4A',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  positiveValue: {
    color: '#23522D',
  },
  disclaimerText: {
    color: '#5A6773',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  returnChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  returnChip: {
    backgroundColor: '#0E2E4A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  returnChipText: {
    color: '#F8F2E8',
    fontSize: 16,
    fontWeight: '800',
  },
  heroImage: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    backgroundColor: '#E2E9F0',
  },
  gallerySection: {
    gap: 8,
  },
  galleryLabel: {
    color: '#345A73',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryTile: {
    width: '47%',
    gap: 6,
  },
  galleryImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E9F0',
  },
  galleryCaption: {
    color: '#16344E',
    fontSize: 13,
    fontWeight: '600',
  },
  historyText: {
    color: '#304B63',
    fontSize: 15,
    lineHeight: 24,
  },
  albumSection: {
    gap: 8,
  },
  albumYear: {
    color: '#0E2E4A',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#4A5D72',
    fontSize: 15,
    lineHeight: 22,
  },
  crewSection: {
    gap: 12,
  },
  crewProfileCard: {
    alignItems: 'flex-start',
    gap: 8,
  },
  crewProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E9F0',
  },
  crewProfileName: {
    color: '#153D5D',
    fontSize: 16,
    fontWeight: '700',
  },
  crewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  crewChip: {
    backgroundColor: '#E8F1F8',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BCD1E3',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  crewChipText: {
    color: '#153D5D',
    fontSize: 14,
    fontWeight: '700',
  },
  footerCard: {
    backgroundColor: '#0E2E4A',
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  footerLegal: {
    color: '#D8E3EC',
    fontSize: 13,
    lineHeight: 20,
  },
  footerBrandRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  footerLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  footerBrandCopy: {
    flex: 1,
    gap: 3,
  },
  footerBrandTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerBrandSub: {
    color: '#D8E3EC',
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: '#B00020',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCard: {
    width: '100%',
    maxWidth: 920,
  },
  previewClose: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewCloseText: {
    color: '#1E425E',
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 420,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#0A0A0A',
  },
  previewCaptionCard: {
    backgroundColor: '#102B43',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  previewCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
