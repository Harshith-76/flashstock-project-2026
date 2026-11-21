# ⚡ FlashStock

### High-Concurrency E-Commerce & Inventory Management Platform

FlashStock is a full-stack e-commerce and inventory management platform designed to handle high-demand product purchases while maintaining inventory consistency.

Its primary engineering challenge is preventing **overselling during concurrent purchase attempts** — ensuring that multiple customers cannot successfully purchase limited-stock products beyond the available quantity.

> **Project Status:** Local application implemented; Cloudflare deployment preparation in progress.

---

## 🎯 Project Vision

Traditional e-commerce systems can experience inventory inconsistencies when multiple customers attempt to purchase limited-stock products simultaneously.

FlashStock is designed to address this challenge through:

- Concurrency-safe inventory reservations.
- Atomic stock management.
- Temporary reservations with expiration.
- Idempotent checkout operations.
- Payment simulation.
- Inventory movement tracking.
- Role-based access control.
- Administrative inventory monitoring.
- Sales and inventory analytics.

The objective is to build a practical, production-style application demonstrating full-stack development, backend engineering, database design, and concurrency management.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Hono, TypeScript |
| Runtime and static hosting | Cloudflare Workers Static Assets |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Testing | Node.js test runner (`tsx --test`) |
| Version Control | Git, GitHub |
| Deployment Target | Cloudflare |

---

## 🏗️ Architecture

FlashStock follows a modular monolith architecture.

```text
             CUSTOMER
                |
                v
       REACT + VITE FRONTEND
          Static assets
                |
        Same-origin /api/v1
                |
                v
       CLOUDFLARE WORKER
         Hono API + assets
                    |
                    v
           APPLICATION SERVICES
                    |
          +---------+---------+
          |         |         |
          v         v         v
         AUTH   INVENTORY  CHECKOUT
          |         |         |
          +---------+---------+
                    |
                    v
               DRIZZLE ORM
                    |
                    v
              CLOUDFLARE D1
                  SQLite
```

### Backend Structure

The backend separates application responsibilities into:

- **Routes:** HTTP endpoints and request handling.
- **Middleware:** Authentication, authorization and rate limiting.
- **Services:** Core business logic.
- **Validators:** Request validation.
- **Types:** Shared TypeScript definitions.
- **Database:** Schema, migrations and database access.

---

## 🚀 Core Features

### 1. Customer Application

The customer-facing application includes:

- User registration and authentication foundations.
- Product browsing.
- Product search and filtering foundations.
- Product detail pages.
- Shopping cart foundations.
- Checkout pages.
- Order confirmation pages.
- Order history foundations.
- Responsive storefront.

The landing page includes:

- Navigation bar with mobile menu.
- Hero section.
- Product categories.
- Featured products.
- Flash-sale section.
- Customer benefits.
- Call-to-action section.
- Footer.

### 2. Authentication & Security

Backend authentication functionality includes:

- User registration.
- User login and logout.
- Password hashing.
- Session management.
- Cookie-based authentication.
- Customer and administrator roles.
- Authentication middleware.
- Administrator authorization middleware.
- Rate limiting for sensitive requests.

### 3. Inventory Management

FlashStock maintains a distinction between physical stock and reserved stock.

Important inventory values:

```text
Available Stock = On-Hand Stock - Reserved Stock
```

The inventory system includes functionality for:

- Stock tracking.
- Reserved stock management.
- Available stock calculations.
- Inventory adjustments.
- Inventory movement history.
- Temporary stock reservations.

### 4. High-Concurrency Inventory Engine

The central engineering feature of FlashStock is its inventory reservation system.

Consider the following scenario:

```text
Available stock: 10 units
Purchase attempts: 100

Expected result:

Successful reservations: 10
Rejected attempts:       90
Oversold units:           0
```

The system is designed around server-side inventory validation and conditional database operations.

The reservation workflow includes:

- Reservation creation.
- Reservation expiration.
- Reservation confirmation.
- Reservation cancellation.
- Stock release.
- Inventory movement tracking.

**Important:** The concurrency scenario is a key automated testing target. Its results must be verified against the database before claiming production-level concurrency guarantees.

### 5. Checkout & Idempotency

Checkout functionality is designed to prevent duplicate operations.

Idempotency helps ensure that repeated requests using the same idempotency key do not unintentionally create duplicate checkout operations.

The backend includes services for:

- Cart processing.
- Checkout.
- Order creation.
- Reservation handling.
- Duplicate request prevention.

### 6. Payment Simulation

FlashStock uses simulated payments rather than a real payment gateway.

The payment workflow includes:

- Payment initiation.
- Successful payment handling.
- Failed payment handling.
- Payment records.
- Reservation confirmation and release workflows.

### 7. Flash Sales

FlashStock includes backend functionality for flash sales.

The intended functionality includes:

- Creating flash sales.
- Configuring discounted prices.
- Setting sale start and end times.
- Managing sale inventory limits.
- Retrieving flash-sale information.

Flash-sale purchases are intended to use the same inventory protection mechanisms as regular purchases.

### 8. Administration & Analytics

Backend functionality includes administrative and analytics routes.

The planned administrative experience covers:

- Product management.
- Inventory monitoring.
- Order management.
- Customer information.
- Flash-sale management.
- Sales analytics.
- Inventory summaries.

The frontend now includes an admin workspace for these database-backed operations. Settings and richer analytics visualizations remain incomplete.

---

## 🗄️ Database Design

FlashStock uses Cloudflare D1, powered by SQLite, with Drizzle ORM for database access and schema management.

The database covers the application's main entities:

| Entity | Responsibility |
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
| flash_sales | Flash-sale configuration |

### Important Design Decisions

- Prices are stored as integer paise to avoid floating-point precision problems.
- Product information and inventory quantities are maintained separately.
- Available stock is calculated as `on_hand - reserved`.
- Reservations are used to temporarily allocate inventory.
- Idempotency keys help prevent duplicate checkout operations.
- Inventory movement records provide an audit trail.

---

## 📁 Project Structure

```text
FlashStock/
│
├── apps/
│   │
│   ├── api/
│   │   ├── migrations/
│   │   ├── tests/
│   │   └── src/
│   │       ├── db/
│   │       ├── middleware/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── types/
│   │       ├── validators/
│   │       └── index.ts
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── context/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── types/
│       │   └── main.tsx
│       ├── index.html
│       └── package.json
│
├── docs/
│   ├── FLASHSTOCK_DAY_01.md
│   ├── FLASHSTOCK_DAY_02.md
│   └── FLASHSTOCK_DAY_03.md
│
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Install:

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

### 3. Install dependencies

Install the root, backend and frontend dependencies:

```bash
npm install

npm --prefix apps/api install

npm --prefix apps/web install
```

### 4. Start the backend

From the project root:

Apply pending migrations to the **local** D1 database, then start the API:

```bash
npx wrangler d1 migrations apply flashstock-db --local --config apps/api/wrangler.jsonc
npm run dev:api
```

The local API script explicitly sets `ENVIRONMENT=development`, enabling the localhost origins used by the Vite proxy. Deployed Worker configuration defaults to `ENVIRONMENT=production`.

The migration command above is local-only. Review migrations before applying them to any remote database.

The local API will be available at:

```text
http://localhost:8787
```

### 5. Start the frontend

Open another terminal from the project root:

```bash
npm run dev:web
```

The frontend development server is configured to run at:

```text
http://localhost:3000
```

> **Database Note:** Local D1 development data is separate from the remote Cloudflare D1 database. Use the existing Wrangler configuration and migrations carefully. Never recreate the existing database or apply remote migrations without reviewing them first.

### Cloudflare deployment preparation

The API Worker serves the Vite production build from Workers Static Assets. `/api` requests are routed to Hono first; other missing assets use the SPA fallback for React Router refreshes. The existing `flashstock-db` D1 binding is preserved. Build before running Wrangler:

```bash
npm --prefix apps/web run build
npx wrangler deploy --config apps/api/wrangler.jsonc
```

Review [Cloudflare deployment instructions](docs/CLOUDFLARE_DEPLOYMENT.md) before deploying, especially the remote D1 migration history procedure. This project uses simulated payments and does not integrate a real payment gateway.

---

## 🔌 Backend API

The backend is organized into modular route groups.

| Module | Responsibility |
|---|---|
| Health | Backend and database health checks |
| Authentication | Registration, login and logout |
| Products | Product listing and management |
| Cart | Shopping cart operations |
| Checkout | Checkout processing |
| Orders | Order management |
| Inventory | Stock management |
| Reservations | Inventory reservations |
| Payments | Payment simulation |
| Flash Sales | Flash-sale operations |
| Admin | Administrative operations |
| Analytics | Sales and inventory analytics |

### Initial API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API information |
| GET | `/api/v1/health` | Backend health check |
| GET | `/api/v1/health/database` | Database connectivity check |
| GET | `/api/v1/products` | Retrieve active products |

Additional route groups have been added as the application develops. Refer to the backend source for the current endpoint definitions.

---

## 🧪 Testing

Automated backend tests have been added for important application modules.

Current test coverage areas include:

- Authentication.
- Product operations.
- Inventory management.
- Reservations.
- Checkout.
- Payments.
- Concurrency scenarios.

Run the suite with `npm test`. The concurrency test currently uses the repository's SQLite-backed D1 adapter; it does not independently verify hosted Cloudflare D1 behavior.

### Main Concurrency Test Scenario

```text
Initial inventory: 10 units

Concurrent purchase attempts: 100

Expected successful reservations: 10
Expected rejected reservations: 90

Expected final available stock: 0
Expected oversold quantity: 0
```

The goal is to verify inventory consistency under simultaneous purchase attempts rather than relying on frontend validation.

---

## 📈 Development Roadmap

### Completed Foundation

- [x] Project initialization.
- [x] Backend environment setup.
- [x] Cloudflare Workers configuration.
- [x] Cloudflare D1 database setup.
- [x] Initial database schema.
- [x] Drizzle ORM integration.
- [x] Hono API setup.
- [x] Backend health endpoints.
- [x] Initial product listing endpoint.

### Backend Development

- [x] Authentication services and routes.
- [x] Authentication middleware.
- [x] Role-based authorization middleware.
- [x] Rate-limiting middleware.
- [x] Product services and routes.
- [x] Shopping cart services and routes.
- [x] Inventory services and routes.
- [x] Reservation services and routes.
- [x] Checkout services and routes.
- [x] Order services and routes.
- [x] Payment simulation services and routes.
- [x] Flash-sale services and routes.
- [x] Analytics services and routes.
- [x] Backend automated test files.

### Frontend Development

- [x] React and Vite project foundation.
- [x] Shared customer components.
- [x] Authentication and cart context foundations.
- [x] Customer storefront, catalog, product, cart, checkout, and order pages.
- [x] Frontend API service foundation.
- [x] Frontend application bootstrap and routing.
- [x] Responsive landing page.
- [x] Frontend production build verification.
- [x] Cookie-based customer registration, login, and protected account routes.
- [x] Backend-synchronized cart and checkout/payment workflow.
- [x] Customer account, order history, and order detail pages.
- [x] Admin workspace foundations for products, inventory, orders, customers, sales, and analytics.
- [ ] Finish admin settings and richer analytics visualizations.

### Verification & Deployment

- [x] Verify authentication and checkout services with automated tests.
- [x] Verify reservation expiration/release and payment outcomes with automated tests.
- [x] Run the 100-attempt concurrency scenario against the SQLite test adapter.
- [ ] Verify concurrency guarantees against Cloudflare D1 itself.
- [x] Verify all automated backend tests.
- [ ] Fix remaining frontend integration issues.
- [ ] Complete security review.
- [ ] Production deployment.
- [ ] Public application URL.

---

## 📚 Development Documentation

Development progress is maintained in the `docs/` directory.

- [Day 1 — Project Foundation](docs/FLASHSTOCK_DAY_01.md)
- [Day 2 — Backend Development & Frontend Foundation](docs/FLASHSTOCK_DAY_02.md)
- [Day 3 — Frontend Application Bootstrap & Landing Page](docs/FLASHSTOCK_DAY_03.md)
- [Day 4 — Customer and Admin Integration](docs/FLASHSTOCK_DAY_04.md)
- [Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md)

---

## 👨‍💻 Author

**Harshith**

GitHub: [@Harshith-76](https://github.com/Harshith-76)

Repository: [FlashStock](https://github.com/Harshith-76/flashstock-project-2026)

---

*FlashStock is an ongoing engineering project focused on full-stack development, database design, inventory consistency, secure application architecture, and high-concurrency transaction handling.*
