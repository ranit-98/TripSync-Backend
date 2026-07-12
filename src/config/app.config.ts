import { getCorsOrigins } from './cors-origins';

export default () => ({
  app: {
    port: Number(process.env.PORT ?? 4000),
    frontendUrl: getCorsOrigins()[0],
    frontendUrls: getCorsOrigins(),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/trip_sync',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookies: {
    accessName: process.env.ACCESS_TOKEN_COOKIE ?? 'trip_sync_access',
    refreshName: process.env.REFRESH_TOKEN_COOKIE ?? 'trip_sync_refresh',
    domain: process.env.COOKIE_DOMAIN,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? 'trip-sync',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
});
