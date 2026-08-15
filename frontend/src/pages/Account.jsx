import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ChevronDown, Loader2 } from "lucide-react";
import { orderApi, money } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const STEPS = ["placed", "confirmed", "picked_up", "in_transit", "delivered"];
const LABELS = { placed: "Placed", confirmed: "Confirmed", picked_up: "Picked Up", in_transit: "In Transit", delivered: "Delivered" };

export default function Account() {
  const navigate = useNavigate();
  const { user, setShowAuth } = useAuth();
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => { if (user) orderApi.mine().then(setOrders); }, [user]);

  if (!user) {
    return <div className="max-w-md mx-auto py-20 text-center">
      <h2 className="font-head text-xl font-bold mb-3" style={{ color: "var(--text)" }}>Login to view your orders</h2>
      <button onClick={() => setShowAuth(true)} className="btn-primary px-6 py-2.5 text-sm">Login</button>
    </div>;
  }
  if (!orders) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--primary)" }} /></div>;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      <div className="surface border p-5 mb-5 flex items-center gap-4" style={{ borderColor: "var(--border-c)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--primary)", color: "var(--text)" }}>
          {(user.name || "U")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="font-head text-xl font-bold" style={{ color: "var(--text)" }}>{user.name}</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{user.email} · <span className="capitalize">{user.role.replace("_", " ")}</span></p>
        </div>
      </div>

      <h2 className="font-head text-lg font-bold mb-3" style={{ color: "var(--text)" }}>My Orders ({orders.length})</h2>
      {orders.length === 0 ? (
        <div className="surface border p-10 text-center" style={{ borderColor: "var(--border-c)" }}>
          <Package size={40} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>No orders yet.</p>
          <button onClick={() => navigate("/products")} className="btn-primary px-5 py-2 text-sm">Shop Now</button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const idx = STEPS.indexOf(o.status);
            return (
              <div key={o.id} data-testid={`order-${o.order_no}`} className="surface border overflow-hidden" style={{ borderColor: "var(--border-c)" }}>
                <button onClick={() => setOpen(open === o.id ? null : o.id)} className="w-full p-4 flex items-center gap-4 text-left">
                  <img src={o.items[0]?.image} alt="" className="w-14 h-14 object-contain bg-white rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{o.order_no}</p>
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{o.items.map((i) => i.title).join(", ")}</p>
                    <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded text-white capitalize" style={{ background: o.status === "delivered" ? "#16a34a" : "var(--secondary)" }}>{LABELS[o.status]}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{money(o.total)}</p>
                    <ChevronDown size={16} className="inline mt-1" style={{ color: "var(--muted)", transform: open === o.id ? "rotate(180deg)" : "none" }} />
                  </div>
                </button>
                {open === o.id && (
                  <div className="px-4 pb-4 border-t pt-4" style={{ borderColor: "var(--border-c)" }}>
                    <div className="flex items-center justify-between mb-4">
                      {STEPS.map((s, i) => (
                        <div key={s} className="flex-1 flex flex-col items-center relative">
                          {i > 0 && <div className="absolute h-0.5 right-1/2 left-[-50%] top-2" style={{ background: i <= idx ? "var(--primary)" : "var(--border-c)" }} />}
                          <div className="w-4 h-4 rounded-full z-10" style={{ background: i <= idx ? "var(--primary)" : "var(--border-c)" }} />
                          <span className="text-[9px] mt-1 text-center" style={{ color: i <= idx ? "var(--text)" : "var(--muted)" }}>{LABELS[s]}</span>
                        </div>
                      ))}
                    </div>
                    {o.delivery_partner_name && <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>Delivery partner: <b>{o.delivery_partner_name}</b></p>}
                    <div className="space-y-1 text-xs" style={{ color: "var(--muted)" }}>
                      {o.items.map((it) => <div key={it.product_id} className="flex justify-between"><span>{it.title} × {it.qty}</span><span>{money(it.price * it.qty)}</span></div>)}
                      {o.discount > 0 && <div className="flex justify-between" style={{ color: "#16a34a" }}><span>Discount</span><span>-{money(o.discount)}</span></div>}
                      <div className="flex justify-between font-bold pt-1 border-t" style={{ borderColor: "var(--border-c)", color: "var(--text)" }}><span>Total</span><span>{money(o.total)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
