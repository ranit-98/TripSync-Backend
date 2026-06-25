const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export function getCorsOrigins() {
  const configuredOrigins =
    process.env.FRONTEND_URLS ??
    process.env.FRONTEND_URL ??
    DEFAULT_FRONTEND_URL;

  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : [DEFAULT_FRONTEND_URL];
}
