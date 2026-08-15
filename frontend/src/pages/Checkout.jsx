import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Tag, CreditCard, Wallet } from "lucide-react";
import { cartApi, orderApi, money, apiErr } from "@/services/api";
import { useStore } from "@/context/StoreContext";

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, refreshCart } = useStore();
  const [addr, setAddr] = useState({ name: "", phone: "", line1: "", city: "", pincode: "" });
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null);
  const [pay, setPay] = useState("mock");
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(null);

  const set = (k) => (e) => setAddr({ ...addr, [k]: e.target.value });
  const shipping = cart.subtotal > 499 ? 0 : 49;
  const discount = applied?.discount || 0;
  const total = Math.max(0, cart.subtotal - discount + shipping);

  const applyCoupon = async () => {
    try { const r = await cartApi.applyCoupon(coupon); setApplied(r); toast.success(`Coupon ${r.code} applied! Saved ${money(r.discount)}`); }
    catch (e) { toast.error(apiErr(e.response?.data?.detail)); setApplied(null); }
  };

  const placeOrder = async () => {
    if (!addr.name || !addr.phone || !addr.line1 || !addr.pincode) { toast.error("Please fill in all address fields"); return; }
    setLoading(true);
    try {
      const order = await orderApi.create({ address: addr, payment_method: pay, coupon: applied?.code || null });
      await refreshCart();
      setPlaced(order);
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    setLoading(false);
  };

  if (placed) {
    return (
      <div className="max-w-md mx-auto py-16 text-center px-4">
        <CheckCircle2 size={56} className="mx-auto mb-4" style={{ color: "#16a34a" }} />
        <h2 className="font-head text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Order Confirmed!</h2>
        <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>Order <b>{placed.order_no}</b> · {money(placed.total)}</p>
        <p className="text-xs mb-6" style={{ color: "var(--muted)" }}>Payment: {placed.payment_status} (mock). We'll notify you when it ships.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate("/account")} className="btn-primary px-5 py-2.5 text-sm">Track Order</button>
          <button onClick={() => navigate("/products")} className="px-5 py-2.5 text-sm border-2 rounded" style={{ borderColor: "var(--border-c)", color: "var(--text)" }}>Keep Shopping</button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2.5 text-sm outline-none border rounded-md";
  const inputStyle = { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <h1 className="font-head text-2xl font-bold" style={{ color: "var(--text)" }}>Checkout</h1>
        <div className="surface border p-5" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Delivery Address</h3>
          <div className="grid grid-cols-2 gap-3">
            <input data-testid="addr-name" placeholder="Full name" value={addr.name} onChange={set("name")} className={inputCls} style={inputStyle} />
            <input data-testid="addr-phone" placeholder="Phone" value={addr.phone} onChange={set("phone")} className={inputCls} style={inputStyle} />
            <input data-testid="addr-line1" placeholder="Address line" value={addr.line1} onChange={set("line1")} className={`${inputCls} col-span-2`} style={inputStyle} />
            <input data-testid="addr-city" placeholder="City" value={addr.city} onChange={set("city")} className={inputCls} style={inputStyle} />
            <input data-testid="addr-pincode" placeholder="Pincode" value={addr.pincode} onChange={set("pincode")} className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div className="surface border p-5" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Payment Method</h3>
          {[["mock", "Pay Now (Demo — instantly paid)", CreditCard], ["razorpay", "Razorpay (coming soon)", Wallet], ["cod", "Cash on Delivery", Wallet]].map(([v, l, Ic]) => (
            <label key={v} className="flex items-center gap-3 p-2.5 rounded border mb-2 cursor-pointer" style={{ borderColor: pay === v ? "var(--primary)" : "var(--border-c)" }}>
              <input type="radio" name="pay" checked={pay === v} onChange={() => setPay(v)} disabled={v === "razorpay"} data-testid={`pay-${v}`} />
              <Ic size={16} style={{ color: "var(--primary)" }} />
              <span className="text-sm" style={{ color: "var(--text)" }}>{l}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="surface border p-5 sticky top-28" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-head text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Summary</h3>
          <div className="flex gap-2 mb-4">
            <input data-testid="coupon-input" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-md" style={inputStyle} />
            <button data-testid="apply-coupon" onClick={applyCoupon} className="px-3 py-2 text-xs font-bold border-2 rounded flex items-center gap-1" style={{ borderColor: "var(--primary)", color: "var(--text)" }}><Tag size={13} /> Apply</button>
          </div>
          <p className="text-[11px] mb-3" style={{ color: "var(--muted)" }}>Try <b>VOLT10</b> or <b>MEGA25</b></p>
          <div className="space-y-2 text-sm">
            <Row l="Subtotal" v={money(cart.subtotal)} />
            {discount > 0 && <Row l={`Discount (${applied.code})`} v={"-" + money(discount)} accent />}
            <Row l="Shipping" v={shipping === 0 ? "FREE" : money(shipping)} />
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base" style={{ borderColor: "var(--border-c)", color: "var(--text)" }}>
              <span>Total</span><span data-testid="checkout-total">{money(total)}</span>
            </div>
          </div>
          <button data-testid="place-order" onClick={placeOrder} disabled={loading} className="btn-primary w-full py-3 text-sm mt-4 flex items-center justify-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />} Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, accent }) {
  return <div className="flex justify-between" style={{ color: "var(--muted)" }}><span>{l}</span><span style={{ color: accent ? "#16a34a" : "var(--text)", fontWeight: 500 }}>{v}</span></div>;
}
