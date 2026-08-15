import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { DealCountdown } from "@/components/DealCountdown";
import { Zap, Flame } from "lucide-react";

export function FlashFrenzy({ data }) {
  const navigate = useNavigate();
  const rails = [
    { title: "Lightning Deals", hours: 2, items: data.deals.slice(0, 8) },
    { title: "Ends Tonight", hours: 8, items: data.products.slice(0, 8) },
    { title: "Clearance Blowout", hours: 14, items: data.deals.slice(4, 12) },
  ];
  return (
    <div>
      {/* Urgent banner */}
      <div className="relative overflow-hidden" style={{ background: "var(--accent)" }}>
        <div className="max-w-[1400px] mx-auto px-4 py-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Zap size={30} className="text-white animate-pulse" />
            <div>
              <h2 className="font-head text-2xl md:text-3xl font-extrabold text-white">MEGA FLASH SALE IS LIVE</h2>
              <p className="text-white/85 text-sm">Prices crash every hour. Grab them before they're gone.</p>
            </div>
          </div>
          <div className="text-white"><DealCountdown hours={3} size="lg" /></div>
        </div>
        <div className="whitespace-nowrap overflow-hidden border-t border-white/20">
          <div className="inline-block py-1.5 text-white/90 text-xs font-bold" style={{ animation: "marquee 18s linear infinite" }}>
            {"🔥 UP TO 50% OFF · FREE SHIPPING OVER ₹499 · NEW DEALS HOURLY · LIMITED STOCK · ".repeat(4)}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        {rails.map((rail) => (
          <section key={rail.title} className="surface border p-4" style={{ borderColor: "var(--border-c)" }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Flame size={20} style={{ color: "var(--accent)" }} />
                <h3 className="font-head text-lg font-bold" style={{ color: "var(--text)" }}>{rail.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Ends in</span>
                <DealCountdown hours={rail.hours} />
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scroll pb-2">
              {rail.items.map((p) => <div key={p.id} className="min-w-[170px] max-w-[170px]"><ProductCard p={p} compact /></div>)}
            </div>
          </section>
        ))}
        <button onClick={() => navigate("/products?deal=1")} className="btn-primary w-full py-3 text-sm">See all deals</button>
      </div>
    </div>
  );
}
