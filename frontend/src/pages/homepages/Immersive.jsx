import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { money } from "@/services/api";
import { Sparkles, ArrowRight } from "lucide-react";

export function Immersive({ data, banners }) {
  const navigate = useNavigate();
  const hero = data.top[0];
  return (
    <div>
      {/* Parallax-ish hero */}
      <div className="relative h-[70vh] min-h-[440px] overflow-hidden flex items-center">
        <img src={banners[1]?.image || banners[0]?.image} alt="flagship"
          className="absolute inset-0 w-full h-full object-cover scale-105" style={{ filter: "brightness(.4)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.75), rgba(0,0,0,.25) 60%, transparent), linear-gradient(180deg, transparent, var(--bg))" }} />
        <div className="relative max-w-[1400px] mx-auto px-6 w-full">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/90">Flagship Series</span>
          </div>
          <h1 className="font-head text-4xl md:text-7xl font-extrabold text-white max-w-2xl leading-[1.05]">{hero?.title}</h1>
          <p className="text-white/80 mt-4 max-w-md text-lg">Cinematic performance meets timeless design. Starting at {money(hero?.price)}.</p>
          <div className="flex gap-3 mt-7">
            <button onClick={() => hero && navigate(`/product/${hero.id}`)} className="btn-primary px-7 py-3 inline-flex items-center gap-2">
              Discover <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate("/products")} className="px-7 py-3 rounded font-bold border-2 text-white bg-white/10" style={{ borderColor: "rgba(255,255,255,.7)" }}>
              Browse all
            </button>
          </div>
        </div>
      </div>

      {/* Glass grid */}
      <div className="max-w-[1400px] mx-auto px-4 -mt-16 relative z-10 space-y-8">
        <div className="glass border rounded-lg p-6" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-head text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Top Rated</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.top.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
        <section className="pb-4">
          <h3 className="font-head text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Explore the collection</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.products.slice(0, 15).map((p) => <ProductCard key={p.id} p={p} compact />)}
          </div>
        </section>
      </div>
    </div>
  );
}
