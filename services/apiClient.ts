import { Platform } from 'react-native';

const LOCAL_DEV_HOST = Platform.select({
  android: '10.0.2.2',
  ios: '127.0.0.1',
  default: '127.0.0.1',
});

const defaultBaseUrl = `http://${LOCAL_DEV_HOST ?? '127.0.0.1'}:5000`;

const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  defaultBaseUrl;

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  path: string;
  query?: QueryParams;
  body?: object | string | undefined;
};

const buildUrl = (path: string, query?: QueryParams) => {
  if (!query) {
    return `${baseUrl}${path}`;
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`;
};

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const { path, query, body, headers, ...init } = options;
  const url = buildUrl(path, query);

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Request failed (${response.status} ${response.statusText})${errorText ? `: ${errorText}` : ''}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return baseUrl;
}
