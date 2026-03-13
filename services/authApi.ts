const ADLS_SITE_ORIGIN = 'https://adls.demodomain.co.uk';
const ADLS_API_BASE_URL = `${ADLS_SITE_ORIGIN}/api`;

export type ApiAuthUser = {
  id: number;
  name: string;
  email: string;
  user_type?: string | null;
};

type TokenResponse = {
  token_type: string;
  token: string;
  user: ApiAuthUser;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function createToken(email: string, password: string) {
  const response = await fetch(`${ADLS_API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      token_name: 'adls-mobile',
    }),
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as TokenResponse;
}

export async function revokeToken(bearerToken: string) {
  const response = await fetch(`${ADLS_API_BASE_URL}/token`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorMessage(response));
  }
}

export async function getCurrentUser(bearerToken: string) {
  const response = await fetch(`${ADLS_API_BASE_URL}/user`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as ApiAuthUser;
}

export async function upsertNotificationSubscription(
  bearerToken: string,
  payload: { device_id: string; platform: string; push_token: string | null; is_enabled: boolean },
) {
  const response = await fetch(`${ADLS_API_BASE_URL}/notifications/subscription`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorMessage(response));
  }

  return response.json();
}
