import { Zap } from "lucide-react";

export function Footer() {
  const cols = [
    { h: "Shop", items: ["Laptops", "Smartphones", "Audio", "Cameras", "Gaming"] },
    { h: "Support", items: ["Track Order", "Returns", "Warranty", "Contact Us", "FAQs"] },
    { h: "Company", items: ["About VoltMart", "Careers", "Press", "Sustainability"] },
    { h: "Developers", items: ["REST API", "OpenAPI Docs", "Mobile SDK", "Webhooks"] },
  ];
  return (
    <footer className="mt-16 border-t" style={{ borderColor: "var(--border-c)", background: "var(--surface)" }}>
      <div className="max-w-[1400px] mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="p-1.5 rounded" style={{ background: "var(--primary)" }}><Zap size={18} style={{ color: "var(--text)" }} /></div>
            <span className="font-head text-lg font-extrabold" style={{ color: "var(--text)" }}>VoltMart</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            API-first electronics marketplace. Built headless so every screen — web or native — talks to the same versioned REST API.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.h}>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{col.h}</h4>
            <ul className="space-y-2">
              {col.items.map((i) => (
                <li key={i} className="text-xs cursor-pointer hover:opacity-70" style={{ color: "var(--muted)" }}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-4 text-center text-xs" style={{ borderColor: "var(--border-c)", color: "var(--muted)" }}>
        © 2026 VoltMart. Headless commerce demo. All prices in INR.
      </div>
    </footer>
  );
}
