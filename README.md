# TripSync Backend

NestJS API for TripSync with PostgreSQL, secure backend-set auth cookies, trip
membership authorization, and Cloudinary direct-upload signing.

## Stack

- NestJS
- Prisma ORM
- PostgreSQL
- JWT access/refresh tokens in `HttpOnly`, `Secure`, `SameSite=None` cookies
- Cloudinary for cover photos, gallery photos, documents, and chat attachments

## Setup

```bash
yarn install
cp .env.example .env
yarn prisma:generate
yarn prisma:migrate
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

Prisma reads PostgreSQL from `DATABASE_URL`. Use `yarn prisma:migrate` for local
schema setup and future database changes.

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

## Upload Flow

1. Collaborator calls `POST /trips/:tripId/uploads/sign`.
2. Frontend uploads the file directly to Cloudinary with the returned signature.
3. Frontend calls the relevant metadata endpoint, such as:
   - `POST /trips/:tripId/photos`
   - `POST /trips/:tripId/folders/:folderId/documents`
   - `POST /trips/:tripId/cover`

Only metadata is stored in PostgreSQL; Cloudinary stores the binary files.
