# TripSync Backend

NestJS API for TripSync with MongoDB, secure backend-set auth cookies, trip
membership authorization, and Cloudinary direct-upload signing.

## Stack

- NestJS
- MongoDB with Mongoose
- JWT access/refresh tokens in `HttpOnly`, `Secure`, `SameSite=None` cookies
- Cloudinary for cover photos, gallery photos, documents, and chat attachments

## Setup

```bash
yarn install
cp .env.example .env
yarn start:dev
```

The API is served under:

```text
http://localhost:4000/api/v1
```

Swagger UI is available at:

```text
http://localhost:4000/api/docs
```

Set `MONGODB_URI` to your MongoDB connection string. For local development, the
app defaults to:

```text
mongodb://localhost:27017/trip_sync
```

## Implemented API Areas

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET/PATCH /users/me`
- `PATCH /users/me/password`
- Trip CRUD, members, invites
- Itinerary days and activities
- Expenses and settlement status
- Map locations
- Chat history/messages/attachments
- Gallery photos and albums
- Document folders and documents
- Notifications
- `POST /trips/:tripId/uploads/sign` for Cloudinary signed direct uploads

## Authorization

Every trip-scoped controller uses:

- `JwtAuthGuard` for authenticated requests
- `TripMemberGuard` for trip membership
- `@TripRoles(TripMemberRole.collaborator)` for viewer-blocked mutations
- `TripOwnerOrAdminGuard` for owner/admin-only member and trip deletion actions

Viewer members can read trip content but cannot create, update, delete, upload,
invite, settle, send reminders, or send chat messages.

## Data Model

MongoDB collections live in `src/database/schemas/*.schema.ts`. The API uses public UUID
strings in each document's `id` field, which keeps route params stable and easy
to read while MongoDB still manages its internal `_id`.

Relations such as trip members, expense splits, chat attachments, and files are
stored as separate collections. Services attach related records explicitly where
the API response needs nested data.

## Upload Flow

1. Collaborator calls `POST /trips/:tripId/uploads/sign`.
2. Frontend uploads the file directly to Cloudinary with the returned signature.
3. Frontend calls the relevant metadata endpoint, such as:
   - `POST /trips/:tripId/photos`
   - `POST /trips/:tripId/folders/:folderId/documents`
   - `POST /trips/:tripId/cover`

Only metadata is stored in MongoDB; Cloudinary stores the binary files.
