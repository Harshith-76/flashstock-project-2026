# FlashStock — Day 4 Implementation Report

**Date:** 20 November 2026  
**Focus:** Fixing integration gaps and completing the customer and admin application foundations

## Work completed

### Local API and D1

- Exercised `GET /api/v1/products`, `GET /api/v1/flash-sales/active`, and `GET /api/v1/health/database` through the local Worker after migration.
- Product listing returned six products from local D1. The flash-sale endpoint returned a valid empty result because no sale is currently active. Database health reported the configured `flashstock-db` binding and 16 tables.
- The previously reported product and flash-sale HTTP 500s did not reproduce in this local setup. Their earlier cause could not be confirmed from the current database state.
- Applied migrations `0002` through `0005` to local D1 only. The new migrations link source carts to orders, return flash-sale quota on release, and persist checkout shipping addresses. Existing product rows and stock were preserved. No remote migration or deployment was performed.
- Added `order_carts` to retain cart contents while an order is awaiting payment, and a flash-sale reference on reservation items so a failed or expired reservation returns its allocated sale quota.
- Added a one-minute Worker cron handler for stale reservation release. Wrangler does not trigger this automatically during local development; it can be invoked manually as documented by Wrangler.

### Backend fixes

- Public registration no longer accepts an administrator role. Registration and login rely on HttpOnly cookies; the frontend no longer stores session tokens in local storage.
- Cookie `Secure` follows the request protocol, CORS is limited to the local Vite origins, and unhandled server errors return a generic 500 response.
- Fixed cart clearing to delete by `cart_id`. Added stock checks when adding or increasing cart quantities.
- Checkout validates that a submitted cart snapshot matches the user's active cart. Cart items are removed only after successful payment; failed payments leave them available for another checkout.
- Added order ownership checks for payment and reservation reads/actions, and restricted reservation-expiry sweeps to administrators.
- Normalized ISO timestamps in SQLite expiry and flash-sale comparisons.
- Added popularity sorting, inventory adjustment notes, and guarded order-status transitions. Admin cancellation releases an active reservation.

### Frontend additions

- Added sign-in and registration pages, protected customer routes, account overview, order history, and individual order details.
- Added an admin workspace for overview, product create/edit/archive, inventory adjustment, order status, customer records, flash-sale management, and database-backed analytics.
- Connected landing-page Add to Cart controls and removed demo products/offers from the live storefront presentation. API failures and empty product/sale results now have visible states.
- Added retry/error states to catalog/product loading and cart mutation feedback. Corrected the landing navigation breakpoint and category links.

## Verification

| Check | Result |
|---|---|
| `npm test` | Passed: 31 tests across 7 suites |
| 100 simultaneous reservation attempts for 10 units | Passed: exactly 10 accepted, 90 rejected, with no oversell in the SQLite test adapter |
| Wrangler local Worker/D1 stress run | Passed twice: 100 concurrent checkouts produced 10 accepted, 90 rejected; before release inventory was 10 on hand / 10 reserved / 0 available; after simulated failures it returned to 10 / 0 / 10 |
| `npm --prefix apps/web run build` | Passed: TypeScript check and Vite production build |
| API TypeScript check | Passed: API-local TypeScript compiler with `--noEmit` |
| Local API products endpoint | Passed: six database-backed product records returned |
| Local API active flash-sales endpoint | Passed: valid response with zero active sales |
| Local D1 database health | Passed: connected to `flashstock-db` |

The automated concurrency suite uses the repository's SQLite-backed D1 adapter. The separate Worker stress run used a fresh, isolated local D1 database and real concurrent HTTP checkout requests. Neither test proves behavior on Cloudflare's hosted D1 service.

## Remaining work and limits

- No browser-driven end-to-end suite was added for registration through successful checkout.
- The admin settings screen is informational, product images are managed by URL rather than upload, and analytics are not yet presented as charts.
- The local seed script remains an existing untracked file and was not modified.
- Cloudflare D1 remote concurrency, production CORS origins, production cookie settings, and deployment still require verification in the deployment environment. No deployment was attempted.
- The previous HTTP 500s were not reproducible, so this report does not claim a confirmed historical root cause.
