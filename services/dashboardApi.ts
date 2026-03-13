import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiRequestError, ApiAuthUser } from '@/services/authApi';
import { toAbsoluteAssetUrl, toAbsoluteSiteUrl } from '@/services/publicApi';

const ADLS_SITE_ORIGIN = 'https://adls.demodomain.co.uk';
const ADLS_API_BASE_URL = `${ADLS_SITE_ORIGIN}/api`;
const DASHBOARD_CACHE_KEY = 'adls.dashboard.cache';

type ApiEnvelope<T> = {
  data: T;
};

export type ApiDashboardMenuItem = {
  key: string;
  label: string;
};

export type ApiDashboardMeeting = {
  id: number;
  meeting_type: string | null;
  meeting_type_label: string | null;
  name: string;
  start_at: string | null;
  start_at_display: string | null;
  end_at: string | null;
  invited_types: string[];
  invited_types_label: string | null;
  description: string | null;
  is_online: boolean;
  online_link: string | null;
  is_in_person: boolean;
  in_person_address: string | null;
};

export type ApiDashboardEvent = {
  id: number;
  title: string;
  display_date: string | null;
  detail: string | null;
  link: string | null;
  image_path: string | null;
  parsed_date?: string | null;
  days_until?: number | null;
};

export type ApiDashboardOrderItem = {
  id: number;
  product_name: string;
  size: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type ApiDashboardPaymentInstructions = {
  account_name: string;
  sort_code: string;
  account_number: string;
  cheque_payable_to: string | null;
  contact_email: string;
  reference: string;
};

export type ApiDashboardOrder = {
  id: number;
  reference: string;
  status: string;
  status_label: string;
  items_count: number;
  order_total: number;
  created_at: string | null;
  created_at_display: string | null;
  view_url: string | null;
  items: ApiDashboardOrderItem[];
  payment_instructions: ApiDashboardPaymentInstructions | null;
};

export type ApiDashboardSubscriptionStatus = {
  due_date: string;
  due_date_display: string;
  last_paid_at: string | null;
  last_paid_at_display: string | null;
  is_overdue: boolean;
  is_reportable: boolean;
};

export type ApiDashboardAssociate = {
  id: number;
  name: string;
  email: string | null;
  due_date: string;
  due_date_display: string;
  is_overdue: boolean;
  status_label: string;
  pay_url: string | null;
};

export type ApiDashboardShipAssociatedUser = {
  id: number;
  name: string;
  email: string | null;
  user_type: string | null;
  subscription_up_to_date: boolean;
  subscription_due_date: string | null;
  subscription_last_paid_at: string | null;
};

export type ApiDashboardShipImage = {
  id: number;
  image: string;
  image_url: string | null;
  image_category: string;
  category_attribute: string | null;
  caption: string;
  ship_profile_image: boolean;
  position: number;
};

export type ApiDashboardShipImageSection = {
  id: number;
  category: string;
  section_name: string;
  sort_order: number;
};

export type ApiDashboardShip = {
  adls_id: number;
  ship_name: string;
  builder: string | null;
  build_year: string | null;
  construction: string | null;
  displacement: string | null;
  length: string | null;
  beam: string | null;
  draft: string | null;
  engine: string | null;
  ship_type: string | null;
  operations_used: string | null;
  other_names: string[];
  web_url: string | null;
  ship_history: string | null;
  ship_history_html: string | null;
  narrative: string | null;
  archive: string | null;
  language: string | null;
  return_status: string | null;
  source: string | null;
  anniversary_returns_attended: number[];
  adls_member: boolean;
  associated_users: ApiDashboardShipAssociatedUser[];
  images: ApiDashboardShipImage[];
  image_sections?: ApiDashboardShipImageSection[];
};

export type ApiDashboardDocument = {
  id: number;
  name: string;
  download_url: string | null;
  api_download_url: string | null;
};

export type ApiDashboardDocumentGroup = {
  meeting: ApiDashboardMeeting;
  documents: ApiDashboardDocument[];
};

export type ApiDashboardUser = ApiAuthUser & {
  ship_name?: string | null;
  profile_image_path?: string | null;
  resolved_profile_image_path?: string | null;
  display_image_on_ship_profile?: boolean;
};

export type ApiDashboardSummary = {
  user: ApiDashboardUser;
  menu: ApiDashboardMenuItem[];
  shortcuts: {
    journal_entry_url: string | null;
  };
  widgets: {
    orders: {
      payment_pending: number;
      pending_shipment: number;
      completed: number;
    };
    subscription: {
      adls_member: boolean;
      status: ApiDashboardSubscriptionStatus | null;
    };
    upcoming_meetings_count: number;
    upcoming_events_count: number;
    my_associates_count: number;
    my_ships_count: number;
  };
  meetings: ApiDashboardMeeting[];
  events: ApiDashboardEvent[];
  orders: ApiDashboardOrder[];
  subscription: ApiDashboardSubscriptionStatus | null;
  associates: ApiDashboardAssociate[];
  ships: ApiDashboardShip[];
  association_documents: ApiDashboardDocumentGroup[];
  publications: unknown[];
};

export type ApiDashboardSectionResponse<T> = {
  items: T[];
  count?: number;
  empty_state?: string | null;
};

export type ApiDashboardOrdersResponse = {
  status_counts: ApiDashboardSummary['widgets']['orders'];
  items: ApiDashboardOrder[];
  empty_state?: string | null;
};

export type ApiDashboardSubscriptionResponse = {
  status: ApiDashboardSubscriptionStatus | null;
  current_fee: number | null;
  current_fee_label: string | null;
  pay_url: string | null;
  empty_state?: string | null;
};

export type ApiDashboardAssociatesResponse = {
  items: ApiDashboardAssociate[];
  count: number;
  associate_fee: number | null;
  empty_state?: string | null;
};

export type ApiDashboardShipsResponse = {
  items: ApiDashboardShip[];
  builder_options: string[];
  construction_options: string[];
  ship_type_options_grouped: Record<string, string[]>;
  anniversary_return_years: number[];
  profile_image: {
    image_path: string | null;
    display_on_ship_profile: boolean;
  };
  empty_state?: string | null;
};

export type UpdateDashboardShipPayload = {
  adls_id: number;
  adls_member?: string | null;
  builder?: string | null;
  build_year?: string | null;
  construction?: string | null;
  displacement?: string | null;
  length?: string | null;
  beam?: string | null;
  draft?: string | null;
  engine?: string | null;
  ship_type?: string | null;
  operations_used?: string | null;
  other_names?: string | null;
  ship_history_html?: string | null;
  narrative?: string | null;
  archive?: string | null;
  language?: string | null;
  return_status?: string | null;
  anniversary_returns_attended?: number[];
  source?: string | null;
  web_url?: string | null;
  image_caption?: Record<string, string>;
};

export type DashboardProfileImageResponse = {
  message: string;
  data: {
    profile_image_path?: string | null;
    display_image_on_ship_profile: boolean;
  };
};

async function parseErrorMessage(response: Response) {
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

async function fetchAuthedJson<T>(path: string, bearerToken: string): Promise<T> {
  const response = await fetch(`${ADLS_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function fetchAuthed<T>(
  path: string,
  bearerToken: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<T> {
  const response = await fetch(`${ADLS_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bearerToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeMeeting(item: ApiDashboardMeeting): ApiDashboardMeeting {
  return {
    ...item,
    online_link: toAbsoluteSiteUrl(item.online_link),
  };
}

function normalizeEvent(item: ApiDashboardEvent): ApiDashboardEvent {
  return {
    ...item,
    image_path: toAbsoluteAssetUrl(item.image_path),
    link: toAbsoluteSiteUrl(item.link),
  };
}

function normalizeOrder(order: ApiDashboardOrder): ApiDashboardOrder {
  return {
    ...order,
    view_url: toAbsoluteSiteUrl(order.view_url),
  };
}

function normalizeAssociate(associate: ApiDashboardAssociate): ApiDashboardAssociate {
  return {
    ...associate,
    pay_url: toAbsoluteSiteUrl(associate.pay_url),
  };
}

function normalizeShipImage(image: ApiDashboardShipImage): ApiDashboardShipImage {
  return {
    ...image,
    image_url: toAbsoluteAssetUrl(image.image_url || image.image),
  };
}

function normalizeShip(ship: ApiDashboardShip): ApiDashboardShip {
  return {
    ...ship,
    web_url: toAbsoluteSiteUrl(ship.web_url),
    images: ship.images.map(normalizeShipImage),
  };
}

function normalizeDocumentGroup(group: ApiDashboardDocumentGroup): ApiDashboardDocumentGroup {
  return {
    meeting: normalizeMeeting(group.meeting),
    documents: group.documents.map((document) => ({
      ...document,
      download_url: toAbsoluteSiteUrl(document.download_url),
      api_download_url: toAbsoluteSiteUrl(document.api_download_url),
    })),
  };
}

function normalizeDashboardSummary(summary: ApiDashboardSummary): ApiDashboardSummary {
  return {
    ...summary,
    user: {
      ...summary.user,
      profile_image_path: toAbsoluteAssetUrl(summary.user.profile_image_path),
      resolved_profile_image_path: toAbsoluteAssetUrl(summary.user.resolved_profile_image_path),
    },
    shortcuts: {
      journal_entry_url: toAbsoluteSiteUrl(summary.shortcuts.journal_entry_url),
    },
    meetings: summary.meetings.map(normalizeMeeting),
    events: summary.events.map(normalizeEvent),
    orders: summary.orders.map(normalizeOrder),
    associates: summary.associates.map(normalizeAssociate),
    ships: summary.ships.map(normalizeShip),
    association_documents: summary.association_documents.map(normalizeDocumentGroup),
  };
}

export async function fetchDashboardSummary(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardSummary>>('/dashboard', bearerToken);
  const normalized = normalizeDashboardSummary(payload.data);
  await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function readCachedDashboardSummary() {
  const raw = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiDashboardSummary;
  } catch {
    return null;
  }
}

export async function clearCachedDashboardSummary() {
  await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY);
}

export async function fetchDashboardMeetings(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardSectionResponse<ApiDashboardMeeting>>>(
    '/dashboard/meetings',
    bearerToken,
  );
  return {
    ...payload.data,
    items: payload.data.items.map(normalizeMeeting),
  };
}

export async function fetchDashboardEvents(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardSectionResponse<ApiDashboardEvent>>>(
    '/dashboard/events',
    bearerToken,
  );
  return {
    ...payload.data,
    items: payload.data.items.map(normalizeEvent),
  };
}

export async function fetchDashboardOrders(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardOrdersResponse>>('/dashboard/orders', bearerToken);
  return {
    ...payload.data,
    items: payload.data.items.map(normalizeOrder),
  };
}

export async function fetchDashboardSubscription(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardSubscriptionResponse>>(
    '/dashboard/subscription',
    bearerToken,
  );
  return {
    ...payload.data,
    pay_url: toAbsoluteSiteUrl(payload.data.pay_url),
  };
}

export async function fetchDashboardAssociates(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardAssociatesResponse>>(
    '/dashboard/associates',
    bearerToken,
  );
  return {
    ...payload.data,
    items: payload.data.items.map(normalizeAssociate),
  };
}

export async function fetchDashboardShips(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardShipsResponse>>('/dashboard/ships', bearerToken);
  return {
    ...payload.data,
    profile_image: {
      ...payload.data.profile_image,
      image_path: toAbsoluteAssetUrl(payload.data.profile_image.image_path),
    },
    items: payload.data.items.map(normalizeShip),
  };
}

export async function fetchDashboardShip(shipId: number | string, bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardShip>>(`/dashboard/ships/${shipId}`, bearerToken);
  return normalizeShip(payload.data);
}

export async function updateDashboardShip(
  shipId: number | string,
  payload: UpdateDashboardShipPayload,
  bearerToken: string,
) {
  return fetchAuthed<{ message: string; data: unknown }>(`/dashboard/ships/${shipId}`, bearerToken, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateDashboardShipImageCategory(
  shipId: number | string,
  imageId: number | string,
  payload: { image_category: string; category_attribute?: string | null },
  bearerToken: string,
) {
  return fetchAuthed<{ ok: boolean; id: number; image_category: string; category_attribute: string | null }>(
    `/dashboard/ships/${shipId}/images/${imageId}/category`,
    bearerToken,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateDashboardShipImagePositions(
  shipId: number | string,
  payload: { ordered_ids: number[]; image_category?: string | null },
  bearerToken: string,
) {
  return fetchAuthed<{ ok: boolean; count: number; image_category: string | null }>(
    `/dashboard/ships/${shipId}/images/positions`,
    bearerToken,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateDashboardShipProfileImage(
  shipId: number | string,
  imageId: number,
  bearerToken: string,
) {
  return fetchAuthed<{ ok: boolean; image_id: number }>(`/dashboard/ships/${shipId}/images/profile`, bearerToken, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_id: imageId,
    }),
  });
}

export async function uploadDashboardShipImages(
  shipId: number | string,
  payload: {
    image_category: string;
    category_attribute?: string | null;
    images: { uri: string; name: string; type: string }[];
  },
  bearerToken: string,
) {
  const formData = new FormData();
  formData.append('image_category', payload.image_category);
  if (payload.category_attribute) {
    formData.append('category_attribute', payload.category_attribute);
  }

  payload.images.forEach((image, index) => {
    formData.append(`images[${index}]`, image as unknown as Blob);
  });

  return fetchAuthed<{ ok: boolean; created: ApiDashboardShipImage[] }>(
    `/dashboard/ships/${shipId}/images/upload`,
    bearerToken,
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function fetchDashboardAssociationDocuments(bearerToken: string) {
  const payload = await fetchAuthedJson<ApiEnvelope<ApiDashboardSectionResponse<ApiDashboardDocumentGroup>>>(
    '/dashboard/association-documents',
    bearerToken,
  );
  return {
    ...payload.data,
    items: payload.data.items.map(normalizeDocumentGroup),
  };
}

export async function fetchDashboardPublications(bearerToken: string) {
  return fetchAuthedJson<ApiEnvelope<ApiDashboardSectionResponse<unknown>>>('/dashboard/publications', bearerToken);
}

export async function uploadDashboardProfileImage(
  payload: { uri: string; name: string; type: string },
  bearerToken: string,
) {
  const formData = new FormData();
  formData.append('profile_image', payload as unknown as Blob);

  const response = await fetchAuthed<DashboardProfileImageResponse>('/dashboard/profile-image', bearerToken, {
    method: 'POST',
    body: formData,
  });

  return {
    ...response,
    data: {
      ...response.data,
      profile_image_path: toAbsoluteAssetUrl(response.data.profile_image_path),
    },
  };
}

export async function deleteDashboardProfileImage(bearerToken: string) {
  const response = await fetchAuthed<DashboardProfileImageResponse>('/dashboard/profile-image', bearerToken, {
    method: 'DELETE',
  });

  return {
    ...response,
    data: {
      ...response.data,
      profile_image_path: toAbsoluteAssetUrl(response.data.profile_image_path),
    },
  };
}

export async function updateDashboardProfileImagePreference(
  displayImageOnShipProfile: boolean,
  bearerToken: string,
) {
  return fetchAuthed<DashboardProfileImageResponse>('/dashboard/profile-image/preference', bearerToken, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_image_on_ship_profile: displayImageOnShipProfile,
    }),
  });
}

export function buildProtectedApiUrl(path: string) {
  return `${ADLS_SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
