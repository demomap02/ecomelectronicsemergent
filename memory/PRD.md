# VoltMart — API-First Electronics Marketplace (PRD)

## Original Problem Statement
Build an API-first / headless electronics e-commerce web app. Backend exposes clean versioned REST endpoints with token-based (Bearer JWT) auth so a future Flutter app can consume the same API without a rewrite. No business logic trapped in the frontend. Theme/design tokens stored as structured JSON (served by backend) so native apps can reuse brand styling. Mobile-ready: OTP login, push-event-ready order lifecycle, Delivery Partner role. Merchandising density inspired by Flipkart/Noon. Deliverables: 5 distinct homepage layouts + 5 selectable themes (admin-switchable), full admin panel. (Flutter itself out of scope this pass.)

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). All routes under `/api`. Bearer JWT auth (token in JSON body, `Authorization: Bearer`). bcrypt password hashing. Design tokens (THEMES) + LAYOUTS served via `/api/config`.
- **Frontend**: React (CRA + craco), Tailwind, shadcn/ui, recharts, sonner. Theme tokens applied as CSS variables at runtime. React Context for Auth + Store (config/theme/layout/cart).
- **Auth roles**: customer, delivery_partner, admin.

## User Personas
- **Shopper**: browses dense catalog, filters/sorts, adds to cart, checks out (mock), tracks orders.
- **Admin (Store Owner)**: manages products/categories/coupons/users/orders, assigns delivery, switches homepage layout + theme, views analytics.
- **Delivery Partner**: sees assigned orders, advances delivery status.

## Core Requirements (static)
- API-first REST, token auth, JSON design tokens, mobile-ready lifecycle.
- 5 homepage layouts + 5 themes, admin-switchable.
- Full admin panel; delivery-partner flow; email/password + phone OTP auth.

## Implemented (2026-06)
- **Auth**: register/login (JWT+bcrypt), phone OTP (mock, `debug_otp`), `/auth/me`, role-based guards.
- **Catalog**: 50+ seeded electronics + 14 real ASW products (12 flashlights, AS-C603 air-cushion comb, AS-JC11 portable blender) with product demo videos. Filters (category/brand/price/search), sorts, pagination, related products.
- **5 Homepage layouts**: Mega Mall, Bento Showcase, Flash Frenzy, Category Pillar, Immersive Hero.
- **5 Themes**: Hyper Retail, Cyber Neon, Stark Swiss, Soft Pastel, Luxury Midnight (JSON design tokens → CSS vars).
- **Cart + Checkout**: persisted cart, stock-capped qty, coupons (VOLT10, MEGA25), mock/COD payment, order confirmation, stock decrement.
- **Orders**: customer order history with status timeline; delivery lifecycle placed→confirmed→picked_up→in_transit→delivered.
- **Admin panel**: Overview (analytics charts), Products CRUD, Orders + delivery assignment, Users + role change, Coupons, Categories, Appearance (theme+layout persistence).
- **Delivery dashboard**: assigned orders, status advancement.
- **Live theme/layout preview** FAB for shoppers; admin sets the store default.
- Verified: backend 68/68 pytest; frontend E2E purchase + admin + delivery flows.

## Backlog
- **P1**: Real Razorpay payment (currently mock, key gathering needed); push notifications; deep-link URL scheme doc for Flutter; OpenAPI export polish.
- **P2**: Login rate-limiting; atomic (findOneAndUpdate) stock decrement for concurrency; wishlist; product reviews; address book; banner CRUD in admin.
- **P3**: split server.py into modules; error/retry UI on listing failures.

## Test Credentials
- Admin: demomaptesting@gmail.com / Admin@123
- Customer: customer@voltmart.com / Customer@123
- Delivery: partner@voltmart.com / Partner@123
- Phone OTP: any number; OTP returned in API `debug_otp`.

## MOCKED
- Payments (mock/COD/Razorpay-disabled) — no real gateway.
- Phone OTP — no real SMS; OTP returned in the API response.
