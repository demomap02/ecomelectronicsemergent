import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { money } from "@/services/api";
import { ArrowUpRight, Star } from "lucide-react";

export function Bento({ data, banners }) {
  const navigate = useNavigate();
  const hero = data.top[0];
  const feat = data.products.slice(1, 5);
  const grid = data.products.slice(5, 17);
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[minmax(150px,auto)]">
        {/* Hero block */}
        <div className="md:col-span-8 md:row-span-2 relative overflow-hidden rounded-lg card-lift cursor-pointer group"
          onClick={() => hero && navigate(`/product/${hero.id}`)} style={{ background: "var(--surface)", border: "1px solid var(--border-c)" }}>
          <img src={banners[0]?.image} alt="hero" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,.85), transparent)" }} />
          <div className="absolute bottom-0 p-8">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Editor's Pick</span>
            <h2 className="font-head text-3xl md:text-4xl font-extrabold text-white mt-2 max-w-md">{hero?.title}</h2>
            <p className="text-white/80 mt-1">Flagship performance. {money(hero?.price)}</p>
            <button className="btn-primary mt-4 px-5 py-2 text-sm inline-flex items-center gap-1">Shop now <ArrowUpRight size={15} /></button>
          </div>
        </div>
        {/* Two promo blocks */}
        {banners.slice(1, 3).map((b) => (
          <div key={b.id} onClick={() => navigate(b.link)} className="md:col-span-4 relative overflow-hidden rounded-lg card-lift cursor-pointer group min-h-[150px]">
            <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.7), transparent)" }} />
            <div className="absolute inset-0 p-5 flex flex-col justify-center">
              <h3 className="font-head text-lg font-bold text-white max-w-[70%]">{b.title}</h3>
              <span className="text-xs text-white/80 mt-1">{b.cta} →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Featured mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {feat.map((p) => (
          <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} className="surface border p-4 flex gap-3 items-center card-lift cursor-pointer" style={{ borderColor: "var(--border-c)" }}>
            <img src={p.images[0]} alt={p.title} className="w-16 h-16 object-contain" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{p.title}</p>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--muted)" }}><Star size={10} fill="currentColor" /> {p.rating}</div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{money(p.price)}</p>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h3 className="font-head text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>Curated for you</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {grid.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  );
}
