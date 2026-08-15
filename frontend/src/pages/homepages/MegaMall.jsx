import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { CategoryRail } from "@/components/CategoryRail";
import { DealCountdown } from "@/components/DealCountdown";
import { Flame, ChevronRight } from "lucide-react";

export function MegaMall({ data, banners }) {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 space-y-8">
      {/* Hero carousel */}
      <div className="relative h-56 md:h-80 overflow-hidden rounded-lg">
        {banners.map((b, i) => (
          <div key={b.id} className="absolute inset-0 transition-opacity duration-700 flex items-center"
            style={{ opacity: i === slide ? 1 : 0 }}>
            <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.15))" }} />
            <div className="relative px-8 md:px-14 max-w-lg">
              <h2 className="font-head text-3xl md:text-5xl font-extrabold text-white leading-tight">{b.title}</h2>
              <p className="text-white/85 mt-2 text-sm md:text-base">{b.subtitle}</p>
              <button onClick={() => navigate(b.link)} className="btn-primary mt-4 px-6 py-2.5 text-sm">{b.cta}</button>
            </div>
          </div>
        ))}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === slide ? "var(--primary)" : "rgba(255,255,255,.5)", width: i === slide ? 20 : 8 }} />
          ))}
        </div>
      </div>

      {/* Category circles */}
      <section>
        <h3 className="font-head text-xl font-bold mb-4" style={{ color: "var(--text)" }}>Shop by Category</h3>
        <CategoryRail categories={data.categories} />
      </section>

      {/* Flash sale */}
      <section className="surface border p-4 md:p-6" style={{ borderColor: "var(--border-c)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame size={22} style={{ color: "var(--accent)" }} />
            <h3 className="font-head text-xl font-bold" style={{ color: "var(--text)" }}>Flash Deals</h3>
            <DealCountdown hours={5} />
          </div>
          <button onClick={() => navigate("/products?deal=1")} className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--secondary)" }}>
            View all <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scroll pb-2">
          {data.deals.map((p) => <div key={p.id} className="min-w-[180px] max-w-[180px]"><ProductCard p={p} compact /></div>)}
        </div>
      </section>

      {/* Dense grid */}
      <section>
        <h3 className="font-head text-xl font-bold mb-4" style={{ color: "var(--text)" }}>Trending Now</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.products.map((p) => <ProductCard key={p.id} p={p} compact />)}
        </div>
      </section>
    </div>
  );
}
