# Grand Vista Hotel — Reservation & Front Desk Management System

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20ReplicaSet-brightgreen.svg)](https://www.mongodb.com/atlas)
[![Tests](https://img.shields.io/badge/Vitest-51%2F51%20Passing-success.svg)](https://vitest.dev/)

A production-grade, full-stack hotel management and room reservation system built with the **MERN Stack** (MongoDB, Express, React, Node.js) implemented entirely in **strict TypeScript**. 

Architected with a decoupled 3-tier structure, zero-trust server validation, server-side paginated queries, and **MongoDB Multi-Document ACID Transactions** for concurrency-safe booking under high load.

---

## Table of Contents

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [Key Engineering Features](#2-key-engineering-features)
3. [Concurrency Control & Overbooking Defense](#3-concurrency-control--overbooking-defense)
4. [Database Schema & Indexing Strategy](#4-database-schema--indexing-strategy)
5. [REST API Documentation](#5-rest-api-documentation)
6. [Security & Zero-Trust Policies](#6-security--zero-trust-policies)
7. [Installation & Setup Guide](#7-installation--setup-guide)
8. [Environment Variables](#8-environment-variables)
9. [Automated Testing Suite](#9-automated-testing-suite)
10. [Assessment Demo Credentials](#10-assessment-demo-credentials)
11. [5–10 Minute Demonstration Script](#11-510-minute-demonstration-script)
12. [Production Readiness & Scalability](#12-production-readiness--scalability)
13. [Technical Interview Questions & Answers](#13-technical-interview-questions--answers)
14. [AI Tools Disclosure & Limitations](#14-ai-tools-disclosure--limitations)

---

## 🎥 Project Demo

Watch the Hotel Reservation System demonstration:

[![Watch Hotel Reservation System Demo](https://img.youtube.com/vi/5BTt7UQrw88/hqdefault.jpg)](https://youtu.be/5BTt7UQrw88)

**Video:** [Watch on YouTube](https://youtu.be/5BTt7UQrw88)

---

## 1. High-Level System Architecture

The application is structured into two decoupled TypeScript projects (`client` and `server`):

```
┌─────────────────────────────────────────────────────────────┐
│             Client Tier (React 19 + Vite + TS)              │
│  - Tailwind CSS + Lucide Icons                              │
│  - React Router v7 (Public, Guest & Admin Protected Routes) │
│  - AuthContext (JWT session hydration & persistence)        │
│  - Axios Client (Request Bearer Injection & 401 Interceptor)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          API Gateway & Security Layer (Express + TS)        │
│  - Helmet (HTTP Security Headers)                           │
│  - CORS (Restricted origin whitelist)                       │
│  - Rate Limiting (express-rate-limit brute force defense)   │
│  - JSON Body Bound (10KB limit against payload attacks)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Controller & Middleware Layer               │
│  - Zod Request Schema Validation (validateRequest)          │
│  - JWT Verification & Context Injection (protect)           │
│  - Role-Based Access Control Guard (authorize)              │
│  - Centralized Error Handling Pipeline (errorHandler)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Domain Service Layer                    │
│  - RoomService (Continuous date-range availability engine)  │
│  - ReservationService (Multi-document ACID transactions)    │
│  - AdminService (Aggregation KPIs & Offset DB pagination)   │
│  - AuthService (bcrypt hashing & stateless JWT signing)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Access Layer (Mongoose ODM)               │
│  - User | RoomType | DailyInventory | Reservation           │
│  - Compound Indexes & Schema Bounds                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         MongoDB Atlas Database Engine (Replica Set)         │
│  - WiredTiger Storage Engine (Document-level concurrency)   │
│  - Distributed Transactions & Automatic Rollback            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Engineering Features

### Guest Experience
- **Date-Range Availability Search**: Intelligent search algorithm evaluating continuous availability across every single night of the requested stay.
- **Dynamic Pricing Engine**: Server-side night math and price locking; client-sent prices are strictly ignored.
- **Room Catalog**: Responsive room cards with capacity badges, amenity chips, and remaining inventory counters.
- **Guest Portal ("My Reservations")**: Server-side paginated booking history, status badges, and an accessible cancellation modal with instant inventory restoration.

### Hotel Front Desk & Staff Portal
- **Operations Dashboard**: Real-time KPI counters tracking today's arrivals, today's departures, currently occupied rooms, pending reservations, and active catalog items.
- **Server-Side Paginated Table**: MongoDB `$skip` and `$limit` queries supporting guest/reference search, status filtering, check-in date-range filtering, and sortable columns.
- **Front Desk Station**: One-click check-in (with key assignment) and check-out (with bill settlement) governed by a strict state transition matrix, including inline status actions from the reservation inspector.
- **Room & Inventory Manager**: Full CRUD for room categories with automatic generation of **60 days of `DailyInventory`** upon room creation. Changing `totalInventory` also synchronizes future inventory rows and rejects reductions below already-reserved rooms.

---

## 3. Concurrency Control & Overbooking Defense

Hotel room bookings present an **overlapping date-range race condition**: two customers can simultaneously attempt to book the last available room for overlapping dates at the exact same millisecond.

### Why Aggregate Query Approaches Fail
Traditional systems query `Reservation.countDocuments({ roomType, checkIn: { ... } })` before booking. Under high concurrency, both requests execute the count concurrently, both observe 1 room remaining (Time-of-Check to Time-of-Use / TOCTOU), and both insert a reservation, overselling the hotel and creating negative inventory.

### Our Solution: DailyInventory + MongoDB Multi-Document ACID Transactions

1. **Normalized Daily Grid**: Every room type has a dedicated record per calendar day in `DailyInventory` with a compound unique index on `{ roomTypeId: 1, date: 1 }`.
2. **Atomic Conditional Updates**:
   For each night of a guest's stay, the engine conditionally decrements `availableCount`:
   ```ts
   const updateResult = await DailyInventory.updateOne(
     {
       roomTypeId: room._id,
       date: targetDate,
       availableCount: { $gte: roomCount }, // Atomic guard condition
     },
     {
       $inc: {
         availableCount: -roomCount,
         reservedCount: roomCount,
       },
     },
     { session }
   );
   ```
3. **Transaction Session (`session.withTransaction`)**:
   - If `updateResult.matchedCount === 0` on **any single date** within the stay, the room is sold out.
   - The engine throws an `INSUFFICIENT_INVENTORY` error.
   - `withTransaction` automatically aborts the transaction, rolling back all decrements on preceding nights.
   - The controller maps this error to **HTTP 409 Conflict**.
   - If all nights succeed, the reservation is created with status `confirmed`, and the transaction commits atomically.

### Concurrent Cancellation Protection
Cancellation uses the same transactional pattern with an additional conditional status guard. The update matches only when the reservation is still `pending` or `confirmed`, so two simultaneous cancellation requests cannot both succeed and restore inventory twice. Exactly one request cancels the booking and replenishes `DailyInventory`; the other receives HTTP 400 `INVALID_CANCELLATION_STATE`.

---

## 4. Database Schema & Indexing Strategy

### Models Summary

#### 1. `User`
- `name`: String, required, trimmed
- `email`: String, unique, lowercase, trimmed (Indexed)
- `password`: String, select: false (Bcrypt hashed, 12 salt rounds)
- `role`: Enum (`'guest' | 'staff' | 'admin'`), default: `'guest'` (Indexed)

#### 2. `RoomType`
- `name`: String, unique, trimmed (Indexed)
- `description`: String
- `capacity`: Number (1–10 guests)
- `facilities`: Array of strings
- `pricePerNight`: Number (min: 0)
- `totalInventory`: Number (min: 1)
- `isActive`: Boolean, default: true (Indexed)
- `imageUrl`: String
- **Compound Index**: `{ isActive: 1, pricePerNight: 1 }` (Accelerates catalog sorting)

#### 3. `DailyInventory`
- `roomTypeId`: ObjectId referencing `RoomType` (Indexed)
- `date`: Date normalized to midnight UTC (`00:00:00.000Z`) (Indexed)
- `totalInventory`: Number
- `availableCount`: Number (min: 0, cannot drop below zero)
- `reservedCount`: Number (default: 0)
- **Unique Compound Index**: `{ roomTypeId: 1, date: 1 }` (Guarantees exactly 1 record per room per day)
- **Range Index**: `{ roomTypeId: 1, date: 1, availableCount: 1 }` (Accelerates multi-night availability queries)

#### 4. `Reservation`
- `reference`: String, unique (e.g. `RES-20261105-A1B2`, Indexed)
- `guest`: ObjectId referencing `User` (Indexed)
- `roomType`: ObjectId referencing `RoomType` (Indexed)
- `checkIn`: Date (Indexed)
- `checkOut`: Date (Indexed)
- `guestCount`: Number (min: 1)
- `roomCount`: Number (min: 1, default: 1)
- `priceSnapshot`: Number (Nightly rate locked at booking time)
- `totalAmount`: Number (Calculated on server: `priceSnapshot * nights * roomCount`)
- `status`: Enum (`'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'`)
- `specialRequests`: String (max 500 characters)
- `cancellationReason`: String
- `cancelledAt`: Date
- `checkedInAt`: Date
- `checkedOutAt`: Date
- **Compound Indexes**:
  - `{ guest: 1, createdAt: -1 }` (Guest portal lookup)
  - `{ status: 1, checkIn: 1 }` (Arrivals feed)
  - `{ status: 1, checkOut: 1 }` (Departures feed)

### State Transition Matrix

$$\text{Pending} \longrightarrow \text{Confirmed} \longrightarrow \text{Checked-in} \longrightarrow \text{Checked-out}$$

- Cancellation is allowed only from `Pending` or `Confirmed`.
- `Checked-out` and `Cancelled` are terminal states. Illegal transitions return HTTP 400 `INVALID_STATUS_TRANSITION`.

---

## 5. REST API Documentation

### Base URL: `/api`

### Authentication Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public (Rate Limited) | Register a new guest (forces `role = guest`). |
| `POST` | `/auth/login` | Public (Rate Limited) | Authenticate user & return signed JWT. |
| `GET` | `/auth/me` | Protected | Hydrate user profile from Bearer token. |

### Room & Availability Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/rooms` | Public | List all active room categories. |
| `GET` | `/rooms/:id` | Public | Retrieve full details of a specific room. |
| `GET` | `/availability` | Public | Continuous date-range availability search (`?checkIn=...&checkOut=...&guests=...`). |

### Reservation Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/reservations` | Protected (Guest) | Concurrency-safe room booking. Returns HTTP 201 or 409 Conflict. |
| `GET` | `/reservations/my` | Protected (Guest) | Paginated personal reservations (`?page=1&limit=10&status=confirmed`). |
| `GET` | `/reservations/:id` | Protected (Owner/Staff) | Retrieve reservation details with ownership guard. |
| `PATCH` | `/reservations/:id/cancel` | Protected (Owner/Staff) | Cancel booking & atomically replenish `DailyInventory`. |

### Administrative & Front Desk Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | Staff / Admin | Live Front Desk operational metrics. |
| `GET` | `/admin/reservations` | Staff / Admin | Server-side pagination, search, status/date filters, and sorting (`page`, `limit`, `search`, `status`, `startDate`, `endDate`, `sortBy`, `sortOrder`). |
| `PATCH` | `/admin/reservations/:id/check-in` | Staff / Admin | Check in guest & timestamp arrival. |
| `PATCH` | `/admin/reservations/:id/check-out` | Staff / Admin | Check out guest & timestamp departure. |
| `PATCH` | `/admin/reservations/:id/status` | Staff / Admin | General status transition update. |
| `GET` | `/admin/rooms` | Staff / Admin | List all rooms (including inactive categories). |
| `POST` | `/admin/rooms` | Staff / Admin | Create room category & auto-seed 60-day inventory. |
| `PUT` | `/admin/rooms/:id` | Staff / Admin | Update room details, capacity, and pricing. |
| `PATCH` | `/admin/rooms/:id/status` | Staff / Admin | Activate / deactivate room category. |

---

## 6. Security & Zero-Trust Policies

1. **Privilege Escalation Prevention**: Registration endpoints ignore any client-sent `role`. Public registration strictly forces `UserRole.GUEST`. Staff and Admin roles are granted solely via database seeding or elevated staff actions.
2. **Zero-Trust Financial Protection**: The client sends only `roomTypeId`, dates, and party size. The server calculates the nights, queries the authoritative rate, and locks in the `priceSnapshot` and `totalAmount`.
3. **Defense Against User Enumeration**: Failed login attempts return a uniform error (`"Invalid email or password"`) for both incorrect passwords and non-existent accounts.
4. **Defense in Depth for Passwords**:
   - Passwords hashed with `bcrypt` (12 adaptive salt rounds).
   - `select: false` on Mongoose schema prevents accidental extraction in queries.
   - `toJSON.transform` deletes `ret.password` before serialization.
5. **Ownership Guards**: Guests can only view or cancel reservations where `reservation.guest === req.user._id`.
6. **HTTP Security Headers & Rate Limiting**:
   - `helmet` sets 15+ headers including CSP, HSTS, and X-Content-Type-Options.
   - `express-rate-limit` throttles auth endpoints to 30 requests per 15 minutes.
   - `express.json({ limit: '10kb' })` blocks payload DOS attacks.

---

## 7. Installation & Setup Guide

### Prerequisites
- Node.js (v20.x or higher)
- npm (v10.x or higher)
- MongoDB Atlas cluster (or local MongoDB replica set)

### Step 1: Clone & Install Root
```bash
git clone <repository-url>
cd HotelReservation
```

### Step 2: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 3: Configure Backend Environment
Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hotel_reservation?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_minimum_32_characters_long_for_dev
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Step 4: Seed Database with Demo Data
Populates 3 users, 4 luxury room types, and 240 daily inventory records (60 days × 4 room types). Re-running the seeder clears users, rooms, reservations, and inventory first:
```bash
npm run seed
```

### Step 5: Install Frontend Dependencies
```bash
cd ../client
npm install
```

### Step 6: Run Applications
**Backend (Terminal 1):**
```bash
cd server
npm run dev
# Running on http://localhost:5000
```

**Frontend (Terminal 2):**
```bash
cd client
npm run dev
# Running on http://localhost:5173
```

---

## 8. Environment Variables

### Backend (`server/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Express listening port | `5000` |
| `NODE_ENV` | Environment mode | `development` / `production` / `test` |
| `MONGODB_URI` | MongoDB Atlas replica-set connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Cryptographic key for token signing (32+ chars) | `your_secret_32_chars_long` |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |

### Frontend (`client/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for REST API endpoints | `http://localhost:5000/api` |

---

## 9. Automated Testing Suite

The project includes **51 comprehensive automated tests** written in **Vitest** and **Supertest**, utilizing an ephemeral replica set via `mongodb-memory-server`.

To execute all tests:
```bash
cd server
npm test
```

### Test Coverage Highlights
- **`health.test.ts`**: Verifies `/api/health` status, database connection reporting, and 404 handler.
- **`models.test.ts`**: Verifies bcrypt pre-save hashing, password omission in `toJSON`, schema bounds, and state transition matrix.
- **`auth.test.ts`**: Verifies registration, privilege escalation prevention, login with bcrypt, token verification, and 401/403 guards.
- **`rooms.test.ts`**: Verifies active room filtering, date validations (past check-in and 0-night stays), continuous multi-night availability, multi-room capacity, and admin room creation.
- **`reservations.test.ts`**: Verifies booking, server price locking, capacity enforcement, ownership security, paginated My Reservations, cancellation with inventory restoration, **concurrent cancellation protection**, and **the simultaneous competing booking test**.
- **`admin.test.ts`**: Verifies dashboard KPI calculations, server-side pagination (`skip`, `limit`, `totalPages`), search filtering, check-in date-range filtering, check-in / check-out lifecycle operations, and room inventory synchronization.

---

## 10. Assessment Demo Credentials

The database seeder (`npm run seed`) populates the following accounts for assessment review:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@hotel.com` | `AdminPassword123!` | Full Staff & Admin Portal access |
| **Front Desk Staff** | `staff@hotel.com` | `StaffPassword123!` | Front Desk & Reservation management |
| **Guest Customer** | `guest@hotel.com` | `GuestPassword123!` | Guest booking & personal reservations |

*(Tip: The `/login` page includes **One-Click Autofill Buttons** for instant evaluation).*

---

## 11. 5–10 Minute Demonstration Script

Follow this structured walkthrough during your technical presentation:

1. **Guest Registration & Login (1 min)**:
   - Navigate to `/login`.
   - Click the **"Autofill Guest"** button and log in.
   - Note the navbar updating to display the guest's name and role badge.
2. **Availability Search & Catalog (2 min)**:
   - On `/`, highlight the floating search bar.
   - Select check-in and check-out dates (e.g. 3 nights) with 2 guests.
   - Click **Search**: show how the catalog switches to search mode, displays calculated totals (`$XXX for 3 nights`), and shows remaining inventory badges.
3. **Room Details & Instant Booking (2 min)**:
   - Click **Details** on a room to showcase the high-res gallery, specs, and amenity list.
   - Click **Proceed to Reservation**: show the live quote summary box, enter a special request, and click **Confirm & Book Now**.
   - Show the confirmation screen with the generated reference code (`RES-YYYYMMDD-XXXX`).
4. **My Reservations & Atomic Cancellation (1.5 min)**:
   - Navigate to `/my-reservations` to view the newly created confirmed booking. If you have multiple bookings, demonstrate the server-side pagination controls.
   - Demonstrate the cancellation modal: enter a reason and cancel. Show the status update to `Cancelled` and explain how inventory is atomically replenished and protected against concurrent duplicate cancellations.
5. **Staff Portal & Front Desk Operations (2 min)**:
   - Log out and log in as `admin@hotel.com` using the **"Autofill Staff/Admin"** button.
   - Navigate to **Staff Portal**:
     - **Dashboard**: Review today's arrivals, departures, and occupancy counters.
     - **Front Desk Operations**: Demonstrate one-click **Check In** on a confirmed guest arrival, showing status transition to `Checked In`.
      - **All Reservations**: Demonstrate server-side pagination, guest/reference search, status/date filters, sorting, and inline Confirm / Check In / Check Out / Cancel actions in the reservation inspector. Show that pagination happens inside MongoDB queries rather than in React memory.
      - **Rooms & Inventory**: Demonstrate the one-click active/inactive toggle switch and note that changing total inventory updates future daily availability.
6. **Concurrency Defense Explanation (1.5 min)**:
   - Run `npx vitest run tests/reservations.test.ts` in the terminal to demonstrate the automated concurrency test where two competing simultaneous requests attempt to book the last room: exactly one succeeds (201), one fails (409 Conflict), and inventory drops to 0 without overbooking.

---

## 12. Production Readiness & Scalability

1. **Horizontal Backend Scaling**:
   - The API is completely **stateless**. Authentication relies on cryptographically signed JWTs rather than server-side session memory, allowing multiple Express instances to sit behind an AWS ALB or NGINX load balancer without sticky sessions.
2. **Database Indexing & Connection Pooling**:
   - Mongoose pool configured with `maxPoolSize: 10` and `minPoolSize: 2` to prevent socket exhaustion.
   - Critical queries (availability searches, pagination, user email lookups) are supported by compound indexes to maintain $O(1)$ or $O(\log N)$ performance.
3. **Query Optimization**:
   - Uses server-side projection (`select: false` on password) and pre-queries user IDs to avoid costly unindexed `$lookup` aggregations.
4. **Graceful Shutdown**:
   - Express server listens for `SIGTERM` and `SIGINT`, stops accepting new connections, drains existing in-flight HTTP requests, and closes MongoDB connections cleanly before exiting.

---

## 13. Technical Interview Questions & Answers

<details>
<summary><strong>Q1: How does your system safely handle two customers booking the last room at the same time?</strong></summary>

> **Answer**:
> "We combine MongoDB Multi-Document ACID Transactions with atomic conditional updates on a dedicated `DailyInventory` collection.
> For each night of the stay, we conditionally decrement `availableCount` where `{ availableCount: { $gte: roomCount } }` inside `session.withTransaction()`. Because MongoDB document updates are atomic at the storage engine level, concurrent writes are serialized. One request decrements the count to 0; the competing request matches 0 documents, aborts the transaction, rolls back preceding nights, and returns HTTP 409 Conflict. This guarantees zero negative inventory and zero overbooking."
</details>

<details>
<summary><strong>Q2: Why implement server-side pagination instead of client-side slicing?</strong></summary>

> **Answer**:
> "Fetching all reservations to paginate in React transfers the entire database over the wire, consuming excessive memory and bandwidth as the hotel scales to thousands of bookings. 
> Our implementation executes `$skip` and `$limit` directly in MongoDB, fetching only the requested page size (e.g. 10 items) and returning pagination metadata (`totalCount`, `totalPages`, `hasNextPage`) for client controls."
</details>

<details>
<summary><strong>Q3: Why store a <code>priceSnapshot</code> on the reservation?</strong></summary>

> **Answer**:
> "Room rates change dynamically over time. If a room rate increases from \$180 to \$250 next month, historical and active bookings must preserve their original contracted rate. The `priceSnapshot` locks in the financial agreement made at checkout."
</details>

<details>
<summary><strong>Q4: How do you enforce security and role authorization?</strong></summary>

> **Answer**:
> "We employ a zero-trust model:
> 1. Public registration strictly overrides the role to `UserRole.GUEST`.
> 2. Passwords are hashed with bcrypt (12 salt rounds) and omitted from serialization via schema transforms.
> 3. Administrative routes are guarded by curried `authorize(UserRole.ADMIN, UserRole.STAFF)` middleware.
> 4. Ownership boundaries prevent guests from viewing or cancelling any reservation other than their own."
</details>

---

## 14. AI Tools Disclosure & Limitations

### AI Tools Disclosure
In accordance with assessment guidelines, Google Antigravity (Advanced Agentic Pair Programmer) was utilized as an interactive architecture consultant, technical mentor, and pair programmer to assist in structuring TypeScript interfaces, drafting Mongoose schemas, configuring Vitest runner scripts, and generating documentation. All code was reviewed, validated, and verified step-by-step.

### Known Limitations & Future Enhancements
- **Payment Processing**: Currently books with immediate confirmation (`status: confirmed`). A production integration would introduce a Stripe webhook listener to hold rooms in `pending` status with a 15-minute TTL before committing.
- **Email Notifications**: Currently provides in-app confirmation screens; future iterations could integrate SendGrid or AWS SES for automated email receipts.
- **Dynamic Seasonal Pricing**: Currently uses static `pricePerNight`; future iterations could support custom weekend or seasonal rate multipliers on `DailyInventory`.

---

## License
MIT License. Developed for technical assessment evaluation.

