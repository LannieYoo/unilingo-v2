/**
 * Auth constants.
 */

// Google OAuth
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Admin email from environment
export const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || '';

// Character limit for guest users
export const MAX_CHARS_GUEST = 1000;

// Token storage keys
export const TOKEN_STORAGE_KEY = 'auth_tokens';
export const USER_STORAGE_KEY = 'auth_user';

// API endpoints
export const AUTH_ENDPOINTS = {
  GOOGLE_AUTH: '/api/auth/google',
  GOOGLE_CALLBACK: '/api/auth/google/callback',
  REFRESH: '/api/auth/refresh',
  ME: '/api/auth/me',
  LOGOUT: '/api/auth/logout',
};

// Admin API endpoints
export const ADMIN_ENDPOINTS = {
  USERS: '/api/admin/users',
  LOGIN_LOGS: '/api/admin/login-logs',
  STT_LOGS: '/api/admin/stt-logs',
  TRANSLATION_LOGS: '/api/admin/translation-logs',
  DICTIONARY_LOGS: '/api/admin/dictionary-logs',
  CHECK: '/api/admin/check',
};
