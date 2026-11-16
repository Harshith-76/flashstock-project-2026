# FlashStock

### High-Concurrency E-Commerce & Inventory Management Platform

FlashStock is a full-stack e-commerce and inventory management platform designed to handle high-demand product purchases while maintaining inventory consistency.

The project's primary engineering challenge is preventing **overselling during concurrent purchase attempts** — ensuring that multiple customers cannot successfully purchase the same limited-stock item beyond the available quantity.

> **Project Status:** 🚧 Under Development

---

## Project Vision

Traditional e-commerce systems can experience inventory inconsistencies when many customers attempt to purchase limited-stock products simultaneously.

FlashStock aims to address this challenge through:

- Concurrency-safe inventory reservations.
- Atomic stock management.
- Reservation expiration and stock release.
- Idempotent checkout operations.
- Payment simulation.
- Inventory movement tracking.
- Administrative inventory monitoring.

The goal is to build a practical, production-style system that demonstrates full-stack development and backend engineering concepts.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Hono, TypeScript |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Version Control | Git, GitHub |
| Deployment | Cloudflare |

## Architecture

```text
                 FRONTEND
              React + TypeScript
                     |
                     | HTTPS / REST API
                     |
                     v
              CLOUDFLARE WORKERS
                     |
                     v
                  HONO
                API ROUTES
                     |
                     v
             APPLICATION LOGIC
                     |
                     v
                DRIZZLE ORM
                     |
                     v
              CLOUDFLARE D1
                  SQLite
```

The application follows a modular monolith architecture, separating routes, services, repositories, validation, and database access.

## Core Features

### Customer Features
- User registration and authentication.
- Product browsing and searching.
- Shopping cart management.
- Checkout and order placement.
- Order history.
- Simulated payment processing.

### Inventory Management
- Real-time stock tracking.
- Available and reserved stock separation.
- Temporary inventory reservations.
- Automatic reservation expiration.
- Inventory movement history.

### High-Concurrency Checkout
The central feature of FlashStock is its inventory reservation system.

Example scenario:

```text
Available stock: 10 units
Purchase attempts: 100

Expected result:

Successful reservations: 10
Rejected attempts:       90
Oversold units:           0
```

This scenario will be implemented and verified through automated concurrency tests.

### Admin Dashboard
- Product management.
- Inventory monitoring.
- Order management.
- Flash sale management.
- Sales and inventory analytics.

## Database Design

The initial database schema contains 13 application tables:

| Table | Responsibility |
|---|---|
| users | User accounts |
| sessions | Authentication sessions |
| products | Product information |
| inventory | Stock quantities |
| carts | Shopping carts |
| cart_items | Cart contents |
| orders | Customer orders |
| order_items | Order details |
| reservations | Temporary stock reservations |
| reservation_items | Reserved products |
| payments | Payment records |
| idempotency_keys | Duplicate request prevention |
| inventory_movements | Inventory audit history |

### Important Design Decisions

- Prices are stored as integer paise to avoid floating-point precision problems.
- Product information and inventory quantities are maintained separately.
- Available stock is calculated as `on_hand - reserved`.
- Reservations are designed to prevent multiple customers from claiming the same stock.
- Idempotency keys are planned to prevent duplicate checkout operations.

## Project Structure

```text
FlashStock/
│
├── apps/
│   ├── api/
│   │   ├── migrations/
│   │   ├── tests/
│   │   └── src/
│   │       ├── db/
│   │       ├── middleware/
│   │       ├── repositories/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── types/
│   │       ├── validators/
│   │       └── index.ts
│   │
│   └── web/
│
├── docs/
│   └── FLASHSTOCK_DAY_01.md
│
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Install the following:

- Node.js
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Harshith-76/flashstock-project-2026.git
```

### 2. Enter the project directory

```bash
cd flashstock-project-2026
```

### 3. Install root dependencies

```bash
npm install
```

### 4. Install backend dependencies

```bash
cd apps/api
npm install
```

### 5. Apply local database migrations

```bash
npx wrangler d1 migrations apply flashstock-db --local
```

### 6. Start the backend

From the project root:

```bash
npx wrangler dev --config apps/api/wrangler.jsonc
```

The local API will be available at:

```text
http://localhost:8787
```

**Note:** The Cloudflare D1 database configuration must be available in `apps/api/wrangler.jsonc`. The local development database is separate from the remote Cloudflare database.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API information |
| GET | `/api/v1/health` | Backend health check |
| GET | `/api/v1/health/database` | Database connectivity check |
| GET | `/api/v1/products` | Retrieve active products |

Additional endpoints will be added as development progresses.

## Development Roadmap

- [x] Project initialization.
- [x] Backend environment setup.
- [x] Cloudflare Workers configuration.
- [x] Cloudflare D1 database creation.
- [x] Initial 13-table database schema.
- [x] Drizzle ORM integration.
- [x] Hono API setup.
- [x] Backend health endpoints.
- [x] Initial product listing endpoint.
- [ ] Product management APIs.
- [ ] Inventory management APIs.
- [ ] Authentication and authorization.
- [ ] Shopping cart functionality.
- [ ] Checkout and order management.
- [ ] Payment simulation.
- [ ] Concurrency-safe inventory reservations.
- [ ] Automated concurrency testing.
- [ ] React frontend.
- [ ] Admin dashboard.
- [ ] Production deployment.

## Documentation

Development progress is documented day by day in the `docs/` directory.

- [Day 1 — Project Foundation](docs/FLASHSTOCK_DAY_01.md)

## Author

**Harshith**

GitHub: [@Harshith-76](https://github.com/Harshith-76)

---

*FlashStock is an ongoing engineering project focused on full-stack development, database design, inventory consistency, and concurrency handling.*