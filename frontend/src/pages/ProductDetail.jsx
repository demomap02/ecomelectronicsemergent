import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Star, ShoppingCart, Zap, Truck, ShieldCheck, RotateCcw, Loader2, Minus, Plus } from "lucide-react";
import { shopApi, cartApi, money } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setShowAuth } = useAuth();
  const { setCart } = useStore();
  const [data, setData] = useState(null);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    setData(null);
    shopApi.product(id).then((d) => { setData(d); setImg(0); setQty(1); });
  }, [id]);

  const addToCart = async (buyNow) => {
    if (!user) { setShowAuth(true); return; }
    const c = await cartApi.add(id, qty);
    setCart(c);
    if (buyNow) navigate("/cart");
    else toast.success("Added to cart", { description: data.product.title });
  };

  if (!data) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--primary)" }} /></div>;
  const p = data.product;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div className="md:sticky md:top-28 self-start">
          <div className="surface border p-6 flex items-center justify-center h-[380px]" style={{ borderColor: "var(--border-c)", background: "#fff" }}>
            <img src={p.images[img]} alt={p.title} className="max-h-full object-contain" data-testid="pdp-main-image" />
          </div>
          <div className="flex gap-2 mt-3">
            {p.images.map((im, i) => (
              <button key={i} onClick={() => setImg(i)} className="w-16 h-16 border p-1 bg-white" style={{ borderColor: img === i ? "var(--primary)" : "var(--border-c)" }}>
                <img src={im} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
          {p.video && (
            <video src={p.video} controls playsInline className="w-full mt-3 rounded bg-black" style={{ maxHeight: 260 }} data-testid="pdp-video" />
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button data-testid="pdp-add-cart" onClick={() => addToCart(false)} className="py-3 text-sm font-bold border-2 flex items-center justify-center gap-2" style={{ borderColor: "var(--primary)", color: "var(--text)", borderRadius: "var(--radius-c)" }}>
              <ShoppingCart size={16} /> Add to Cart
            </button>
            <button data-testid="pdp-buy-now" onClick={() => addToCart(true)} className="btn-primary py-3 text-sm flex items-center justify-center gap-2">
              <Zap size={16} /> Buy Now
            </button>
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--secondary)" }}>{p.brand}</span>
          <h1 className="font-head text-2xl md:text-3xl font-bold mt-1" style={{ color: "var(--text)" }} data-testid="pdp-title">{p.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 text-white rounded" style={{ background: "#16a34a" }}>{p.rating} <Star size={11} fill="white" /></span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{p.rating_count.toLocaleString()} ratings</span>
          </div>
          <div className="flex items-baseline gap-3 mt-4">
            <span className="text-3xl font-extrabold" style={{ color: "var(--text)" }}>{money(p.price)}</span>
            {p.mrp > p.price && <><span className="text-lg line-through" style={{ color: "var(--muted)" }}>{money(p.mrp)}</span>
              <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{p.discount_pct}% off</span></>}
          </div>
          <p className="text-xs mt-1" style={{ color: p.stock <= 3 ? "var(--accent)" : "#16a34a" }}>
            {p.stock <= 3 ? `Hurry! Only ${p.stock} left in stock` : "In stock"}
          </p>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Qty</span>
            <div className="flex items-center border" style={{ borderColor: "var(--border-c)", borderRadius: "var(--radius-c)" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2"><Minus size={14} /></button>
              <span className="px-4 text-sm font-bold" data-testid="pdp-qty">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-2"><Plus size={14} /></button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            {[["Free Delivery", Truck], ["1 Yr Warranty", ShieldCheck], ["7-Day Returns", RotateCcw]].map(([t, Ic]) => (
              <div key={t} className="surface border p-3 text-center" style={{ borderColor: "var(--border-c)" }}>
                <Ic size={18} className="mx-auto mb-1" style={{ color: "var(--primary)" }} />
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>{t}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-head text-lg font-bold mb-2" style={{ color: "var(--text)" }}>About this item</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{p.description}</p>
          </div>

          <div className="mt-5">
            <h3 className="font-head text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Specifications</h3>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(p.specs).map(([k, v]) => (
                  <tr key={k} className="border-b" style={{ borderColor: "var(--border-c)" }}>
                    <td className="py-2 pr-4 font-medium w-1/3" style={{ color: "var(--muted)" }}>{k}</td>
                    <td className="py-2" style={{ color: "var(--text)" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="mt-12">
          <h3 className="font-head text-xl font-bold mb-4" style={{ color: "var(--text)" }}>Similar Products</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.related.slice(0, 6).map((rp) => <ProductCard key={rp.id} p={rp} compact />)}
          </div>
        </section>
      )}
    </div>
  );
}
