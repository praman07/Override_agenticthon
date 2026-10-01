import { getActiveToken } from '../state/authSlice.js';

/**
 * Parses API responses and throws normalized JS errors for non-2xx responses.
 *
 * @param {Response} response
 * @returns {Promise<any>}
 */
const parseResponse = async (response) => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    let data = null;

    if (isJson) {
        try {
            data = await response.json();
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        const textError = !isJson ? await response.text().catch(() => '') : null;
        throw new Error(data?.message || textError || `Request failed (${response.status})`);
    }

    return data;
};

// Next.js uses relative API paths directly by default
const API_BASE = '';

/**
 * Executes an authenticated request to auth endpoints with cookie and Bearer token fallback.
 *
 * @param {string} url
 * @param {string} [method='GET']
 * @param {Record<string, unknown>} [body]
 * @returns {Promise<any>}
 */
const authRequest = async (url, method = 'GET', body) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const token = getActiveToken();
    const response = await fetch(fullUrl, {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    return parseResponse(response);
};

/**
 * Registers a user and sets the auth cookie.
 *
 * @param {{name: string, email: string, password: string}} payload
 * @returns {Promise<any>}
 */
export const registerApi = (payload) => authRequest('/api/auth/register', 'POST', payload);

/**
 * Logs in a user and sets the auth cookie.
 *
 * @param {{email: string, password: string}} payload
 * @returns {Promise<any>}
 */
export const loginApi = (payload) => authRequest('/api/auth/login', 'POST', payload);

/**
 * Switches current session token to a saved account token.
 *
 * @param {string} token
 * @returns {Promise<any>}
 */
export const switchAccountApi = (token) => authRequest('/api/auth/switch', 'POST', { token });

/**
 * Fetches currently authenticated user from cookie token.
 *
 * @returns {Promise<any>}
 */
export const meApi = () => authRequest('/api/auth/me');

/**
 * Clears auth cookie and invalidates local session state.
 *
 * @returns {Promise<any>}
 */
export const logoutApi = () => authRequest('/api/auth/logout', 'POST');
