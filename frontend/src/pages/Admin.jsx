import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Ticket, Palette, LayoutGrid,
  Trash2, Plus, TrendingUp, IndianRupee, Loader2, Truck, Grid3x3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { adminApi, shopApi, money } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "users", label: "Users", icon: Users },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "categories", label: "Categories", icon: Grid3x3 },
  { id: "appearance", label: "Appearance", icon: Palette },
];

export default function Admin() {
  const { user, setShowAuth } = useAuth();
  const [tab, setTab] = useState("overview");

  if (!user) return <div className="py-20 text-center"><button onClick={() => setShowAuth(true)} className="btn-primary px-6 py-2.5">Login as Admin</button></div>;
  if (user.role !== "admin") return <div className="py-20 text-center text-sm" style={{ color: "var(--muted)" }}>Admin access required. Login as demomaptesting@gmail.com.</div>;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 flex gap-5">
      <aside className="w-52 shrink-0 hidden md:block">
        <div className="sticky top-28 surface border p-2 space-y-1" style={{ borderColor: "var(--border-c)" }}>
          <h2 className="font-head font-bold px-3 py-2 text-sm" style={{ color: "var(--text)" }}>Admin Panel</h2>
          {TABS.map((t) => (
            <button key={t.id} data-testid={`admin-tab-${t.id}`} onClick={() => setTab(t.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded"
              style={{ background: tab === t.id ? "var(--primary)" : "transparent", color: "var(--text)", fontWeight: tab === t.id ? 700 : 400 }}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden mb-3 flex gap-1 overflow-x-auto hide-scroll">
          {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-1.5 text-xs rounded whitespace-nowrap" style={{ background: tab === t.id ? "var(--primary)" : "var(--surface)", border: "1px solid var(--border-c)" }}>{t.label}</button>)}
        </div>
        {tab === "overview" && <Overview />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "users" && <UsersTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "appearance" && <AppearanceTab />}
      </div>
    </div>
  );
}

function Overview() {
  const [a, setA] = useState(null);
  useEffect(() => { adminApi.analytics().then(setA); }, []);
  if (!a) return <Spin />;
  const COLORS = ["#FACC15", "#1D4ED8", "#EF4444", "#16a34a", "#A855F7"];
  const cards = [
    { l: "Revenue", v: money(a.revenue), icon: IndianRupee },
    { l: "Orders", v: a.orders_count, icon: ShoppingBag },
    { l: "Users", v: a.users_count, icon: Users },
    { l: "Products", v: a.products_count, icon: Package },
  ];
  return (
    <div className="space-y-5">
      <h1 className="font-head text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.l} className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
            <c.icon size={18} style={{ color: "var(--primary)" }} />
            <p className="font-head text-2xl font-extrabold mt-2" style={{ color: "var(--text)" }}>{c.v}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{c.l}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-1" style={{ color: "var(--text)" }}><TrendingUp size={15} /> Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={a.revenue_series}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="revenue" stroke="#1D4ED8" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Orders by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={a.orders_by_status.filter((s) => s.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={(e) => e.status}>
              {a.orders_by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Top Selling Products</h3>
        {a.top_products.length === 0 ? <p className="text-xs" style={{ color: "var(--muted)" }}>No sales yet.</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.top_products}><XAxis dataKey="title" tick={{ fontSize: 9 }} interval={0} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="qty" fill="#FACC15" /></BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const EMPTY = { title: "", brand: "", category: "laptops", price: "", mrp: "", stock: 50, description: "", images: "", featured: false, deal: false, rating: 4.3, rating_count: 100 };

function ProductsTab() {
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => { shopApi.products({ limit: 200 }).then((r) => setItems(r.items)); }, []);
  useEffect(() => { load(); shopApi.categories().then(setCats); }, [load]);

  const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (p) => { setForm({ ...p, images: (p.images || []).join(", ") }); setEditId(p.id); setOpen(true); };

  const save = async () => {
    const payload = {
      title: form.title, brand: form.brand, category: form.category,
      price: Number(form.price), mrp: Number(form.mrp), stock: Number(form.stock),
      description: form.description, images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
      specs: form.specs || {}, badges: form.badges || [], featured: !!form.featured, deal: !!form.deal,
      rating: Number(form.rating), rating_count: Number(form.rating_count),
    };
    try {
      if (editId) await adminApi.updateProduct(editId, payload);
      else await adminApi.createProduct(payload);
      toast.success(editId ? "Product updated" : "Product created");
      setOpen(false); load();
    } catch { toast.error("Save failed — check fields"); }
  };

  const del = async (id) => { await adminApi.deleteProduct(id); toast.success("Deleted"); load(); };
  if (!items) return <Spin />;
  const inp = "w-full px-3 py-2 text-sm border rounded-md";
  const st = { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-head text-2xl font-bold" style={{ color: "var(--text)" }}>Products ({items.length})</h1>
        <button data-testid="admin-new-product" onClick={openNew} className="btn-primary px-4 py-2 text-sm flex items-center gap-1"><Plus size={15} /> Add Product</button>
      </div>
      <div className="surface border overflow-x-auto" style={{ borderColor: "var(--border-c)" }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: "1px solid var(--border-c)", color: "var(--muted)" }}>
            {["Product", "Category", "Price", "Stock", ""].map((h) => <th key={h} className="text-left p-3 font-semibold text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} data-testid={`admin-product-${p.id}`} style={{ borderBottom: "1px solid var(--border-c)" }}>
                <td className="p-3 flex items-center gap-2"><img src={p.images?.[0]} alt="" className="w-9 h-9 object-contain bg-white rounded" /><span className="font-medium max-w-[220px] truncate" style={{ color: "var(--text)" }}>{p.title}</span></td>
                <td className="p-3 capitalize" style={{ color: "var(--muted)" }}>{p.category}</td>
                <td className="p-3" style={{ color: "var(--text)" }}>{money(p.price)}</td>
                <td className="p-3" style={{ color: p.stock <= 3 ? "var(--accent)" : "var(--muted)" }}>{p.stock}</td>
                <td className="p-3 flex gap-2">
                  <button data-testid={`edit-${p.id}`} onClick={() => openEdit(p)} className="text-xs underline" style={{ color: "var(--secondary)" }}>Edit</button>
                  <button data-testid={`del-${p.id}`} onClick={() => del(p.id)} style={{ color: "var(--accent)" }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <input data-testid="pf-title" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} style={st} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inp} style={st} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp} style={st}>
                {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
              <input data-testid="pf-price" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inp} style={st} />
              <input data-testid="pf-mrp" type="number" placeholder="MRP" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className={inp} style={st} />
              <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inp} style={st} />
              <input type="number" step="0.1" placeholder="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inp} style={st} />
            </div>
            <input placeholder="Image URLs (comma separated)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className={inp} style={st} />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} style={st} rows={3} />
            <div className="flex gap-4 text-sm" style={{ color: "var(--text)" }}>
              <label className="flex items-center gap-1"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={form.deal} onChange={(e) => setForm({ ...form, deal: e.target.checked })} /> Deal</label>
            </div>
            <button data-testid="pf-save" onClick={save} className="btn-primary w-full py-2.5 text-sm">{editId ? "Update" : "Create"} Product</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const [partners, setPartners] = useState([]);
  const load = useCallback(() => { adminApi.orders().then(setOrders); }, []);
  useEffect(() => { load(); adminApi.partners().then(setPartners); }, [load]);

  const assign = async (oid, pid) => { if (!pid) return; await adminApi.assignOrder(oid, pid); toast.success("Order assigned"); load(); };
  if (!orders) return <Spin />;
  return (
    <div>
      <h1 className="font-head text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Orders ({orders.length})</h1>
      <div className="space-y-3">
        {orders.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No orders yet.</p>}
        {orders.map((o) => (
          <div key={o.id} data-testid={`admin-order-${o.order_no}`} className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{o.order_no} · {money(o.total)}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{o.user_name} · {o.items.length} items · <span className="capitalize">{o.status.replace("_", " ")}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={15} style={{ color: "var(--muted)" }} />
                <select data-testid={`assign-${o.order_no}`} value={o.delivery_partner_id || ""} onChange={(e) => assign(o.id, e.target.value)}
                  className="text-xs px-2 py-1.5 border rounded" style={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" }}>
                  <option value="">{o.delivery_partner_name || "Assign partner…"}</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState(null);
  const load = useCallback(() => { adminApi.users().then(setUsers); }, []);
  useEffect(() => { load(); }, [load]);
  const change = async (id, role) => { await adminApi.setRole(id, role); toast.success("Role updated"); load(); };
  if (!users) return <Spin />;
  return (
    <div>
      <h1 className="font-head text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Users ({users.length})</h1>
      <div className="surface border overflow-x-auto" style={{ borderColor: "var(--border-c)" }}>
        <table className="w-full text-sm">
          <thead><tr style={{ borderBottom: "1px solid var(--border-c)", color: "var(--muted)" }}>{["Name", "Email", "Role"].map((h) => <th key={h} className="text-left p-3 text-xs font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border-c)" }}>
                <td className="p-3 font-medium" style={{ color: "var(--text)" }}>{u.name}</td>
                <td className="p-3" style={{ color: "var(--muted)" }}>{u.email}</td>
                <td className="p-3">
                  <select data-testid={`role-${u.id}`} value={u.role} onChange={(e) => change(u.id, e.target.value)} className="text-xs px-2 py-1 border rounded" style={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" }}>
                    {["customer", "delivery_partner", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState(null);
  const [f, setF] = useState({ code: "", percent: 10, max_discount: 2000, min_order: 0 });
  const load = useCallback(() => { adminApi.coupons().then(setCoupons); }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!f.code) return; await adminApi.createCoupon({ ...f, percent: Number(f.percent), max_discount: Number(f.max_discount), min_order: Number(f.min_order), active: true }); toast.success("Coupon created"); setF({ code: "", percent: 10, max_discount: 2000, min_order: 0 }); load(); };
  if (!coupons) return <Spin />;
  const inp = "px-3 py-2 text-sm border rounded-md"; const st = { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" };
  return (
    <div>
      <h1 className="font-head text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Coupons</h1>
      <div className="surface border p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end" style={{ borderColor: "var(--border-c)" }}>
        <input data-testid="coupon-code" placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} className={inp} style={st} />
        <input type="number" placeholder="% off" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} className={inp} style={st} />
        <input type="number" placeholder="Max ₹" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} className={inp} style={st} />
        <input type="number" placeholder="Min order ₹" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} className={inp} style={st} />
        <button data-testid="create-coupon" onClick={create} className="btn-primary py-2 text-sm">Add</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {coupons.map((c) => (
          <div key={c.id} className="surface border p-4 flex items-center justify-between" style={{ borderColor: "var(--border-c)" }}>
            <div><p className="font-head font-bold" style={{ color: "var(--primary)" }}>{c.code}</p><p className="text-xs" style={{ color: "var(--muted)" }}>{c.percent}% up to {money(c.max_discount)} · min {money(c.min_order)}</p></div>
            <button data-testid={`del-coupon-${c.id}`} onClick={async () => { await adminApi.deleteCoupon(c.id); load(); }} style={{ color: "var(--accent)" }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [cats, setCats] = useState(null);
  const [f, setF] = useState({ name: "", slug: "", icon: "Cpu", image: "" });
  const load = useCallback(() => { shopApi.categories().then(setCats); }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!f.name || !f.slug) return; await adminApi.createCategory(f); toast.success("Category added"); setF({ name: "", slug: "", icon: "Cpu", image: "" }); load(); };
  if (!cats) return <Spin />;
  const inp = "px-3 py-2 text-sm border rounded-md"; const st = { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" };
  return (
    <div>
      <h1 className="font-head text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Categories</h1>
      <div className="surface border p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-end" style={{ borderColor: "var(--border-c)" }}>
        <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} style={st} />
        <input placeholder="slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className={inp} style={st} />
        <input placeholder="Image URL" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} className={inp} style={st} />
        <button data-testid="add-category" onClick={create} className="btn-primary py-2 text-sm">Add Category</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cats.map((c) => (
          <div key={c.id} className="surface border p-3 flex items-center justify-between" style={{ borderColor: "var(--border-c)" }}>
            <div className="flex items-center gap-2">{c.image && <img src={c.image} alt="" className="w-8 h-8 rounded object-cover" />}<span className="text-sm font-medium" style={{ color: "var(--text)" }}>{c.name}</span></div>
            <button data-testid={`del-cat-${c.id}`} onClick={async () => { await adminApi.deleteCategory(c.id); load(); }} style={{ color: "var(--accent)" }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { config, loadConfig, setPreviewTheme, setPreviewLayout } = useStore();
  const [saving, setSaving] = useState(false);
  if (!config) return <Spin />;

  const setTheme = async (id) => { setSaving(true); await adminApi.config({ active_theme: id }); setPreviewTheme(null); await loadConfig(); setSaving(false); toast.success("Store theme updated for all shoppers"); };
  const setLayout = async (id) => { setSaving(true); await adminApi.config({ active_layout: id }); setPreviewLayout(null); await loadConfig(); setSaving(false); toast.success("Homepage layout updated"); };

  return (
    <div className="space-y-6">
      <h1 className="font-head text-2xl font-bold" style={{ color: "var(--text)" }}>Appearance {saving && <Loader2 size={16} className="inline animate-spin" />}</h1>
      <div>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-1" style={{ color: "var(--text)" }}><Palette size={15} /> Store Theme (design tokens)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.values(config.themes).map((t) => (
            <button key={t.id} data-testid={`set-theme-${t.id}`} onClick={() => setTheme(t.id)} className="surface border p-3 text-left card-lift"
              style={{ borderColor: config.active_theme === t.id ? "var(--primary)" : "var(--border-c)", borderWidth: config.active_theme === t.id ? 2 : 1 }}>
              <div className="flex gap-1 mb-2">{[t.colors.primary, t.colors.secondary, t.colors.accent, t.colors.background].map((c, i) => <span key={i} className="w-5 h-5 rounded" style={{ background: c, border: "1px solid #0002" }} />)}</div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{t.name}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{t.vibe}</p>
              {config.active_theme === t.id && <span className="text-[10px] font-bold" style={{ color: "var(--primary)" }}>● ACTIVE</span>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-1" style={{ color: "var(--text)" }}><LayoutGrid size={15} /> Homepage Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {config.layouts.map((l) => (
            <button key={l.id} data-testid={`set-layout-${l.id}`} onClick={() => setLayout(l.id)} className="surface border p-4 text-left card-lift"
              style={{ borderColor: config.active_layout === l.id ? "var(--primary)" : "var(--border-c)", borderWidth: config.active_layout === l.id ? 2 : 1 }}>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{l.name}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{l.desc}</p>
              {config.active_layout === l.id && <span className="text-[10px] font-bold" style={{ color: "var(--primary)" }}>● ACTIVE</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spin() { return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--primary)" }} /></div>; }
