// API Configuration for Blog-as-a-Service Frontend

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },

  // Articles
  ARTICLES: {
    LIST: '/articles',
    CREATE: '/articles',
    GET: (id: string) => `/articles/${id}`,
    UPDATE: (id: string) => `/articles/${id}`,
    DELETE: (id: string) => `/articles/${id}`,
    PUBLISH: (id: string) => `/articles/${id}/publish`,
    UNPUBLISH: (id: string) => `/articles/${id}/unpublish`,
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
    CREATE: '/categories',
    GET: (id: string) => `/categories/${id}`,
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
  },

  // Tags
  TAGS: {
    LIST: '/tags',
    CREATE: '/tags',
    GET: (id: string) => `/tags/${id}`,
    UPDATE: (id: string) => `/tags/${id}`,
    DELETE: (id: string) => `/tags/${id}`,
  },

  // Comments
  COMMENTS: {
    LIST: '/comments',
    GET: (id: string) => `/comments/${id}`,
    UPDATE: (id: string) => `/comments/${id}`,
    DELETE: (id: string) => `/comments/${id}`,
    APPROVE: (id: string) => `/comments/${id}/approve`,
    REJECT: (id: string) => `/comments/${id}/reject`,
  },

  // Users
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },

  // Tenants
  TENANTS: {
    LIST: '/tenants',
    CREATE: '/tenants',
    GET: (id: string) => `/tenants/${id}`,
    UPDATE: (id: string) => `/tenants/${id}`,
    DELETE: (id: string) => `/tenants/${id}`,
    SETTINGS: (id: string) => `/tenants/${id}/settings`,
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    ARTICLES: '/analytics/articles',
    USERS: '/analytics/users',
    TENANTS: '/analytics/tenants',
  },

  // Media
  MEDIA: {
    UPLOAD: '/media/upload',
    LIST: '/media',
    DELETE: (id: string) => `/media/${id}`,
  },

  // BigWriter Integration
  BIGWRITER: {
    GENERATE: '/bigwriter/generate',
    IMPORT: '/bigwriter/import',
    STATUS: (jobId: string) => `/bigwriter/status/${jobId}`,
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
