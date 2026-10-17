export const DEFAULT_CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export function handleOptions() {
  return {
    statusCode: 204,
    headers: DEFAULT_CORS_HEADERS,
    body: '',
  };
}

export function json(statusCode: number, data: any, meta?: any, extraHeaders?: Record<string, string>) {
  return {
    statusCode,
    headers: {
      ...DEFAULT_CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      data,
      meta,
    }),
  };
}

export function error(
  statusCode: number,
  message: string,
  code: string = 'SERVER_ERROR',
  details?: any,
  extraHeaders?: Record<string, string>
) {
  return {
    statusCode,
    headers: {
      ...DEFAULT_CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message,
        details,
      },
    }),
  };
}

export function unauthorized(message: string = 'Authentication required') {
  return error(401, message, 'UNAUTHORIZED');
}

export function forbidden(message: string = 'Access denied') {
  return error(403, message, 'FORBIDDEN');
}

export function notFound(message: string = 'Resource not found') {
  return error(404, message, 'NOT_FOUND');
}
