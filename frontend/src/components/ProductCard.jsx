import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ShoppingCart, Eye } from "lucide-react";
import { toast } from "sonner";
import { cartApi, money } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";

export function ProductCard({ p, compact }) {
  const navigate = useNavigate();
  const { user, setShowAuth } = useAuth();
  const { setCart } = useStore();
  const [loading, setLoading] = useState(false);

  const add = async (e) => {
    e.stopPropagation();
    if (!user) { setShowAuth(true); return; }
    setLoading(true);
    try {
      const c = await cartApi.add(p.id, 1);
      setCart(c);
      toast.success("Added to cart", { description: p.title });
    } catch { toast.error("Could not add to cart"); }
    setLoading(false);
  };

  return (
    <div
      data-testid={`product-card-${p.id}`}
      onClick={() => navigate(`/product/${p.id}`)}
      className="surface card-lift group relative cursor-pointer border overflow-hidden flex flex-col"
      style={{ borderColor: "var(--border-c)" }}
    >
      {p.discount_pct > 0 && (
        <span className="absolute top-2 left-2 z-10 text-[11px] font-bold px-2 py-0.5 text-white"
          style={{ background: "var(--accent)", borderRadius: "var(--radius-c)" }}>
          {p.discount_pct}% OFF
        </span>
      )}
      <div className="relative overflow-hidden" style={{ background: "#ffffff" }}>
        <img src={p.images?.[0]} alt={p.title} loading="lazy"
          className={`w-full object-contain transition-transform duration-500 group-hover:scale-105 ${compact ? "h-32" : "h-44"}`} />
        <button onClick={(e) => { e.stopPropagation(); navigate(`/product/${p.id}`); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/90 rounded-full shadow">
          <Eye size={15} className="text-slate-700" />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--muted)" }}>{p.brand}</span>
        <h3 className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "var(--text)" }}>{p.title}</h3>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 text-white rounded" style={{ background: "#16a34a" }}>
            {p.rating} <Star size={9} fill="white" />
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>({p.rating_count.toLocaleString()})</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold" style={{ color: "var(--text)" }}>{money(p.price)}</span>
          {p.mrp > p.price && <span className="text-xs line-through" style={{ color: "var(--muted)" }}>{money(p.mrp)}</span>}
        </div>
        <button data-testid={`add-cart-${p.id}`} onClick={add} disabled={loading}
          className="btn-primary mt-auto w-full py-2 text-xs flex items-center justify-center gap-1 whitespace-nowrap">
          <ShoppingCart size={13} className="shrink-0" /> {loading ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
