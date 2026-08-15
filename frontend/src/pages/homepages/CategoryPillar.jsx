import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import * as Icons from "lucide-react";

export function CategoryPillar({ data, banners }) {
  const navigate = useNavigate();
  const [active, setActive] = useState("all");
  const filtered = active === "all" ? data.products : data.products.filter((p) => p.category === active);
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 flex gap-5">
      {/* Sidebar */}
      <aside className="hidden md:block w-52 shrink-0">
        <div className="sticky top-28 surface border p-2" style={{ borderColor: "var(--border-c)" }}>
          <button onClick={() => setActive("all")} className="w-full text-left px-3 py-2 text-sm rounded font-medium"
            style={{ background: active === "all" ? "var(--primary)" : "transparent", color: "var(--text)" }}>All Products</button>
          {data.categories.map((c) => {
            const Icon = Icons[c.icon] || Icons.Cpu;
            return (
              <button key={c.id} data-testid={`pillar-cat-${c.slug}`} onClick={() => setActive(c.slug)}
                className="w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2"
                style={{ background: active === c.slug ? "var(--primary)" : "transparent", color: "var(--text)" }}>
                <Icon size={15} /> {c.name}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Feed */}
      <div className="flex-1 space-y-6 min-w-0">
        <div onClick={() => navigate(banners[0]?.link || "/products")} className="relative h-40 md:h-52 overflow-hidden rounded-lg cursor-pointer card-lift">
          <img src={banners[0]?.image} alt="promo" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center px-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.7), transparent)" }}>
            <div>
              <h2 className="font-head text-2xl md:text-4xl font-extrabold text-white">{banners[0]?.title}</h2>
              <p className="text-white/80 text-sm mt-1">{banners[0]?.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} compact />)}
        </div>

        <div onClick={() => navigate(banners[1]?.link || "/products")} className="relative h-32 overflow-hidden rounded-lg cursor-pointer card-lift">
          <img src={banners[1]?.image} alt="promo2" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center px-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.65), transparent)" }}>
            <h3 className="font-head text-xl md:text-2xl font-bold text-white">{banners[1]?.title}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.slice(8).map((p) => <ProductCard key={p.id} p={p} compact />)}
        </div>
      </div>
    </div>
  );
}
