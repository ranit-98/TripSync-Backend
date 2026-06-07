# TripSync Backend Learning Guide

This file is for learning how to build this backend yourself. Do not start by
copying every file. Start by understanding the shape of the system, then rebuild
one small working feature at a time.

## 1. First Understand The App

TripSync is a collaborative trip planning backend. In simple words:

- Users can register and login.
- A user can create trips.
- Trips can have members.
- Members can plan itinerary items, expenses, map locations, photos, documents,
  chat messages, and notifications.
- Some users can edit trip data, and some can only view it.

Before writing code, keep this mental model:

```text
User
  owns many Trips
  joins many Trips through TripMember

Trip
  has members
  has itinerary days and activities
  has expenses
  has files, photos, chat, locations, notifications
```

The most important idea is this: almost every feature belongs to a trip, so most
routes must first check:

1. Is the user logged in?
2. Is the user a member of this trip?
3. Does the user have permission to change this trip?

## 2. What To Learn Before Building

You do not need to master everything before starting, but you should know the
basics of these topics:

- TypeScript: types, classes, async/await, imports and exports.
- NestJS: modules, controllers, services, guards, decorators, pipes.
- MongoDB: collections, document shape, indexes, and references by id.
- Mongoose: schemas, models, validation rules, and query helpers.
- Authentication: password hashing, JWT access tokens, refresh tokens, cookies.
- REST APIs: HTTP methods, status codes, request body, params, responses.

If any of these feel confusing, build a tiny practice example first. For
example, create only `User` and `Trip` before adding expenses, chat, or uploads.

## 3. How To Think While Building

Think in this order:

```text
Database first
Then DTO validation
Then service logic
Then controller routes
Then guards/permissions
Then tests or manual API checks
```

Do not start from the controller. The controller is only the door. The real app
logic depends on the database model and the service rules.

For every feature, ask:

- What data do I need to store?
- Who is allowed to create it?
- Who is allowed to read it?
- Who is allowed to update or delete it?
- What should happen if the trip/user/item does not exist?
- What should the frontend receive back?

## 4. Recommended Build Order

Build the backend in this order. Each step should run before you move to the
next one.

### Step 1: Create The NestJS Project

Learn the folder structure first:

```text
src/main.ts              app startup
src/app.module.ts        root module
src/modules/*            feature modules
src/common/*             shared guards, decorators, constants
src/database/*           MongoDB connection and Mongoose schemas
```

Start with a small NestJS app that returns one health message.

### Step 2: Add Config

Add environment variables for:

- `PORT`
- `MONGODB_URI`
- `FRONTEND_URL`
- JWT secrets
- cookie names

Do not hardcode secrets inside services. Use config or environment variables.

### Step 3: Add MongoDB And Mongoose

Start with only the `User` schema.

Then add:

- `Trip`
- `TripMember`
- `TripInvite`

Do not create all schemas at once if you are learning. Too many references at
the start will make debugging painful.

Use `mongosh` or MongoDB Compass to inspect your data:

```bash
mongosh mongodb://localhost:27017/trip_sync
```

### Step 4: Build Auth

Build authentication before trip features.

Start with:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/refresh`

Important rules:

- Never store plain passwords.
- Hash passwords with bcrypt.
- Keep access tokens short-lived.
- Store refresh token hashes, not raw refresh tokens.
- Send tokens in `HttpOnly` cookies if the frontend is browser-based.

When auth works, test this flow manually:

1. Register a user.
2. Login.
3. Call `/auth/me`.
4. Refresh the token.
5. Logout.
6. Confirm protected routes no longer work.

### Step 5: Build Users

Add profile routes:

- Get current user.
- Update current user.
- Change password.

Keep user logic separate from auth logic. Auth answers "who are you?" User
service answers "what can you change about your profile?"

### Step 6: Build Trips

Now build the core feature:

- Create trip.
- List my trips.
- Get one trip.
- Update trip.
- Archive/delete trip.

When a user creates a trip, also create their `TripMember` record as a
collaborator or owner-like member. This makes permission checks easier later.

### Step 7: Add Trip Membership And Guards

This is one of the most important parts of the app.

Create guards for:

- Logged-in user: `JwtAuthGuard`
- Trip member: `TripMemberGuard`
- Owner/admin-only actions: `TripOwnerOrAdminGuard`
- Role-based mutation: `@TripRoles(...)`

The permission idea:

- Viewer can read trip content.
- Collaborator can create/update/delete most trip content.
- Owner/admin can manage members or delete/archive the trip.

Do not repeat the same membership check in every service method. Put shared
permission checks into guards or helper queries.

### Step 8: Build One Trip Feature At A Time

After trips and permissions work, add modules slowly:

1. Itinerary
2. Expenses
3. Map locations
4. Gallery
5. Files
6. Chat
7. Notifications
8. Upload signing

For each module, follow the same pattern:

```text
DTO -> controller -> service -> Mongoose query -> response
```

Example thinking for expenses:

- An expense belongs to a trip.
- It has a payer.
- It has splits.
- Only trip collaborators can create expenses.
- Viewers can read expenses.
- Amounts should be stored consistently as numbers or decimal types, depending
  on the precision your product needs.

## 5. What Not To Do

Avoid these mistakes:

- Do not build all modules at once.
- Do not skip database design.
- Do not put business logic inside controllers.
- Do not trust frontend data blindly.
- Do not store plain passwords or raw refresh tokens.
- Do not check permissions only on the frontend.
- Do not duplicate the same authorization code everywhere.
- Do not ignore error cases.
- Do not return password hashes or token hashes in API responses.
- Do not add uploads before normal metadata routes are working.

## 6. How To Read This Codebase

Read the project in this order:

1. `src/database/schemas/*.schema.ts`
2. `src/main.ts`
3. `src/app.module.ts`
4. `src/database/database.module.ts`
5. `src/modules/auth/*`
6. `src/common/guards/*`
7. `src/modules/trips/*`
8. One feature module, such as `expenses` or `itinerary`

While reading a module, follow the request:

```text
Route in controller
  calls method in service
    uses Mongoose models
      returns data
```

This is the main NestJS flow.

## 7. Practice Tasks

Do these without looking at the final code first.

### Easy

- Add a health route that returns app name and current time.
- Add a DTO with validation for creating a simple trip.
- Create a Mongoose query that lists all trips for one user.

### Medium

- Add a new trip note feature:
  - `TripNote` model
  - create note
  - list notes
  - update note
  - delete note
  - only collaborators can mutate
  - viewers can read

### Hard

- Add activity logs:
  - when a trip is created
  - when a member is invited
  - when an expense is added
  - when a file is uploaded

This teaches cross-module thinking.

## 8. Debugging Mindset

When something breaks, do not randomly change code. Ask:

- Is the route being called?
- Is the request body valid?
- Is the user authenticated?
- Is the guard blocking the request?
- Does the database record exist?
- Is Mongoose throwing a validation, cast, or duplicate-key error?
- Is the response shaped how the frontend expects?

Use small checks:

```bash
yarn lint
yarn test
yarn start:dev
```

Use Swagger at:

```text
http://localhost:4000/api/docs
```

Use the API base URL:

```text
http://localhost:4000/api/v1
```

## 9. Suggested Daily Learning Plan

### Day 1

Understand NestJS modules, controllers, services, and DTOs. Build a tiny test
route.

### Day 2

Learn MongoDB collections and Mongoose schemas. Create `User`, `Trip`, and
`TripMember`.

### Day 3

Build register, login, JWT, cookies, and `/auth/me`.

### Day 4

Build trip CRUD and list trips for the current user.

### Day 5

Build guards for membership and role permissions.

### Day 6

Build itinerary or expenses.

### Day 7

Review, refactor, test, and write down what confused you.

## 10. Final Advice

Build boring first. Make one route work, then improve it. A good backend is not
made by writing many files quickly. It is made by keeping data, permissions, and
errors clear.

When you are stuck, reduce the problem:

```text
Can I create the database document manually?
Can I query it with Mongoose?
Can I call the service without the controller?
Can I call the controller without the frontend?
Can I add the guard back after the route works?
```

This is how you learn backend development deeply: small steps, clear mental
models, and no magic.
