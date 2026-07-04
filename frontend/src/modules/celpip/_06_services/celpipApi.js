const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
import { useAuthStore } from '../../auth/_05_stores/authStore';

function hasCelpipLogAccess() {
  const { isAuthenticated, tokens, _rehydrationValidating } = useAuthStore.getState();
  return Boolean(!_rehydrationValidating && isAuthenticated && tokens?.access_token);
}

function buildCelpipUrl(path) {
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

async function celpipAuthFetch(path, options = {}, allowRetry = true) {
  const store = useAuthStore.getState();
  if (store._rehydrationValidating) {
    return { ok: false, status: 0, data: null };
  }

  const accessToken = store.tokens?.access_token;
  if (!accessToken) {
    return { ok: false, status: 401, data: null };
  }

  const response = await fetch(buildCelpipUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (response.status === 401 && allowRetry) {
    try {
      const refreshedTokens = await useAuthStore.getState().refreshToken();
      if (refreshedTokens?.access_token) {
        return celpipAuthFetch(path, options, false);
      }
    } catch {
      return { ok: false, status: 401, data };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

/**
 * Save CELPIP test log
 * @param {string|object} testIdOrPayload
 * @param {number} score
 * @param {object} answers
 */
export async function saveCelpipTestLog(testIdOrPayload, score, answers) {
  if (!hasCelpipLogAccess()) {
    return null;
  }

  const payload = typeof testIdOrPayload === 'object' && testIdOrPayload !== null
    ? testIdOrPayload
    : { test_id: testIdOrPayload, score, answers };

  try {
    const response = await celpipAuthFetch('/api/auth/celpip_logs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = new Error(response.data?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.data?.log || response.data;
  } catch (error) {
    if (error?.status === 401) {
      return null;
    }
    console.error('Error saving CELPIP log:', error);
    throw error;
  }
}

/**
 * Fetch CELPIP test logs for the current user
 */
export async function getCelpipTestLogs() {
  if (!hasCelpipLogAccess()) {
    return [];
  }

  try {
    const response = await celpipAuthFetch('/api/auth/celpip_logs', {
      method: 'GET',
    });
    if (!response.ok) {
      const error = new Error(response.data?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.data?.logs || [];
  } catch (error) {
    if (error?.status === 401) {
      return [];
    }
    console.error('Error fetching CELPIP logs:', error);
    return [];
  }
}
