"""Edge case: out-of-stock product add-to-cart / order behaviour."""
import os, uuid, requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE}/api"


def _user():
    email = f"test_stock_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST Stock", "email": email, "password": "Test@1234"}, timeout=30)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _zero_stock_product():
    items = requests.get(f"{API}/products", params={"limit": 100}, timeout=30).json()["items"]
    return next((i for i in items if i["stock"] == 0), None)


def test_add_out_of_stock_product_to_cart():
    p = _zero_stock_product()
    if not p:
        import pytest; pytest.skip("no zero-stock product available")
    h = _user()
    r = requests.post(f"{API}/cart", json={"product_id": p["id"], "qty": 2}, headers=h, timeout=30)
    print("add status", r.status_code, r.json())
    # Expectation: should reject with 400 (out of stock) rather than silently add qty 0
    assert r.status_code == 400, f"out-of-stock add returned {r.status_code} cart={r.json()}"


def test_order_with_zero_qty_line():
    p = _zero_stock_product()
    if not p:
        import pytest; pytest.skip("no zero-stock product available")
    h = _user()
    requests.post(f"{API}/cart", json={"product_id": p["id"], "qty": 2}, headers=h, timeout=30)
    r = requests.post(f"{API}/orders", json={"address": {"name": "T", "phone": "9", "line1": "x", "city": "y", "pincode": "1"},
                                             "payment_method": "mock"}, headers=h, timeout=30)
    print("order status", r.status_code, r.text[:400])
    assert r.status_code == 400, f"order with only out-of-stock item created: {r.text[:300]}"
