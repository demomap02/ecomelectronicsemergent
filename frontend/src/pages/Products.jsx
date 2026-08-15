import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { shopApi } from "@/services/api";
import { Slider } from "@/components/ui/slider";
import { Loader2, SlidersHorizontal } from "lucide-react";

const SORTS = [
  { v: "popular", l: "Popularity" }, { v: "price_low", l: "Price: Low to High" },
  { v: "price_high", l: "Price: High to Low" }, { v: "discount", l: "Discount" },
  { v: "rating", l: "Rating" }, { v: "newest", l: "Newest" },
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState([0, 150000]);

  const category = params.get("category") || "";
  const search = params.get("search") || "";
  const deal = params.get("deal") || "";
  const sort = params.get("sort") || "popular";
  const brand = params.get("brand") || "";

  useEffect(() => { shopApi.brands(category).then(setBrands).catch(() => {}); }, [category]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { sort, min_price: price[0], max_price: price[1], limit: 40 };
    if (category) params.category = category;
    if (search) params.search = search;
    if (deal) params.deal = deal;
    if (brand) params.brand = brand;
    try {
      const res = await shopApi.products(params);
      setData(res);
    } catch {
      setData({ items: [], total: 0 });
    }
    setLoading(false);
  }, [category, search, deal, sort, brand, price]);

  useEffect(() => { load(); }, [load]);

  const update = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  const title = search ? `Results for "${search}"` : category ? category[0].toUpperCase() + category.slice(1) : deal ? "Today's Deals" : "All Products";

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-5 flex gap-5">
      <aside className="hidden md:block w-60 shrink-0">
        <div className="sticky top-28 surface border p-4 space-y-5" style={{ borderColor: "var(--border-c)" }}>
          <div className="flex items-center gap-2"><SlidersHorizontal size={16} style={{ color: "var(--primary)" }} /><h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>Filters</h3></div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--text)" }}>Price range</label>
            <div className="px-1 mt-3">
              <Slider min={0} max={150000} step={1000} value={price} onValueChange={setPrice} data-testid="price-slider" />
            </div>
            <div className="flex justify-between text-xs mt-2" style={{ color: "var(--muted)" }}><span>₹{price[0].toLocaleString()}</span><span>₹{price[1].toLocaleString()}</span></div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text)" }}>Brand</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto hide-scroll">
              <button onClick={() => update("brand", "")} className="block text-xs" style={{ color: !brand ? "var(--secondary)" : "var(--muted)", fontWeight: !brand ? 700 : 400 }}>All brands</button>
              {brands.map((b) => (
                <button key={b} data-testid={`brand-${b}`} onClick={() => update("brand", b)} className="block text-xs"
                  style={{ color: brand === b ? "var(--secondary)" : "var(--muted)", fontWeight: brand === b ? 700 : 400 }}>{b}</button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="font-head text-xl md:text-2xl font-bold" style={{ color: "var(--text)" }}>
            {title} {data && <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>({data.total} items)</span>}
          </h1>
          <select data-testid="sort-select" value={sort} onChange={(e) => update("sort", e.target.value)}
            className="text-sm px-3 py-2 border outline-none" style={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)", borderRadius: "var(--radius-c)" }}>
            {SORTS.map((s) => <option key={s.v} value={s.v}>Sort: {s.l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--primary)" }} /></div>
        ) : data.items.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>No products match your filters.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="products-grid">
            {data.items.map((p) => <ProductCard key={p.id} p={p} compact />)}
          </div>
        )}
      </div>
    </div>
  );
}
