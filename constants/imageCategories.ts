export const IMAGE_CATEGORY_ORDER = [
  'ship image',
  'internal image',
  'restoration',
  'event',
  'crew',
  'historical document',
  'media & journals',
  'miscellaneous',
] as const;

export type ImageCategorySlug = (typeof IMAGE_CATEGORY_ORDER)[number];

export const IMAGE_CATEGORIES_WITH_SECTIONS: ReadonlySet<string> = new Set(['restoration', 'event']);

export function imageCategoryAllowsSections(category: string | null | undefined) {
  return IMAGE_CATEGORIES_WITH_SECTIONS.has((category ?? '').trim().toLowerCase());
}

export function formatImageCategoryLabel(category: string) {
  return category
    .split(' ')
    .map((part) => (part === '&' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}
