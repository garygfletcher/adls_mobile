const ADLS_SITE_ORIGIN = 'https://adls.demodomain.co.uk';
const ADLS_API_BASE_URL = `${ADLS_SITE_ORIGIN}/api`;

type ApiListResponse<T> = {
  data: T[];
};

type ApiShipListData = {
  letters: string[];
  rows: ApiShipListItem[];
  grouped: Record<string, ApiShipListItem[]>;
};

type ApiShipListResponse = {
  search?: string;
  data: ApiShipListData;
};

async function fetchApiJson<T>(path: string): Promise<T> {
  const response = await fetch(`${ADLS_API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return (await response.json()) as T;
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
    if (payload.errors) {
      const firstKey = Object.keys(payload.errors)[0];
      const firstError = firstKey ? payload.errors[firstKey]?.[0] : null;
      if (firstError) return firstError;
    }
    return payload.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function toAbsoluteSiteUrl(urlOrPath: string | null | undefined) {
  if (typeof urlOrPath !== 'string') return null;
  const normalized = urlOrPath.trim();
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${ADLS_SITE_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

export function toAbsoluteAssetUrl(assetPath: string | null | undefined) {
  return toAbsoluteSiteUrl(assetPath);
}

export type ApiMerchandiseItem = {
  id: number;
  name: string;
  description: string | null;
  image_path: string | null;
  category: string;
  price: string | number | null;
  access_level: string;
  is_bespoke: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  sort_order: number;
};

export async function fetchMerchandise() {
  const payload = await fetchApiJson<ApiListResponse<ApiMerchandiseItem>>('/merchandise');
  return payload.data.slice().sort((a, b) => a.sort_order - b.sort_order);
}

export type ApiEventItem = {
  id: number;
  title: string;
  image_path: string | null;
  detail: string | null;
  display_date: string | null;
  from_date?: string | null;
  to_date?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  link: string | null;
  sort_order: number;
};

export async function fetchEvents() {
  const payload = await fetchApiJson<ApiListResponse<ApiEventItem>>('/events');
  return payload.data.slice().sort((a, b) => a.sort_order - b.sort_order);
}

export type ApiNewsItem = {
  id: number | string;
  title: string;
  summary: string | null;
  body: string | null;
  editorial: string | null;
  full_story: string | null;
  full_news_story: string | null;
  detail: string | null;
  date: string | null;
  image_path: string | null;
  display_date: string | null;
  published_at: string | null;
  members_only: boolean | string | number | null;
  link: string | null;
  sort_order: number | null;
};

export async function fetchNews() {
  const payload = await fetchApiJson<
    ApiListResponse<ApiNewsItem> | { data: { data: ApiNewsItem[] } } | ApiNewsItem[]
  >('/news');
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray((payload as { data?: { data?: ApiNewsItem[] } })?.data?.data)
        ? (payload as { data: { data: ApiNewsItem[] } }).data.data
        : [];

  return rows
    .map((item) => ({
      ...item,
      image_path: toAbsoluteAssetUrl(item.image_path),
    }))
    .slice()
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
}

export type ApiRecommendedBook = {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  publication_date: string | null;
  isbn: string | null;
  meta_lines: string[];
  note: string | null;
  image_path: string | null;
  sort_order: number;
};

export async function fetchRecommendedBooks() {
  const payload = await fetchApiJson<ApiListResponse<ApiRecommendedBook>>('/recommended-books');
  return payload.data.slice().sort((a, b) => a.sort_order - b.sort_order);
}

export type ApiOfficial = {
  id: number;
  name: string | null;
  role: string | null;
  ship: string | null;
  email: string | null;
  email_2: string | null;
  image_path: string | null;
  sort_order: number;
};

export type ApiTextLineItem = {
  id: number;
  text_line: string;
  sort_order: number;
};

export type ApiCommitteeData = {
  flag_officers: ApiOfficial[];
  committee: ApiOfficial[];
  vacant_roles: ApiTextLineItem[];
  past_commodores: ApiTextLineItem[];
  honorary_members: ApiTextLineItem[];
};

export async function fetchCommittee() {
  const payload = await fetchApiJson<{ data: ApiCommitteeData }>('/committee');
  return {
    ...payload.data,
    flag_officers: payload.data.flag_officers.slice().sort((a, b) => a.sort_order - b.sort_order),
    committee: payload.data.committee.slice().sort((a, b) => a.sort_order - b.sort_order),
    vacant_roles: payload.data.vacant_roles.slice().sort((a, b) => a.sort_order - b.sort_order),
    past_commodores: payload.data.past_commodores.slice().sort((a, b) => a.sort_order - b.sort_order),
    honorary_members: payload.data.honorary_members.slice().sort((a, b) => a.sort_order - b.sort_order),
  };
}

export type ApiShipListItem = {
  adls_id: number;
  ship_name: string;
  display_name: string;
  ship_type: string | null;
  operations_used: string | null;
  return_status: string | null;
  first_image: string | null;
  is_adls_member: boolean;
  letter: string;
  has_narrative: boolean;
  slug: string | null;
};

export type ApiShipListResult = {
  search?: string;
  letters: string[];
  rows: ApiShipListItem[];
  grouped: Record<string, ApiShipListItem[]>;
};

function normalizeShipListResponse(response: ApiShipListResponse): ApiShipListResult {
  return {
    search: response.search,
    letters: response.data.letters,
    rows: response.data.rows,
    grouped: response.data.grouped,
  };
}

export async function fetchKnownShips(query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const payload = await fetchApiJson<ApiShipListResponse>(`/known-ships${suffix}`);
  return normalizeShipListResponse(payload);
}

export async function fetchAdlsMembers(query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const payload = await fetchApiJson<ApiShipListResponse & { total_current_member_boats: number }>(
    `/adls-members${suffix}`,
  );
  return {
    total_current_member_boats: payload.total_current_member_boats,
    ...normalizeShipListResponse(payload),
  };
}

export async function fetchLostShips(query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const payload = await fetchApiJson<ApiShipListResponse & { total_lost: number; total_sunk: number }>(
    `/lost-ships${suffix}`,
  );
  return {
    total_lost: payload.total_lost,
    total_sunk: payload.total_sunk,
    ...normalizeShipListResponse(payload),
  };
}

export type ApiGalleryImageItem = {
  ship_name: string;
  image_url: string;
  web_link: string | null;
  slug: string | null;
};

type ApiGalleryImageRow = {
  image_path: string | null;
  ship_name: string | null;
  web_link: string | null;
};

function slugFromShipLink(webLink: string | null | undefined) {
  if (!webLink) return null;
  const absoluteLink = toAbsoluteSiteUrl(webLink);
  if (!absoluteLink) return null;

  try {
    const parsed = new URL(absoluteLink);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const section = segments[0]?.toLowerCase();
    const slug = segments[1];
    if (!slug) return null;
    if (section !== 'little_ship' && section !== 'little-ship') return null;
    return slug;
  } catch {
    return null;
  }
}

export async function fetchGalleryImages() {
  const payload = await fetchApiJson<{ data: ApiGalleryImageRow[] } | ApiGalleryImageRow[]>('/gallery_images');
  const rows = Array.isArray(payload) ? payload : payload.data ?? [];

  return rows
    .map((row) => {
      const imageUrl = toAbsoluteAssetUrl(row.image_path);
      const shipName = (row.ship_name ?? '').trim();
      return {
        ship_name: shipName,
        image_url: imageUrl,
        web_link: toAbsoluteSiteUrl(row.web_link),
        slug: slugFromShipLink(row.web_link),
      };
    })
    .filter(
      (item): item is ApiGalleryImageItem =>
        Boolean(item.image_url && item.ship_name),
    );
}

export function getLittleShipPageUrl(slug: string | null | undefined) {
  if (!slug) return null;
  return `${ADLS_SITE_ORIGIN}/little-ship/${slug}`;
}


type ApiLittleShipImage =
  | string
  | {
      image_path?: string | null;
    };

export type ApiLittleShipData = {
  slug: string;
  ship: Record<string, unknown>;
  images: string[];
  fields: Record<string, unknown>;
  crew_profile?: ApiLittleShipCrewProfile | null;
  image_details?: ApiLittleShipImageDetail[];
  images_grouped?: Record<string, ApiLittleShipImageDetail[]>;
  present_in_red_list?: boolean | null;
  present_in_orde_report?: boolean | null;
  present_in_small_craft_service_list?: boolean | null;
};

export type ApiLittleShipCrewProfile = {
  name: string | null;
  first_name: string | null;
  image_path: string | null;
};

export type ApiLittleShipImageDetail = {
  id?: number;
  image_path: string | null;
  image_category: string | null;
  category_attribute?: string | null;
  category_attributes?: Record<string, unknown> | null;
  caption: string | null;
  ship_profile_image?: boolean;
  position?: number;
};

export type ApiLittleShipImageSubcategory = {
  name: string;
  count: number;
  images: ApiLittleShipImageDetail[];
};

export type ApiLittleShipImageCategory = {
  slug: string;
  label: string;
  count: number;
  images: ApiLittleShipImageDetail[];
  subcategories: ApiLittleShipImageSubcategory[];
};

export type ApiLittleShipImageCategoriesResponse = {
  slug: string;
  ship_name: string;
  categories: ApiLittleShipImageCategory[];
};

export async function fetchLittleShip(ship: string) {
  const payload = await fetchApiJson<{ data: ApiLittleShipData }>(`/little-ship/${encodeURIComponent(ship)}`);
  const rawImages = (payload.data.images ?? []) as ApiLittleShipImage[];
  const invalidImages = rawImages.filter((image) => typeof image !== 'string');

  if (invalidImages.length > 0) {
    console.warn('Little ship API returned non-string image entries', {
      ship,
      invalidImages,
      response: payload.data,
    });
  }

  return {
    data: {
      ...payload.data,
      images: rawImages
        .map((image) => (typeof image === 'string' ? image : image?.image_path ?? null))
        .map((imageUrl) => toAbsoluteAssetUrl(imageUrl))
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
      crew_profile: payload.data.crew_profile
        ? {
            ...payload.data.crew_profile,
            image_path: toAbsoluteAssetUrl(payload.data.crew_profile.image_path),
          }
        : null,
      image_details: (payload.data.image_details ?? [])
        .map((detail) => ({
          ...detail,
          image_path: toAbsoluteAssetUrl(detail.image_path),
        }))
        .filter((detail): detail is ApiLittleShipImageDetail => Boolean(detail.image_path)),
      images_grouped: Object.fromEntries(
        Object.entries(payload.data.images_grouped ?? {}).map(([category, details]) => [
          category,
          (details ?? [])
            .map((detail) => ({
              ...detail,
              image_path: toAbsoluteAssetUrl(detail.image_path),
            }))
            .filter((detail): detail is ApiLittleShipImageDetail => Boolean(detail.image_path)),
        ]),
      ),
    },
  };
}

export async function fetchLittleShipImageCategories(ship: string) {
  const payload = await fetchApiJson<{ data: ApiLittleShipImageCategoriesResponse }>(
    `/little-ship/${encodeURIComponent(ship)}/image-categories`,
  );

  return {
    data: {
      ...payload.data,
      categories: (payload.data.categories ?? []).map((category) => ({
        ...category,
        images: (category.images ?? [])
          .map((detail) => ({
            ...detail,
            image_path: toAbsoluteAssetUrl(detail.image_path),
          }))
          .filter((detail): detail is ApiLittleShipImageDetail => Boolean(detail.image_path)),
        subcategories: (category.subcategories ?? []).map((subcategory) => ({
          ...subcategory,
          images: (subcategory.images ?? [])
            .map((detail) => ({
              ...detail,
              image_path: toAbsoluteAssetUrl(detail.image_path),
            }))
            .filter((detail): detail is ApiLittleShipImageDetail => Boolean(detail.image_path)),
        })),
      })),
    },
  };
}

export type ShopCheckoutRequest = {
  postage: 'small' | 'large' | 'included';
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  delivery_address: string;
  delivery_postcode: string;
  agreement: boolean;
  items: Array<{
    merchandise_id: number;
    quantity: number;
    size?: string;
    color?: string;
  }>;
};

export type ShopCheckoutCartItem = {
  merchandise_id: number;
  quantity: number;
  size?: string;
  color?: string;
};

export type ShopCheckoutResponse = {
  message: string;
  data: {
    id: number;
    reference: string;
    status: string;
    guest_token: string | null;
    items_total: number;
    postage_amount: number;
    order_total: number;
    postage_name: string;
    created_at: string | null;
  };
};

export async function submitShopCheckout(params: {
  payload: ShopCheckoutRequest;
  bearerToken?: string | null;
}) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (params.bearerToken) {
    headers.Authorization = `Bearer ${params.bearerToken}`;
  }

  const response = await fetch(`${ADLS_API_BASE_URL}/shop/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params.payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as ShopCheckoutResponse;
}

function extractCsrfToken(html: string) {
  const metaMatch = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
  if (metaMatch?.[1]) return metaMatch[1];
  const inputMatch = html.match(/name="_token"\s+value="([^"]+)"/i);
  return inputMatch?.[1] ?? null;
}

function formBody(payload: Record<string, string | number | boolean>) {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, String(value));
  });
  return body.toString();
}

function parseSetCookieHeader(raw: string) {
  // Handles comma-separated cookie headers while ignoring commas in Expires attributes.
  return raw.split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/g).map((part) => part.trim());
}

function getSetCookies(response: Response) {
  const headersWithGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithGetSetCookie.getSetCookie === 'function') {
    return headersWithGetSetCookie.getSetCookie();
  }

  const single = response.headers.get('set-cookie');
  if (!single) return [] as string[];
  return parseSetCookieHeader(single);
}

function updateCookieJar(cookieJar: Map<string, string>, response: Response) {
  const setCookies = getSetCookies(response);
  for (const setCookie of setCookies) {
    const firstPart = setCookie.split(';')[0];
    const divider = firstPart.indexOf('=');
    if (divider <= 0) continue;
    const key = firstPart.slice(0, divider).trim();
    const value = firstPart.slice(divider + 1).trim();
    if (!key) continue;
    cookieJar.set(key, value);
  }
}

function cookieHeaderValue(cookieJar: Map<string, string>) {
  if (cookieJar.size === 0) return null;
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

async function fetchWithCookieJar(
  cookieJar: Map<string, string>,
  input: string,
  init: RequestInit,
) {
  void cookieJar;
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  });

  return response;
}

function extractOrderUrlFromHtml(html: string) {
  const metaMatch = html.match(/<meta[^>]+http-equiv="refresh"[^>]+url='([^']+)'/i);
  if (metaMatch?.[1]) return metaMatch[1];

  const anchorMatch = html.match(/Redirecting to <a href="([^"]+)"/i);
  if (anchorMatch?.[1]) return anchorMatch[1];

  return null;
}

function extractOrderIdFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const referenceMatch = url.match(/\/shop\/orders\/(\d+)/i);
  if (!referenceMatch?.[1]) return null;
  const tokenMatch = url.match(/[?&]token=([^&]+)/i);
  return {
    orderId: Number(referenceMatch[1]),
    token: tokenMatch?.[1] ? decodeURIComponent(tokenMatch[1]) : null,
    orderUrl: url,
  };
}

export async function submitShopCheckoutViaWeb(params: {
  payload: Omit<ShopCheckoutRequest, 'items'>;
  items: ShopCheckoutCartItem[];
}) {
  const cookieJar = new Map<string, string>();

  const shopPageResponse = await fetchWithCookieJar(cookieJar, `${ADLS_SITE_ORIGIN}/shop`, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });
  const shopHtml = await shopPageResponse.text();
  const csrfToken = extractCsrfToken(shopHtml);
  if (!csrfToken) {
    throw new Error('Unable to initialize checkout session.');
  }

  for (const item of params.items) {
    const repeats = Math.max(1, Math.floor(item.quantity));
    for (let index = 0; index < repeats; index += 1) {
      const addBody: Record<string, string | number | boolean> = {
        _token: csrfToken,
        product_id: item.merchandise_id,
      };
      if (item.size) addBody.size = item.size;
      if (item.color) addBody.color = item.color;

      const addResponse = await fetchWithCookieJar(cookieJar, `${ADLS_SITE_ORIGIN}/shop/basket/add`, {
        method: 'POST',
        headers: {
          Accept: 'text/html,application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formBody(addBody),
      });

      if (!addResponse.ok && addResponse.status !== 302) {
        if (addResponse.status === 403) {
          throw new Error('One or more basket items require a member login.');
        }
        if (addResponse.status === 419) {
          throw new Error('Checkout session expired. Please try again.');
        }
        throw new Error(`Unable to add basket items for checkout (status ${addResponse.status}).`);
      }
    }
  }

  const checkoutResponse = await fetchWithCookieJar(cookieJar, `${ADLS_SITE_ORIGIN}/shop/checkout`, {
    method: 'POST',
    headers: {
      Accept: 'text/html,application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-TOKEN': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formBody({
      _token: csrfToken,
      postage: params.payload.postage,
      contact_name: params.payload.contact_name,
      contact_phone: params.payload.contact_phone,
      contact_email: params.payload.contact_email,
      delivery_address: params.payload.delivery_address,
      delivery_postcode: params.payload.delivery_postcode,
      agreement: params.payload.agreement ? 1 : 0,
    }),
  });

  const checkoutBody = await checkoutResponse.text();
  const locationHeader = checkoutResponse.headers.get('location');
  const redirectHtmlUrl = extractOrderUrlFromHtml(checkoutBody);
  const checkoutDestination = locationHeader ?? checkoutResponse.url ?? redirectHtmlUrl ?? '';
  const resolvedOrder =
    extractOrderIdFromUrl(locationHeader) ??
    extractOrderIdFromUrl(checkoutResponse.url) ??
    extractOrderIdFromUrl(redirectHtmlUrl);

  if (!resolvedOrder) {
    if (checkoutResponse.status === 419) {
      throw new Error('Checkout session expired. Please try again.');
    }
    if (/\/shop\/?$/.test(checkoutDestination)) {
      throw new Error('Checkout was not accepted. Please verify phone, email, postcode, and agreement details.');
    }
    throw new Error(`Unable to submit checkout (status ${checkoutResponse.status}).`);
  }

  return {
    reference: `ORDER-${resolvedOrder.orderId}`,
    orderUrl: resolvedOrder.orderUrl,
    orderId: resolvedOrder.orderId,
    token: resolvedOrder.token,
  };
}
