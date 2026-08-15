import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";

export function CategoryRail({ categories }) {
  const navigate = useNavigate();
  return (
    <div className="flex gap-4 overflow-x-auto hide-scroll pb-2">
      {categories.map((c) => {
        const Icon = Icons[c.icon] || Icons.Cpu;
        return (
          <button key={c.id} data-testid={`cat-rail-${c.slug}`}
            onClick={() => navigate(`/products?category=${c.slug}`)}
            className="flex flex-col items-center gap-2 min-w-[80px] group">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center relative card-lift"
              style={{ borderColor: "var(--border-c)", background: "var(--surface)" }}>
              {c.image
                ? <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                : <Icon size={26} style={{ color: "var(--primary)" }} />}
            </div>
            <span className="text-xs font-medium text-center" style={{ color: "var(--text)" }}>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
