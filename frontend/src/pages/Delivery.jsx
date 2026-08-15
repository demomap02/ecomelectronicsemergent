import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Truck, MapPin, Package, CheckCircle2, Loader2, Navigation } from "lucide-react";
import { deliveryApi, orderApi, money } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const NEXT = { placed: "confirmed", confirmed: "picked_up", picked_up: "in_transit", in_transit: "delivered" };
const LABEL = { placed: "Confirm Pickup", confirmed: "Mark Picked Up", picked_up: "Start Transit", in_transit: "Mark Delivered" };

export default function Delivery() {
  const { user, setShowAuth } = useAuth();
  const [orders, setOrders] = useState(null);

  const load = useCallback(() => { deliveryApi.orders().then(setOrders); }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const advance = async (o) => {
    const next = NEXT[o.status];
    if (!next) return;
    await orderApi.updateStatus(o.id, next);
    toast.success(`Order ${o.order_no} → ${next.replace("_", " ")}`);
    load();
  };

  if (!user) return <div className="py-20 text-center"><button onClick={() => setShowAuth(true)} className="btn-primary px-6 py-2.5">Login</button></div>;
  if (user.role !== "delivery_partner" && user.role !== "admin")
    return <div className="py-20 text-center text-sm" style={{ color: "var(--muted)" }}>This dashboard is for delivery partners.</div>;
  if (!orders) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--primary)" }} /></div>;

  const active = orders.filter((o) => o.status !== "delivered");
  const done = orders.filter((o) => o.status === "delivered");

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-full" style={{ background: "var(--primary)" }}><Truck size={22} style={{ color: "var(--text)" }} /></div>
        <div><h1 className="font-head text-xl font-bold" style={{ color: "var(--text)" }}>Delivery Dashboard</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{active.length} active · {done.length} delivered</p></div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[["Active", active.length], ["Delivered", done.length], ["Total", orders.length]].map(([l, v]) => (
          <div key={l} className="surface border p-3 text-center" style={{ borderColor: "var(--border-c)" }}>
            <p className="font-head text-2xl font-extrabold" style={{ color: "var(--primary)" }}>{v}</p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>{l}</p>
          </div>
        ))}
      </div>

      <h2 className="font-head font-bold text-sm mb-2" style={{ color: "var(--text)" }}>Assigned Deliveries</h2>
      {active.length === 0 && <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>No active deliveries assigned.</p>}
      <div className="space-y-3">
        {active.map((o) => (
          <div key={o.id} data-testid={`delivery-order-${o.order_no}`} className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{o.order_no}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded text-white capitalize" style={{ background: "var(--secondary)" }}>{o.status.replace("_", " ")}</span>
            </div>
            <div className="flex items-start gap-2 text-xs mb-1" style={{ color: "var(--muted)" }}>
              <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span>{o.address?.name} · {o.address?.phone}<br />{o.address?.line1}, {o.address?.city} - {o.address?.pincode}</span>
            </div>
            <div className="flex items-center gap-2 text-xs mb-3" style={{ color: "var(--muted)" }}>
              <Package size={14} /> {o.items.length} item(s) · {money(o.total)} · {o.payment_method === "cod" ? "COD" : "Prepaid"}
            </div>
            <button data-testid={`advance-${o.order_no}`} onClick={() => advance(o)} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
              <Navigation size={15} /> {LABEL[o.status]}
            </button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="font-head font-bold text-sm mt-6 mb-2" style={{ color: "var(--text)" }}>Completed</h2>
          <div className="space-y-2">
            {done.map((o) => (
              <div key={o.id} className="surface border p-3 flex items-center gap-2" style={{ borderColor: "var(--border-c)" }}>
                <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{o.order_no}</span>
                <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>{money(o.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
