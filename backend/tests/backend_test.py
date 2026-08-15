"""VoltMart backend API regression tests (auth, config, catalog, cart, orders, admin, delivery)."""
import os
import uuid
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE = base_url.rstrip("/") + "/api"

ADMIN = {"email": "demomaptesting@gmail.com", "password": "Admin@123"}
CUSTOMER = {"email": "customer@voltmart.com", "password": "Customer@123"}
PARTNER = {"email": "partner@voltmart.com", "password": "Partner@123"}


def login(creds):
    r = requests.post(f"{BASE}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text[:300]}"
    d = r.json()
    assert "token" in d and d["token"]
    return d


def hdr(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_tok():
    return login(ADMIN)["token"]


@pytest.fixture(scope="session")
def cust_tok():
    return login(CUSTOMER)["token"]


@pytest.fixture(scope="session")
def partner():
    return login(PARTNER)


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login_role(self):
        d = login(ADMIN)
        assert d["user"]["role"] == "admin"
        assert d["user"]["email"] == ADMIN["email"]

    def test_me(self, admin_tok):
        r = requests.get(f"{BASE}/auth/me", headers=hdr(admin_tok), timeout=30)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_no_token(self):
        r = requests.get(f"{BASE}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_bad_token(self):
        r = requests.get(f"{BASE}/auth/me", headers=hdr("garbage"), timeout=30)
        assert r.status_code == 401

    def test_bad_password(self):
        r = requests.post(f"{BASE}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_register_new_customer(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE}/auth/register", json={
            "name": "TEST User", "email": email, "password": "Test@1234", "phone": "9111111111"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["user"]["email"] == email.lower()  # backend normalises email to lowercase
        assert d["user"]["role"] == "customer"
        me = requests.get(f"{BASE}/auth/me", headers=hdr(d["token"]), timeout=30)
        assert me.status_code == 200 and me.json()["email"] == email.lower()
        # duplicate
        r2 = requests.post(f"{BASE}/auth/register", json={
            "name": "TEST User", "email": email, "password": "Test@1234"}, timeout=30)
        assert r2.status_code == 400

    def test_register_role_escalation_blocked(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE}/auth/register", json={
            "name": "TEST Esc", "email": email, "password": "Test@1234", "role": "admin"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "customer"

    def test_otp_flow(self):
        phone = f"98{uuid.uuid4().int % 100000000:08d}"
        r = requests.post(f"{BASE}/auth/otp/request", json={"phone": phone}, timeout=30)
        assert r.status_code == 200
        otp = r.json().get("debug_otp")
        assert otp and len(otp) == 4
        bad = requests.post(f"{BASE}/auth/otp/verify", json={"phone": phone, "otp": "0000" if otp != "0000" else "1111"}, timeout=30)
        assert bad.status_code == 400
        r2 = requests.post(f"{BASE}/auth/otp/request", json={"phone": phone}, timeout=30)
        otp = r2.json()["debug_otp"]
        v = requests.post(f"{BASE}/auth/otp/verify", json={"phone": phone, "otp": otp, "name": "TEST Phone"}, timeout=30)
        assert v.status_code == 200, v.text[:300]
        d = v.json()
        assert d["user"]["phone"] == phone and d["token"]
        me = requests.get(f"{BASE}/auth/me", headers=hdr(d["token"]), timeout=30)
        assert me.status_code == 200

    def test_bcrypt_hash_not_exposed(self, admin_tok):
        r = requests.get(f"{BASE}/admin/users", headers=hdr(admin_tok), timeout=30)
        assert r.status_code == 200
        assert all("password_hash" not in u and "_id" not in u for u in r.json())


# ---------------- Config ----------------
class TestConfig:
    def test_config(self):
        r = requests.get(f"{BASE}/config", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["active_layout"] and d["active_theme"]
        assert len(d["themes"]) == 5, d["themes"].keys()
        assert len(d["layouts"]) == 5
        for t in d["themes"].values():
            assert {"colors", "typography", "radius"} <= set(t)

    def test_admin_config_switch(self, admin_tok):
        orig = requests.get(f"{BASE}/config", timeout=30).json()
        r = requests.put(f"{BASE}/admin/config", headers=hdr(admin_tok),
                         json={"active_layout": "layout_bento", "active_theme": "cyber_neon"}, timeout=30)
        assert r.status_code == 200
        g = requests.get(f"{BASE}/config", timeout=30).json()
        assert g["active_layout"] == "layout_bento" and g["active_theme"] == "cyber_neon"
        requests.put(f"{BASE}/admin/config", headers=hdr(admin_tok),
                     json={"active_layout": orig["active_layout"], "active_theme": orig["active_theme"]}, timeout=30)

    def test_config_requires_admin(self, cust_tok):
        r = requests.put(f"{BASE}/admin/config", headers=hdr(cust_tok), json={"active_theme": "cyber_neon"}, timeout=30)
        assert r.status_code == 403


# ---------------- Catalog ----------------
class TestCatalog:
    def test_list(self):
        r = requests.get(f"{BASE}/products", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] > 0 and len(d["items"]) > 0
        assert all("_id" not in i for i in d["items"])

    def test_pagination(self):
        p1 = requests.get(f"{BASE}/products?page=1&limit=5", timeout=30).json()
        p2 = requests.get(f"{BASE}/products?page=2&limit=5", timeout=30).json()
        assert len(p1["items"]) == 5 and len(p2["items"]) == 5
        assert {i["id"] for i in p1["items"]}.isdisjoint({i["id"] for i in p2["items"]})

    def test_search(self):
        d = requests.get(f"{BASE}/products?search=flashlight", timeout=30).json()
        assert d["total"] > 0
        assert all("flashlight" in i["title"].lower() for i in d["items"])

    def test_category_filter(self):
        d = requests.get(f"{BASE}/products?category=flashlights&limit=50", timeout=30).json()
        assert d["total"] == 12, f"expected 12 flashlights, got {d['total']}"
        assert all(i["category"] == "flashlights" for i in d["items"])

    def test_brand_filter_and_brands_endpoint(self):
        brands = requests.get(f"{BASE}/products/brands?category=flashlights", timeout=30)
        assert brands.status_code == 200
        assert "ASW" in brands.json()
        d = requests.get(f"{BASE}/products?brand=ASW&limit=50", timeout=30).json()
        assert d["total"] == 14, f"expected 14 ASW products, got {d['total']}"
        assert all(i["brand"] == "ASW" for i in d["items"])

    @pytest.mark.parametrize("sort,key,rev", [
        ("price_low", "price", False), ("price_high", "price", True),
        ("rating", "rating", True), ("discount", "discount_pct", True)])
    def test_sorting(self, sort, key, rev):
        items = requests.get(f"{BASE}/products?sort={sort}&limit=20", timeout=30).json()["items"]
        vals = [i.get(key, 0) for i in items]
        assert vals == sorted(vals, reverse=rev), f"{sort} not sorted: {vals}"

    def test_price_range(self):
        d = requests.get(f"{BASE}/products?min_price=500&max_price=1500&limit=50", timeout=30).json()
        assert d["total"] > 0
        assert all(500 <= i["price"] <= 1500 for i in d["items"])

    def test_detail_and_related(self):
        pid = requests.get(f"{BASE}/products?limit=1", timeout=30).json()["items"][0]["id"]
        r = requests.get(f"{BASE}/products/{pid}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["product"]["id"] == pid
        assert isinstance(d["related"], list)
        assert all(x["id"] != pid for x in d["related"])

    def test_detail_404(self):
        r = requests.get(f"{BASE}/products/{uuid.uuid4()}", timeout=30)
        assert r.status_code == 404

    def test_videos_present(self):
        asw = requests.get(f"{BASE}/products?brand=ASW&limit=50", timeout=30).json()["items"]
        with_video = {p["title"]: p.get("video") for p in asw if p.get("video")}
        assert any("AS-9509" in t for t in with_video), with_video
        assert any("Comb" in t or "comb" in t for t in with_video), with_video
        assert any("Blender" in t for t in with_video), with_video
        for t, v in with_video.items():
            assert v.endswith(".mp4"), (t, v)

    def test_asw_special_categories(self):
        g = requests.get(f"{BASE}/products?category=grooming&limit=10", timeout=30).json()
        k = requests.get(f"{BASE}/products?category=kitchen&limit=10", timeout=30).json()
        assert g["total"] == 1 and k["total"] == 1

    def test_categories_list(self):
        r = requests.get(f"{BASE}/categories", timeout=30)
        assert r.status_code == 200
        slugs = {c["slug"] for c in r.json()}
        assert {"flashlights", "grooming", "kitchen"} <= slugs


# ---------------- Cart ----------------
class TestCart:
    def test_cart_requires_auth(self):
        assert requests.get(f"{BASE}/cart", timeout=30).status_code == 401

    def test_cart_crud_and_coupons(self, cust_tok):
        h = hdr(cust_tok)
        # clean slate
        cart = requests.get(f"{BASE}/cart", headers=h, timeout=30).json()
        for it in cart["items"]:
            requests.delete(f"{BASE}/cart/{it['product']['id']}", headers=h, timeout=30)
        prods = requests.get(f"{BASE}/products?category=flashlights&sort=price_low&limit=5", timeout=30).json()["items"]
        p = prods[0]
        r = requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 2}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 2 and d["subtotal"] == p["price"] * 2
        # add same product again merges
        d = requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 1}, timeout=30).json()
        assert d["count"] == 3
        # update qty
        d = requests.put(f"{BASE}/cart/{p['id']}", headers=h, json={"product_id": p["id"], "qty": 1}, timeout=30).json()
        assert d["count"] == 1 and d["subtotal"] == p["price"]
        # persistence
        d2 = requests.get(f"{BASE}/cart", headers=h, timeout=30).json()
        assert d2["count"] == 1
        # coupon min-order rejection (subtotal small)
        if p["price"] < 999:
            bad = requests.post(f"{BASE}/cart/apply-coupon", headers=h, json={"code": "VOLT10"}, timeout=30)
            assert bad.status_code == 400
        # invalid coupon
        assert requests.post(f"{BASE}/cart/apply-coupon", headers=h, json={"code": "NOPE"}, timeout=30).status_code == 400
        # bump subtotal above 4999
        requests.put(f"{BASE}/cart/{p['id']}", headers=h, json={"product_id": p["id"], "qty": 20}, timeout=30)
        sub = requests.get(f"{BASE}/cart", headers=h, timeout=30).json()["subtotal"]
        assert sub >= 4999
        v = requests.post(f"{BASE}/cart/apply-coupon", headers=h, json={"code": "VOLT10"}, timeout=30)
        assert v.status_code == 200 and v.json()["percent"] == 10
        m = requests.post(f"{BASE}/cart/apply-coupon", headers=h, json={"code": "MEGA25"}, timeout=30)
        assert m.status_code == 200 and m.json()["percent"] == 25
        assert m.json()["discount"] == min(round(sub * 0.25), 5000)
        # remove
        d = requests.delete(f"{BASE}/cart/{p['id']}", headers=h, timeout=30).json()
        assert d["count"] == 0 and d["items"] == []


# ---------------- Orders / checkout ----------------
ADDRESS = {"name": "TEST Riya", "phone": "9000000002", "line1": "12 Test St", "city": "Pune", "state": "MH", "pincode": "411001"}


class TestOrders:
    def test_empty_cart_rejected(self, cust_tok):
        h = hdr(cust_tok)
        cart = requests.get(f"{BASE}/cart", headers=h, timeout=30).json()
        for it in cart["items"]:
            requests.delete(f"{BASE}/cart/{it['product']['id']}", headers=h, timeout=30)
        r = requests.post(f"{BASE}/orders", headers=h, json={"address": ADDRESS, "payment_method": "mock"}, timeout=30)
        assert r.status_code == 400

    def test_checkout_flow(self, cust_tok):
        h = hdr(cust_tok)
        p = requests.get(f"{BASE}/products?category=flashlights&sort=price_high&limit=1", timeout=30).json()["items"][0]
        requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 4}, timeout=30)
        sub = requests.get(f"{BASE}/cart", headers=h, timeout=30).json()["subtotal"]
        r = requests.post(f"{BASE}/orders", headers=h,
                          json={"address": ADDRESS, "payment_method": "mock", "coupon": "MEGA25"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        o = r.json()
        assert o["payment_status"] == "paid" and o["status"] == "placed"
        assert o["coupon"] == "MEGA25" and o["discount"] > 0
        assert o["subtotal"] == sub
        assert o["total"] == round(sub - o["discount"] + o["shipping"])
        assert o["order_no"].startswith("VM")
        # cart cleared
        assert requests.get(f"{BASE}/cart", headers=h, timeout=30).json()["count"] == 0
        # listed
        orders = requests.get(f"{BASE}/orders", headers=h, timeout=30).json()
        assert any(x["id"] == o["id"] for x in orders)
        # detail
        g = requests.get(f"{BASE}/orders/{o['id']}", headers=h, timeout=30)
        assert g.status_code == 200 and g.json()["total"] == o["total"]
        pytest.order_id = o["id"]

    def test_cod_payment_pending(self, cust_tok):
        h = hdr(cust_tok)
        p = requests.get(f"{BASE}/products?category=flashlights&limit=1", timeout=30).json()["items"][0]
        requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 1}, timeout=30)
        r = requests.post(f"{BASE}/orders", headers=h, json={"address": ADDRESS, "payment_method": "cod"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["payment_status"] == "pending"

    def test_other_user_order_forbidden(self, cust_tok):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        tok = requests.post(f"{BASE}/auth/register", json={"name": "TEST Other", "email": email, "password": "Test@1234"}, timeout=30).json()["token"]
        oid = getattr(pytest, "order_id", None)
        assert oid, "order id from checkout test missing"
        r = requests.get(f"{BASE}/orders/{oid}", headers=hdr(tok), timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"


# ---------------- Admin ----------------
class TestAdmin:
    def test_non_admin_blocked(self, cust_tok):
        h = hdr(cust_tok)
        for method, path in [("get", "/admin/orders"), ("get", "/admin/users"), ("get", "/admin/analytics"),
                             ("get", "/admin/coupons"), ("get", "/admin/delivery-partners")]:
            r = getattr(requests, method)(f"{BASE}{path}", headers=h, timeout=30)
            assert r.status_code == 403, f"{path} -> {r.status_code}"
        assert requests.post(f"{BASE}/admin/products", headers=h, json={
            "title": "x", "brand": "x", "category": "x", "price": 1, "mrp": 2}, timeout=30).status_code == 403
        assert requests.get(f"{BASE}/admin/orders", timeout=30).status_code == 401

    def test_product_crud(self, admin_tok):
        h = hdr(admin_tok)
        payload = {"title": "TEST_Widget", "brand": "TESTBRAND", "category": "flashlights",
                   "price": 500.0, "mrp": 1000.0, "stock": 5, "description": "test",
                   "images": ["https://example.com/a.jpg"]}
        c = requests.post(f"{BASE}/admin/products", headers=h, json=payload, timeout=30)
        assert c.status_code == 200, c.text[:300]
        p = c.json()
        assert p["discount_pct"] == 50 and "_id" not in p
        pid = p["id"]
        g = requests.get(f"{BASE}/products/{pid}", timeout=30)
        assert g.status_code == 200 and g.json()["product"]["title"] == "TEST_Widget"
        u = requests.put(f"{BASE}/admin/products/{pid}", headers=h, json={**payload, "title": "TEST_Widget2", "price": 800.0}, timeout=30)
        assert u.status_code == 200 and u.json()["title"] == "TEST_Widget2"
        assert requests.get(f"{BASE}/products/{pid}", timeout=30).json()["product"]["price"] == 800.0
        d = requests.delete(f"{BASE}/admin/products/{pid}", headers=h, timeout=30)
        assert d.status_code == 200
        assert requests.get(f"{BASE}/products/{pid}", timeout=30).status_code == 404

    def test_category_crud(self, admin_tok):
        h = hdr(admin_tok)
        c = requests.post(f"{BASE}/admin/categories", headers=h,
                          json={"name": "TEST_Cat", "slug": "test-cat", "icon": "Cpu"}, timeout=30)
        assert c.status_code == 200
        cid = c.json()["id"]
        assert any(x["slug"] == "test-cat" for x in requests.get(f"{BASE}/categories", timeout=30).json())
        assert requests.delete(f"{BASE}/admin/categories/{cid}", headers=h, timeout=30).status_code == 200
        assert not any(x["slug"] == "test-cat" for x in requests.get(f"{BASE}/categories", timeout=30).json())

    def test_coupon_crud(self, admin_tok):
        h = hdr(admin_tok)
        c = requests.post(f"{BASE}/admin/coupons", headers=h,
                          json={"code": "test50", "percent": 50, "max_discount": 100, "min_order": 10}, timeout=30)
        assert c.status_code == 200 and c.json()["code"] == "TEST50"
        cid = c.json()["id"]
        assert any(x["code"] == "TEST50" for x in requests.get(f"{BASE}/admin/coupons", headers=h, timeout=30).json())
        assert any(x["code"] == "TEST50" for x in requests.get(f"{BASE}/coupons", timeout=30).json())
        assert requests.delete(f"{BASE}/admin/coupons/{cid}", headers=h, timeout=30).status_code == 200
        assert not any(x["code"] == "TEST50" for x in requests.get(f"{BASE}/admin/coupons", headers=h, timeout=30).json())

    def test_users_and_role_change(self, admin_tok):
        h = hdr(admin_tok)
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        uid = requests.post(f"{BASE}/auth/register", json={"name": "TEST Role", "email": email, "password": "Test@1234"}, timeout=30).json()["user"]["id"]
        r = requests.put(f"{BASE}/admin/users/{uid}/role", headers=h, json={"role": "delivery_partner"}, timeout=30)
        assert r.status_code == 200
        users = requests.get(f"{BASE}/admin/users", headers=h, timeout=30).json()
        assert next(u for u in users if u["id"] == uid)["role"] == "delivery_partner"
        assert requests.put(f"{BASE}/admin/users/{uid}/role", headers=h, json={"role": "wizard"}, timeout=30).status_code == 400
        assert any(u["id"] == uid for u in requests.get(f"{BASE}/admin/delivery-partners", headers=h, timeout=30).json())

    def test_analytics(self, admin_tok):
        r = requests.get(f"{BASE}/admin/analytics", headers=hdr(admin_tok), timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["revenue", "orders_count", "users_count", "products_count", "orders_by_status", "top_products", "revenue_series"]:
            assert k in d, k
        assert d["orders_count"] > 0 and d["revenue"] > 0
        assert len(d["orders_by_status"]) == 5
        assert isinstance(d["revenue_series"], list) and len(d["revenue_series"]) > 0


# ---------------- Delivery ----------------
class TestDelivery:
    def test_assign_and_advance(self, admin_tok, partner, cust_tok):
        ah = hdr(admin_tok)
        ph = hdr(partner["token"])
        pid_user = partner["user"]["id"]
        # create a fresh order as the customer
        h = hdr(cust_tok)
        p = requests.get(f"{BASE}/products?category=flashlights&limit=1", timeout=30).json()["items"][0]
        requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 1}, timeout=30)
        oid = requests.post(f"{BASE}/orders", headers=h, json={"address": ADDRESS, "payment_method": "mock"}, timeout=30).json()["id"]
        # partner cannot advance unassigned order
        r = requests.put(f"{BASE}/orders/{oid}/status", headers=ph, json={"status": "picked_up"}, timeout=30)
        assert r.status_code == 403, f"unassigned order advance should be 403, got {r.status_code}"
        # bad partner id
        assert requests.put(f"{BASE}/admin/orders/{oid}/assign", headers=ah, json={"delivery_partner_id": str(uuid.uuid4())}, timeout=30).status_code == 404
        a = requests.put(f"{BASE}/admin/orders/{oid}/assign", headers=ah, json={"delivery_partner_id": pid_user}, timeout=30)
        assert a.status_code == 200
        assert a.json()["status"] == "confirmed" and a.json()["delivery_partner_id"] == pid_user
        # partner sees it
        mine = requests.get(f"{BASE}/delivery/orders", headers=ph, timeout=30)
        assert mine.status_code == 200
        assert any(o["id"] == oid for o in mine.json())
        assert all(o["delivery_partner_id"] == pid_user for o in mine.json())
        # advance
        for st in ["picked_up", "in_transit", "delivered"]:
            r = requests.put(f"{BASE}/orders/{oid}/status", headers=ph, json={"status": st}, timeout=30)
            assert r.status_code == 200, r.text[:200]
            assert r.json()["status"] == st
        final = requests.get(f"{BASE}/orders/{oid}", headers=ph, timeout=30).json()
        assert final["status"] == "delivered"
        assert [t["status"] for t in final["timeline"]] == ["placed", "confirmed", "picked_up", "in_transit", "delivered"]
        # invalid status
        assert requests.put(f"{BASE}/orders/{oid}/status", headers=ph, json={"status": "teleported"}, timeout=30).status_code == 400
        # customer cannot use partner route
        assert requests.put(f"{BASE}/orders/{oid}/status", headers=h, json={"status": "delivered"}, timeout=30).status_code == 403
        assert requests.get(f"{BASE}/delivery/orders", headers=h, timeout=30).status_code == 403
