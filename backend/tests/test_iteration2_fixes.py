"""Iteration-2 regression tests: /products query params, stock validation, payment enum, admin 404s."""
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
ADDRESS = {"name": "TEST Riya", "phone": "9000000002", "line1": "12 Test St",
           "city": "Pune", "state": "MH", "pincode": "411001"}


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


def login(c):
    r = requests.post(f"{BASE}/auth/login", json=c, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text[:200]}"
    return r.json()


@pytest.fixture(scope="module")
def admin_tok():
    return login(ADMIN)["token"]


@pytest.fixture(scope="module")
def cust_tok():
    """Dedicated throw-away customer so this module's cart never races with backend_test.py
    (pytest.ini runs 2 xdist workers with --dist loadscope)."""
    email = f"TEST_it2_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE}/auth/register", json={
        "name": "TEST Iter2", "email": email, "password": "Test@1234", "phone": "9111100000"}, timeout=30)
    assert r.status_code == 200, r.text[:200]
    return r.json()["token"]


def clear_cart(h):
    cart = requests.get(f"{BASE}/cart", headers=h, timeout=30).json()
    for it in cart["items"]:
        requests.delete(f"{BASE}/cart/{it['product']['id']}", headers=h, timeout=30)


# ---------- /products query params (was 422 in iteration 1) ----------
class TestProductsQueryParams:
    @pytest.mark.parametrize("qs", [
        "deal=",
        "deal=1",
        "category=flashlights",
        "search=asw",
        "brand=ASW",
        "sort=price_low", "sort=price_high", "sort=rating", "sort=discount",
        "min_price=0&max_price=200000",
        "deal=&category=&brand=&search=&sort=popular",
        "category=flashlights&brand=ASW&sort=price_low&min_price=400&max_price=2000&deal=1",
    ])
    def test_query_combos_200(self, qs):
        r = requests.get(f"{BASE}/products?{qs}&limit=50", timeout=30)
        assert r.status_code == 200, f"{qs} -> {r.status_code} {r.text[:200]}"
        d = r.json()
        assert isinstance(d["items"], list)
        assert d["total"] >= len(d["items"])

    def test_deal_empty_equals_unfiltered(self):
        a = requests.get(f"{BASE}/products?deal=&limit=50", timeout=30).json()
        b = requests.get(f"{BASE}/products?limit=50", timeout=30).json()
        assert a["total"] == b["total"]

    def test_deal_1_filters(self):
        d = requests.get(f"{BASE}/products?deal=1&limit=100", timeout=30).json()
        assert d["total"] > 0
        assert all(i["deal"] is True for i in d["items"])
        assert d["total"] < requests.get(f"{BASE}/products?limit=1", timeout=30).json()["total"]

    def test_search_asw(self):
        d = requests.get(f"{BASE}/products?search=asw&limit=50", timeout=30).json()
        assert d["total"] == 14, f"expected 14 ASW titles, got {d['total']}"
        assert all("asw" in i["title"].lower() for i in d["items"])


# ---------- Product videos ----------
class TestVideos:
    def test_comb_blender_9509_videos(self):
        asw = requests.get(f"{BASE}/products?brand=ASW&limit=50", timeout=30).json()["items"]
        vids = {p["title"]: p.get("video") for p in asw}
        for key in ["AS-C603", "AS-JC11", "AS-9509"]:
            match = [t for t in vids if key in t]
            assert match, f"{key} product missing"
            assert vids[match[0]], f"{key} missing video field"
            assert vids[match[0]].endswith(".mp4")

    def test_video_urls_reachable(self):
        asw = requests.get(f"{BASE}/products?brand=ASW&limit=50", timeout=30).json()["items"]
        for p in asw:
            if p.get("video"):
                h = requests.head(p["video"], timeout=45, allow_redirects=True)
                assert h.status_code == 200, f"{p['title']} video {h.status_code}"


# ---------- Stock validation ----------
class TestStock:
    def test_cart_caps_qty_at_stock(self, cust_tok):
        h = hdr(cust_tok)
        clear_cart(h)
        p = requests.get(f"{BASE}/products?category=flashlights&limit=1", timeout=30).json()["items"][0]
        d = requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": p["stock"] + 500}, timeout=30)
        assert d.status_code == 200
        assert d.json()["items"][0]["qty"] == p["stock"], d.json()["items"][0]["qty"]
        clear_cart(h)

    def test_order_rejects_qty_over_stock(self, cust_tok, admin_tok):
        h = hdr(cust_tok)
        clear_cart(h)
        # low-stock product created by admin
        c = requests.post(f"{BASE}/admin/products", headers=hdr(admin_tok), json={
            "title": "TEST_LowStock", "brand": "TESTBRAND", "category": "flashlights",
            "price": 100.0, "mrp": 200.0, "stock": 2, "images": ["https://example.com/a.jpg"]}, timeout=30)
        assert c.status_code == 200
        pid = c.json()["id"]
        try:
            # PUT /cart also clamps qty to available stock, so the order is placed at stock qty.
            # (The create_order "Only N left" guard is therefore unreachable via the public API.)
            put = requests.put(f"{BASE}/cart/{pid}", headers=h, json={"product_id": pid, "qty": 10}, timeout=30)
            assert put.status_code == 200
            assert next(i for i in put.json()["items"] if i["product"]["id"] == pid)["qty"] == 2
            r = requests.post(f"{BASE}/orders", headers=h,
                              json={"address": ADDRESS, "payment_method": "mock"}, timeout=30)
            assert r.status_code == 200, r.text[:200]
            assert next(i for i in r.json()["items"] if i["product_id"] == pid)["qty"] == 2
            clear_cart(h)
        finally:
            requests.delete(f"{BASE}/admin/products/{pid}", headers=hdr(admin_tok), timeout=30)

    def test_stock_decrements_after_order(self, cust_tok, admin_tok):
        h = hdr(cust_tok)
        clear_cart(h)
        c = requests.post(f"{BASE}/admin/products", headers=hdr(admin_tok), json={
            "title": "TEST_StockDec", "brand": "TESTBRAND", "category": "flashlights",
            "price": 100.0, "mrp": 200.0, "stock": 10, "images": ["https://example.com/a.jpg"]}, timeout=30)
        pid = c.json()["id"]
        try:
            before = requests.get(f"{BASE}/products/{pid}", timeout=30).json()["product"]["stock"]
            requests.post(f"{BASE}/cart", headers=h, json={"product_id": pid, "qty": 3}, timeout=30)
            r = requests.post(f"{BASE}/orders", headers=h,
                              json={"address": ADDRESS, "payment_method": "cod"}, timeout=30)
            assert r.status_code == 200, r.text[:200]
            after = requests.get(f"{BASE}/products/{pid}", timeout=30).json()["product"]["stock"]
            assert after == before - 3, f"{before} -> {after}"
        finally:
            requests.delete(f"{BASE}/admin/products/{pid}", headers=hdr(admin_tok), timeout=30)


# ---------- Payment method validation ----------
class TestPayment:
    # iteration3: razorpay demo checkout marks the order paid (was pending in iteration2)
    @pytest.mark.parametrize("pm,expected_status", [("mock", "paid"), ("cod", "pending"), ("razorpay", "paid")])
    def test_valid_payment_methods(self, cust_tok, pm, expected_status):
        h = hdr(cust_tok)
        clear_cart(h)
        p = requests.get(f"{BASE}/products?category=flashlights&limit=1", timeout=30).json()["items"][0]
        requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 1}, timeout=30)
        r = requests.post(f"{BASE}/orders", headers=h, json={"address": ADDRESS, "payment_method": pm}, timeout=30)
        assert r.status_code == 200, r.text[:200]
        assert r.json()["payment_status"] == expected_status
        assert r.json()["payment_method"] == pm

    def test_invalid_payment_method_400(self, cust_tok):
        h = hdr(cust_tok)
        clear_cart(h)
        p = requests.get(f"{BASE}/products?category=flashlights&limit=1", timeout=30).json()["items"][0]
        requests.post(f"{BASE}/cart", headers=h, json={"product_id": p["id"], "qty": 1}, timeout=30)
        r = requests.post(f"{BASE}/orders", headers=h, json={"address": ADDRESS, "payment_method": "bitcoin"}, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}"
        assert "payment" in r.json()["detail"].lower()
        # cart must be untouched (order not created)
        assert requests.get(f"{BASE}/cart", headers=h, timeout=30).json()["count"] == 1
        clear_cart(h)


# ---------- Admin 404s ----------
class TestAdmin404:
    def test_update_missing_product_404(self, admin_tok):
        r = requests.put(f"{BASE}/admin/products/{uuid.uuid4()}", headers=hdr(admin_tok), json={
            "title": "x", "brand": "x", "category": "x", "price": 1.0, "mrp": 2.0}, timeout=30)
        assert r.status_code == 404, f"got {r.status_code}"

    def test_delete_missing_product_404(self, admin_tok):
        r = requests.delete(f"{BASE}/admin/products/{uuid.uuid4()}", headers=hdr(admin_tok), timeout=30)
        assert r.status_code == 404, f"got {r.status_code}"


# ---------- Auth hardening observations ----------
class TestAuthHardening:
    def test_bcrypt_hash_format(self):
        import pymongo
        from dotenv import dotenv_values as dv
        env = dv("/app/backend/.env")
        cli = pymongo.MongoClient(env["MONGO_URL"])
        u = cli[env["DB_NAME"]].users.find_one({"email": ADMIN["email"]})
        assert u is not None
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]
        cli.close()

    def test_repeated_bad_logins(self):
        codes = []
        for _ in range(6):
            codes.append(requests.post(f"{BASE}/auth/login",
                                       json={"email": CUSTOMER["email"], "password": "wrong"}, timeout=30).status_code)
        # documents behaviour: no lockout implemented (all 401)
        assert set(codes) <= {401, 429}, codes
        # valid credentials must still work afterwards
        assert requests.post(f"{BASE}/auth/login", json=CUSTOMER, timeout=30).status_code == 200
