# VoltMart — Flutter Mobile App Build Prompt

> Run this prompt **after** the VoltMart backend/API is live and reachable. The web app already exposes everything the mobile app needs; **no backend changes are required**. This app only consumes the existing versioned REST API.

---

## Context for the builder

Build a **Flutter (Dart) mobile app** for **VoltMart**, an electronics marketplace. The backend is an existing **API-first FastAPI service**. All endpoints are under the `/api` prefix and use **Bearer JWT** auth (token returned in the JSON body, sent as `Authorization: Bearer <token>`). Do **not** build a new backend — consume the live API.

- **Base URL**: provide via `--dart-define=API_BASE_URL=https://<host>` (never hardcode).
- **Auth token**: store securely with `flutter_secure_storage`; attach to every request via a Dio interceptor.
- **Design tokens**: fetch `GET /api/config` → `themes[activeTheme].colors / typography / radius`. Build the Flutter `ThemeData` from these tokens so brand styling matches the web app instead of duplicating it.

## Roles & which app to build first
Three roles exist: `customer`, `delivery_partner`, `admin`.
**Build the Delivery Partner app first** — it benefits most from native (GPS, camera, background location, push). Then the Customer shopping app. Admin stays web-only.

---

## Screens

### Delivery Partner app (Phase 1)
1. **Login** — email/password (`POST /api/auth/login`) or phone OTP (`POST /api/auth/otp/request` → `POST /api/auth/otp/verify`; OTP is returned in `debug_otp` in the mock backend).
2. **Assigned deliveries** — `GET /api/delivery/orders`. List with address, items, amount, COD/prepaid.
3. **Delivery detail + map** — show the delivery address on a native map; “Navigate” opens Google/Apple Maps. Status advance buttons: `PUT /api/orders/{id}/status` through `confirmed → picked_up → in_transit → delivered`.
4. **Proof of delivery** — camera capture on “Mark Delivered” (upload later when a media endpoint is added).
5. **Notifications** — poll `GET /api/notifications` (and wire FCM when push is added). Backend already fires an event on assignment/status change.

### Customer app (Phase 2)
1. **Home** — `GET /api/config` (active layout/theme) + `GET /api/products?sort=popular`, `?deal=1`, `GET /api/categories`.
2. **Catalog / search / filters** — `GET /api/products` params: `search, category, brand, sort (popular|price_low|price_high|rating|discount), deal, min_price, max_price, page, limit`.
3. **Product detail** — `GET /api/products/{id}` (returns `product` + `related`), plays `product.video` if present; **Ratings & Reviews** via `GET/POST /api/products/{id}/reviews`.
4. **Cart** — `GET/POST/PUT/DELETE /api/cart`, `POST /api/cart/apply-coupon`.
5. **Checkout** — `POST /api/orders` (payment_method `mock`/`cod`; Razorpay when enabled). Address form. Deep-link back on payment return.
6. **Orders + tracking** — `GET /api/orders`, `GET /api/orders/{id}` with status timeline.
7. **Notifications bell** — `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`.

---

## Deep-link URL patterns (configure in `AndroidManifest.xml` / `Info.plist`)
- `voltmart://product/{id}` → Product detail
- `voltmart://order/{id}` → Order tracking
- `voltmart://category/{slug}` → Catalog filtered by category
- `voltmart://cart` → Cart
- HTTPS App Links / Universal Links: `https://<host>/product/{id}`, `/order/{id}`

## Push notifications (when enabled)
- Register FCM token on login via a future `POST /api/devices` endpoint.
- Backend already emits notification events on order placed / confirmed / assigned / picked_up / in_transit / delivered — mirror those payloads to FCM. Tapping a push deep-links to the relevant order/product.

## Suggested packages
`dio`, `flutter_secure_storage`, `go_router` (with deep links), `flutter_riverpod` (or `bloc`), `google_maps_flutter` + `geolocator` (delivery), `firebase_messaging` (push), `cached_network_image`, `video_player` (product videos).

## Test credentials
- Admin: `demomaptesting@gmail.com` / `Admin@123`
- Customer: `customer@voltmart.com` / `Customer@123`
- Delivery: `partner@voltmart.com` / `Partner@123`
- Phone OTP: any number; OTP is in the API response `debug_otp` (mock).

## Non-negotiables
- No business logic in the app — everything via the versioned REST API.
- No hardcoded URLs/keys — use `--dart-define`.
- Theme entirely from `/api/config` design tokens.
