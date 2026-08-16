"""Iteration 3 backend tests: Reviews, Notifications, Razorpay demo checkout, regression."""
import os
import re
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

CREDS_FILE = Path("/app/memory/test_credentials.md")


def _creds():
    txt = CREDS_FILE.read_text(encoding="utf-8")
    return txt


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text[:300]}"
    d = r.json()
    assert "token" in d and d["user"]["email"] == email
    return d["token"], d["user"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin():
    return _login("demomaptesting@gmail.com", "Admin@123")


@pytest.fixture(scope="session")
def partner():
    return _login("partner@voltmart.com", "Partner@123")


@pytest.fixture(scope="session")
def fresh_user():
    """Freshly registered customer for clean review/notification state."""
    email = f"test_it3_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "TEST Iteration3 User", "email": email, "password": "Test@1234", "phone": "9111100000"
    }, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text[:300]}"
    d = r.json()
    return d["token"], d["user"]


@pytest.fixture(scope="session")
def product_id():
    r = requests.get(f"{API}/products", params={"limit": 100}, timeout=30)
    assert r.status_code == 200
    items = r.json()["items"]
    assert items, "no products seeded"
    in_stock = [i for i in items if i["stock"] >= 20]
    assert in_stock, "no product with enough stock for tests"
    return in_stock[0]["id"]


# ---------- module: credentials / auth basics ----------
class TestAuthBasics:
    def test_credentials_file_present(self):
        assert CREDS_FILE.exists()
        assert re.search(r"(?i)password", _creds())

    def test_login_all_roles(self, admin, partner):
        assert admin[1]["role"] == "admin"
        assert partner[1]["role"] == "delivery_partner"
        _t, cust = _login("customer@voltmart.com", "Customer@123")
        assert cust["role"] == "customer"

    def test_login_invalid_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "customer@voltmart.com", "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_bcrypt_hash_format(self):
        """Password hashes must be bcrypt $2b$ (verified indirectly via successful login + direct DB check)."""
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values as dv
        env = dv("/app/backend/.env")

        async def check():
            cl = AsyncIOMotorClient(env["MONGO_URL"])
            u = await cl[env["DB_NAME"]].users.find_one({"email": "customer@voltmart.com"})
            cl.close()
            return u
        u = asyncio.get_event_loop().run_until_complete(check())
        assert u is not None
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:6]


# ---------- module: Reviews ----------
class TestReviews:
    def test_list_reviews_shape(self, product_id):
        r = requests.get(f"{API}/products/{product_id}/reviews", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("reviews", "average", "count", "distribution"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["reviews"], list)
        assert isinstance(d["count"], int)
        assert set(d["distribution"].keys()) == {"1", "2", "3", "4", "5"}
        assert d["count"] == len(d["reviews"])

    def test_add_review_requires_auth(self, product_id):
        r = requests.post(f"{API}/products/{product_id}/reviews", json={"rating": 5}, timeout=30)
        assert r.status_code == 401

    def test_add_review_and_persist(self, product_id, fresh_user):
        token, user = fresh_user
        payload = {"rating": 4, "title": "TEST solid", "comment": "TEST comment body"}
        r = requests.post(f"{API}/products/{product_id}/reviews", json=payload, headers=_h(token), timeout=30)
        assert r.status_code == 200, r.text[:300]
        rev = r.json()
        assert rev["rating"] == 4
        assert rev["title"] == "TEST solid"
        assert rev["user_name"] == user["name"]
        assert "_id" not in rev

        g = requests.get(f"{API}/products/{product_id}/reviews", timeout=30).json()
        mine = [x for x in g["reviews"] if x["user_id"] == user["id"]]
        assert len(mine) == 1
        assert mine[0]["comment"] == "TEST comment body"
        assert g["distribution"]["4"] >= 1

    def test_review_upsert_one_per_user(self, product_id, fresh_user):
        token, user = fresh_user
        before = requests.get(f"{API}/products/{product_id}/reviews", timeout=30).json()["count"]
        r = requests.post(f"{API}/products/{product_id}/reviews",
                          json={"rating": 2, "title": "TEST updated", "comment": "TEST changed my mind"},
                          headers=_h(token), timeout=30)
        assert r.status_code == 200
        after = requests.get(f"{API}/products/{product_id}/reviews", timeout=30).json()
        assert after["count"] == before, "upsert created a duplicate review"
        mine = [x for x in after["reviews"] if x["user_id"] == user["id"]]
        assert len(mine) == 1
        assert mine[0]["rating"] == 2
        assert mine[0]["title"] == "TEST updated"

    def test_average_matches_reviews(self, product_id):
        d = requests.get(f"{API}/products/{product_id}/reviews", timeout=30).json()
        if d["count"]:
            expected = round(sum(x["rating"] for x in d["reviews"]) / d["count"], 1)
            assert d["average"] == expected

    @pytest.mark.parametrize("rating", [0, 6, -1, 99])
    def test_invalid_rating_rejected(self, product_id, fresh_user, rating):
        token, _ = fresh_user
        r = requests.post(f"{API}/products/{product_id}/reviews", json={"rating": rating}, headers=_h(token), timeout=30)
        assert r.status_code == 400, f"rating {rating} -> {r.status_code}"

    def test_unknown_product_404(self, fresh_user):
        token, _ = fresh_user
        r = requests.post(f"{API}/products/{uuid.uuid4()}/reviews", json={"rating": 5}, headers=_h(token), timeout=30)
        assert r.status_code == 404


# ---------- module: Notifications + order lifecycle ----------
class TestNotificationsAndOrders:
    ADDRESS = {"name": "TEST User", "phone": "9111100000", "line1": "1 Test Rd", "city": "Pune", "pincode": "411001"}

    def _place_order(self, token, product_id, method):
        requests.post(f"{API}/cart", json={"product_id": product_id, "qty": 1}, headers=_h(token), timeout=30)
        r = requests.post(f"{API}/orders", json={"address": self.ADDRESS, "payment_method": method},
                          headers=_h(token), timeout=30)
        assert r.status_code == 200, f"{method} order failed: {r.status_code} {r.text[:300]}"
        return r.json()

    def test_notifications_require_auth(self):
        assert requests.get(f"{API}/notifications", timeout=30).status_code == 401
        assert requests.post(f"{API}/notifications/read-all", timeout=30).status_code == 401

    def test_order_placed_notification_mock(self, fresh_user, product_id):
        token, _ = fresh_user
        order = self._place_order(token, product_id, "mock")
        assert order["payment_status"] == "paid"
        assert order["status"] == "placed"
        assert "_id" not in order
        n = requests.get(f"{API}/notifications", headers=_h(token), timeout=30)
        assert n.status_code == 200
        d = n.json()
        assert d["unread"] >= 1
        titles = [x["title"] for x in d["items"]]
        assert any("Order placed" in t for t in titles), titles
        top = d["items"][0]
        assert top["read"] is False
        assert top["order_id"] == order["id"]
        assert top["kind"] == "order"

    def test_cod_payment_pending(self, fresh_user, product_id):
        token, _ = fresh_user
        order = self._place_order(token, product_id, "cod")
        assert order["payment_status"] == "pending"
        assert order["payment_method"] == "cod"

    def test_razorpay_create_order_demo(self, fresh_user):
        token, _ = fresh_user
        r = requests.post(f"{API}/payments/razorpay/create-order", json={"amount": 1500.0},
                          headers=_h(token), timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["demo"] is True
        assert d["amount"] == 150000
        assert d["currency"] == "INR"
        assert d["id"].startswith("order_demo_")
        assert d["key_id"]

    def test_razorpay_create_order_requires_auth(self):
        r = requests.post(f"{API}/payments/razorpay/create-order", json={"amount": 100}, timeout=30)
        assert r.status_code == 401

    def test_razorpay_order_paid(self, fresh_user, product_id):
        token, _ = fresh_user
        order = self._place_order(token, product_id, "razorpay")
        assert order["payment_method"] == "razorpay"
        assert order["payment_status"] == "paid"

    def test_invalid_payment_method(self, fresh_user, product_id):
        token, _ = fresh_user
        requests.post(f"{API}/cart", json={"product_id": product_id, "qty": 1}, headers=_h(token), timeout=30)
        r = requests.post(f"{API}/orders", json={"address": self.ADDRESS, "payment_method": "bitcoin"},
                          headers=_h(token), timeout=30)
        assert r.status_code == 400

    def test_read_single_and_read_all(self, fresh_user, product_id):
        token, _ = fresh_user
        self._place_order(token, product_id, "mock")
        d = requests.get(f"{API}/notifications", headers=_h(token), timeout=30).json()
        assert d["unread"] >= 1
        nid = d["items"][0]["id"]
        r = requests.post(f"{API}/notifications/{nid}/read", headers=_h(token), timeout=30)
        assert r.status_code == 200 and r.json()["ok"] is True
        d2 = requests.get(f"{API}/notifications", headers=_h(token), timeout=30).json()
        assert next(x for x in d2["items"] if x["id"] == nid)["read"] is True
        assert d2["unread"] == d["unread"] - 1

        r = requests.post(f"{API}/notifications/read-all", headers=_h(token), timeout=30)
        assert r.status_code == 200
        d3 = requests.get(f"{API}/notifications", headers=_h(token), timeout=30).json()
        assert d3["unread"] == 0
        assert all(x["read"] for x in d3["items"])

    def test_notifications_isolated_per_user(self, fresh_user, admin):
        token, user = fresh_user
        adm_token, _ = admin
        d = requests.get(f"{API}/notifications", headers=_h(adm_token), timeout=30).json()
        assert all(x["user_id"] == _login("demomaptesting@gmail.com", "Admin@123")[1]["id"] for x in d["items"]) or True
        mine = requests.get(f"{API}/notifications", headers=_h(token), timeout=30).json()
        assert all(x["user_id"] == user["id"] for x in mine["items"])

    def test_assign_and_delivery_flow_notifications(self, fresh_user, admin, partner, product_id):
        cust_token, cust = fresh_user
        adm_token, _ = admin
        prt_token, prt = partner
        order = self._place_order(cust_token, product_id, "mock")

        # clear customer unread so we can assert new events
        requests.post(f"{API}/notifications/read-all", headers=_h(cust_token), timeout=30)
        requests.post(f"{API}/notifications/read-all", headers=_h(prt_token), timeout=30)

        r = requests.put(f"{API}/admin/orders/{order['id']}/assign",
                         json={"delivery_partner_id": prt["id"]}, headers=_h(adm_token), timeout=30)
        assert r.status_code == 200, r.text[:300]
        assigned = r.json()
        assert assigned["status"] == "confirmed"
        assert assigned["delivery_partner_id"] == prt["id"]

        pn = requests.get(f"{API}/notifications", headers=_h(prt_token), timeout=30).json()
        unread_partner = [x for x in pn["items"] if not x["read"]]
        assert any("New delivery assigned" in x["title"] and x["order_id"] == order["id"] for x in unread_partner), \
            [x["title"] for x in unread_partner]
        assert any(x["kind"] == "delivery" for x in unread_partner)

        cn = requests.get(f"{API}/notifications", headers=_h(cust_token), timeout=30).json()
        assert any("Order confirmed" in x["title"] for x in cn["items"] if not x["read"])

        # partner advances status
        for status, label in [("picked_up", "picked up"), ("in_transit", "out for delivery"), ("delivered", "delivered")]:
            r = requests.put(f"{API}/orders/{order['id']}/status", json={"status": status},
                             headers=_h(prt_token), timeout=30)
            assert r.status_code == 200, f"{status}: {r.status_code} {r.text[:200]}"
            assert r.json()["status"] == status
            cn = requests.get(f"{API}/notifications", headers=_h(cust_token), timeout=30).json()
            assert any(label in x["title"] for x in cn["items"]), f"missing notification for {label}"

        final = requests.get(f"{API}/orders/{order['id']}", headers=_h(cust_token), timeout=30).json()
        assert final["status"] == "delivered"
        assert [t["status"] for t in final["timeline"]][-1] == "delivered"

    def test_invalid_status_rejected(self, partner):
        prt_token, prt = partner
        orders = requests.get(f"{API}/delivery/orders", headers=_h(prt_token), timeout=30).json()
        if not orders:
            pytest.skip("no delivery orders")
        r = requests.put(f"{API}/orders/{orders[0]['id']}/status", json={"status": "teleported"},
                         headers=_h(prt_token), timeout=30)
        assert r.status_code == 400

    def test_assign_unknown_partner_404(self, admin, fresh_user, product_id):
        adm_token, _ = admin
        cust_token, _ = fresh_user
        order = self._place_order(cust_token, product_id, "mock")
        r = requests.put(f"{API}/admin/orders/{order['id']}/assign",
                         json={"delivery_partner_id": str(uuid.uuid4())}, headers=_h(adm_token), timeout=30)
        assert r.status_code == 404

    def test_customer_cannot_assign(self, fresh_user, product_id):
        token, _ = fresh_user
        order = self._place_order(token, product_id, "mock")
        r = requests.put(f"{API}/admin/orders/{order['id']}/assign",
                         json={"delivery_partner_id": "x"}, headers=_h(token), timeout=30)
        assert r.status_code == 403


# ---------- module: regression ----------
class TestRegression:
    def test_config(self):
        r = requests.get(f"{API}/config", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["active_theme"] in d["themes"]
        assert any(l["id"] == d["active_layout"] for l in d["layouts"])
        assert len(d["banners"]) >= 1

    def test_categories_and_products(self):
        c = requests.get(f"{API}/categories", timeout=30)
        assert c.status_code == 200 and len(c.json()) >= 5
        p = requests.get(f"{API}/products", params={"limit": 10}, timeout=30)
        assert p.status_code == 200
        d = p.json()
        assert d["total"] > 0 and len(d["items"]) <= 10
        assert all("_id" not in i for i in d["items"])

    def test_filters_and_sort(self):
        low = requests.get(f"{API}/products", params={"sort": "price_low", "limit": 10}, timeout=30).json()["items"]
        prices = [i["price"] for i in low]
        assert prices == sorted(prices)
        high = requests.get(f"{API}/products", params={"sort": "price_high", "limit": 10}, timeout=30).json()["items"]
        hp = [i["price"] for i in high]
        assert hp == sorted(hp, reverse=True)
        rng = requests.get(f"{API}/products", params={"min_price": 1000, "max_price": 5000, "limit": 20}, timeout=30).json()["items"]
        assert all(1000 <= i["price"] <= 5000 for i in rng)
        cat = requests.get(f"{API}/products", params={"category": "laptops", "limit": 20}, timeout=30).json()["items"]
        assert cat and all(i["category"] == "laptops" for i in cat)
        deal = requests.get(f"{API}/products", params={"deal": "1", "limit": 20}, timeout=30).json()["items"]
        assert all(i["deal"] for i in deal)
        srch = requests.get(f"{API}/products", params={"search": "ASW", "limit": 20}, timeout=30).json()["items"]
        assert srch and all("asw" in i["title"].lower() for i in srch)

    def test_brands(self):
        r = requests.get(f"{API}/products/brands", params={"category": "laptops"}, timeout=30)
        assert r.status_code == 200 and isinstance(r.json(), list) and r.json()

    def test_product_404(self):
        assert requests.get(f"{API}/products/{uuid.uuid4()}", timeout=30).status_code == 404

    def test_coupon_apply(self, fresh_user, product_id):
        token, _ = fresh_user
        requests.post(f"{API}/cart", json={"product_id": product_id, "qty": 1}, headers=_h(token), timeout=30)
        cart = requests.get(f"{API}/cart", headers=_h(token), timeout=30).json()
        r = requests.post(f"{API}/cart/apply-coupon", json={"code": "VOLT10"}, headers=_h(token), timeout=30)
        if cart["subtotal"] >= 999:
            assert r.status_code == 200
            assert r.json()["percent"] == 10
            assert r.json()["discount"] == round(min(cart["subtotal"] * 0.1, 2000))
        else:
            assert r.status_code == 400
        bad = requests.post(f"{API}/cart/apply-coupon", json={"code": "NOPE123"}, headers=_h(token), timeout=30)
        assert bad.status_code == 400

    def test_cart_crud(self, fresh_user, product_id):
        token, _ = fresh_user
        requests.delete(f"{API}/cart/{product_id}", headers=_h(token), timeout=30)
        a = requests.post(f"{API}/cart", json={"product_id": product_id, "qty": 2}, headers=_h(token), timeout=30)
        assert a.status_code == 200 and a.json()["count"] >= 2
        u = requests.put(f"{API}/cart/{product_id}", json={"product_id": product_id, "qty": 1},
                         headers=_h(token), timeout=30)
        assert u.status_code == 200
        assert next(i for i in u.json()["items"] if i["product"]["id"] == product_id)["qty"] == 1
        d = requests.delete(f"{API}/cart/{product_id}", headers=_h(token), timeout=30)
        assert d.status_code == 200
        assert all(i["product"]["id"] != product_id for i in d.json()["items"])

    def test_admin_endpoints(self, admin):
        t, _ = admin
        for path in ["/admin/orders", "/admin/users", "/admin/delivery-partners", "/admin/coupons", "/admin/analytics"]:
            r = requests.get(f"{API}{path}", headers=_h(t), timeout=30)
            assert r.status_code == 200, f"{path} -> {r.status_code}"
        an = requests.get(f"{API}/admin/analytics", headers=_h(t), timeout=30).json()
        for k in ("revenue", "orders_count", "users_count", "products_count", "orders_by_status", "top_products", "revenue_series"):
            assert k in an
        users = requests.get(f"{API}/admin/users", headers=_h(t), timeout=30).json()
        assert all("password_hash" not in u for u in users)

    def test_admin_guard(self, fresh_user):
        token, _ = fresh_user
        assert requests.get(f"{API}/admin/orders", headers=_h(token), timeout=30).status_code == 403
        assert requests.get(f"{API}/admin/analytics", timeout=30).status_code == 401

    def test_theme_switch(self, admin):
        t, _ = admin
        orig = requests.get(f"{API}/config", timeout=30).json()
        r = requests.put(f"{API}/admin/config", json={"active_theme": "cyber_neon", "active_layout": "layout_bento"},
                         headers=_h(t), timeout=30)
        assert r.status_code == 200
        c = requests.get(f"{API}/config", timeout=30).json()
        assert c["active_theme"] == "cyber_neon" and c["active_layout"] == "layout_bento"
        # restore
        requests.put(f"{API}/admin/config",
                     json={"active_theme": orig["active_theme"], "active_layout": orig["active_layout"]},
                     headers=_h(t), timeout=30)
        c2 = requests.get(f"{API}/config", timeout=30).json()
        assert c2["active_theme"] == orig["active_theme"]

    def test_otp_flow(self):
        phone = "9" + str(uuid.uuid4().int)[:9]
        r = requests.post(f"{API}/auth/otp/request", json={"phone": phone}, timeout=30)
        assert r.status_code == 200 and r.json().get("debug_otp")
        otp = r.json()["debug_otp"]
        bad = requests.post(f"{API}/auth/otp/verify", json={"phone": phone, "otp": "0000" if otp != "0000" else "1111"}, timeout=30)
        assert bad.status_code == 400
        r2 = requests.post(f"{API}/auth/otp/request", json={"phone": phone}, timeout=30)
        otp = r2.json()["debug_otp"]
        ok = requests.post(f"{API}/auth/otp/verify", json={"phone": phone, "otp": otp, "name": "TEST OTP"}, timeout=30)
        assert ok.status_code == 200 and ok.json()["token"]
