const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiErrorResponse extends Error {
  statusCode: number;
  error?: string;

  constructor(message: string, statusCode: number = 500, error?: string) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.statusCode = statusCode;
    this.error = error;
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('proofledger_token');
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred during request execution';
    let errCode = response.status;
    let errType = response.statusText;

    try {
      const data = await response.json();
      if (data) {
        if (Array.isArray(data.errors)) {
          errorMessage = data.errors.join(', ');
        } else if (Array.isArray(data.message)) {
          errorMessage = data.message.join(', ');
        } else if (typeof data.message === 'string' && data.message !== 'Validation failed') {
          errorMessage = data.message;
        } else if (data.error && typeof data.error === 'string') {
          errorMessage = data.error;
        }
        if (data.error) errType = data.error;
        if (data.statusCode) errCode = data.statusCode;
      }
    } catch {
      // Fallback if not JSON
    }

    throw new ApiErrorResponse(errorMessage, errCode, errType);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  postForm: <T = unknown>(endpoint: string, formData: FormData, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData,
      ...options,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),

  downloadBlob: async (endpoint: string): Promise<Blob> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      let msg = 'Failed to download evidence file';
      try {
        const data = await response.json();
        if (data) {
          if (Array.isArray(data.errors)) {
            msg = data.errors.join(', ');
          } else if (Array.isArray(data.message)) {
            msg = data.message.join(', ');
          } else if (typeof data.message === 'string') {
            msg = data.message;
          }
        }
      } catch {}
      throw new ApiErrorResponse(msg, response.status);
    }
    return response.blob();
  },
};
