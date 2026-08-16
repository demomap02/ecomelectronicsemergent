import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("vm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErr(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && e.msg) || JSON.stringify(e)).join(" ");
  if (detail && detail.msg) return detail.msg;
  return String(detail);
}

// Auth
export const authApi = {
  register: (d) => client.post("/auth/register", d).then((r) => r.data),
  login: (d) => client.post("/auth/login", d).then((r) => r.data),
  otpRequest: (phone) => client.post("/auth/otp/request", { phone }).then((r) => r.data),
  otpVerify: (d) => client.post("/auth/otp/verify", d).then((r) => r.data),
  me: () => client.get("/auth/me").then((r) => r.data),
};

// Storefront
export const shopApi = {
  config: () => client.get("/config").then((r) => r.data),
  categories: () => client.get("/categories").then((r) => r.data),
  products: (params) => client.get("/products", { params }).then((r) => r.data),
  brands: (category) => client.get("/products/brands", { params: { category } }).then((r) => r.data),
  product: (id) => client.get(`/products/${id}`).then((r) => r.data),
  coupons: () => client.get("/coupons").then((r) => r.data),
};

// Cart
export const cartApi = {
  get: () => client.get("/cart").then((r) => r.data),
  add: (product_id, qty = 1) => client.post("/cart", { product_id, qty }).then((r) => r.data),
  update: (product_id, qty) => client.put(`/cart/${product_id}`, { product_id, qty }).then((r) => r.data),
  remove: (product_id) => client.delete(`/cart/${product_id}`).then((r) => r.data),
  applyCoupon: (code) => client.post("/cart/apply-coupon", { code }).then((r) => r.data),
};

// Orders
export const orderApi = {
  create: (d) => client.post("/orders", d).then((r) => r.data),
  mine: () => client.get("/orders").then((r) => r.data),
  get: (id) => client.get(`/orders/${id}`).then((r) => r.data),
  updateStatus: (id, status) => client.put(`/orders/${id}/status`, { status }).then((r) => r.data),
};

// Delivery
export const deliveryApi = {
  orders: () => client.get("/delivery/orders").then((r) => r.data),
};

// Admin
export const adminApi = {
  config: (d) => client.put("/admin/config", d).then((r) => r.data),
  createProduct: (d) => client.post("/admin/products", d).then((r) => r.data),
  updateProduct: (id, d) => client.put(`/admin/products/${id}`, d).then((r) => r.data),
  deleteProduct: (id) => client.delete(`/admin/products/${id}`).then((r) => r.data),
  createCategory: (d) => client.post("/admin/categories", d).then((r) => r.data),
  deleteCategory: (id) => client.delete(`/admin/categories/${id}`).then((r) => r.data),
  orders: () => client.get("/admin/orders").then((r) => r.data),
  assignOrder: (id, delivery_partner_id) => client.put(`/admin/orders/${id}/assign`, { delivery_partner_id }).then((r) => r.data),
  users: () => client.get("/admin/users").then((r) => r.data),
  setRole: (id, role) => client.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  partners: () => client.get("/admin/delivery-partners").then((r) => r.data),
  coupons: () => client.get("/admin/coupons").then((r) => r.data),
  createCoupon: (d) => client.post("/admin/coupons", d).then((r) => r.data),
  deleteCoupon: (id) => client.delete(`/admin/coupons/${id}`).then((r) => r.data),
  analytics: () => client.get("/admin/analytics").then((r) => r.data),
};

// Reviews
export const reviewApi = {
  list: (pid) => client.get(`/products/${pid}/reviews`).then((r) => r.data),
  add: (pid, d) => client.post(`/products/${pid}/reviews`, d).then((r) => r.data),
};

// Notifications
export const notifyApi = {
  list: () => client.get("/notifications").then((r) => r.data),
  read: (id) => client.post(`/notifications/${id}/read`).then((r) => r.data),
  readAll: () => client.post("/notifications/read-all").then((r) => r.data),
};

export function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
