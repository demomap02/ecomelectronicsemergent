import { useState } from "react";
import { Palette, X, Check, LayoutGrid } from "lucide-react";
import { useStore } from "@/context/StoreContext";

export function ThemeFab() {
  const { config, activeTheme, activeLayout, setPreviewTheme, setPreviewLayout } = useStore();
  const [open, setOpen] = useState(false);
  if (!config) return null;

  return (
    <>
      <button data-testid="theme-fab" onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center card-lift"
        style={{ background: "var(--primary)", color: "var(--text)" }}>
        {open ? <X size={20} /> : <Palette size={20} />}
      </button>
      {open && (
        <div data-testid="theme-panel" className="fixed bottom-20 right-5 z-50 w-72 surface border shadow-2xl p-4 fade-up"
          style={{ borderColor: "var(--border-c)", background: "var(--surface)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Palette size={15} style={{ color: "var(--primary)" }} />
            <h4 className="text-sm font-bold" style={{ color: "var(--text)" }}>Live Preview Themes</h4>
          </div>
          <div className="grid grid-cols-1 gap-1.5 mb-4">
            {Object.values(config.themes).map((t) => (
              <button key={t.id} data-testid={`theme-${t.id}`} onClick={() => setPreviewTheme(t.id)}
                className="flex items-center gap-2 p-2 rounded border text-left"
                style={{ borderColor: activeTheme === t.id ? "var(--primary)" : "var(--border-c)" }}>
                <div className="flex -space-x-1">
                  {[t.colors.primary, t.colors.background, t.colors.accent].map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full border border-white" style={{ background: c }} />
                  ))}
                </div>
                <span className="text-xs font-medium flex-1" style={{ color: "var(--text)" }}>{t.name}</span>
                {activeTheme === t.id && <Check size={13} style={{ color: "var(--primary)" }} />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={15} style={{ color: "var(--primary)" }} />
            <h4 className="text-sm font-bold" style={{ color: "var(--text)" }}>Homepage Layout</h4>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {config.layouts.map((l) => (
              <button key={l.id} data-testid={`layout-${l.id}`} onClick={() => setPreviewLayout(l.id)}
                className="flex items-center gap-2 p-2 rounded border text-left"
                style={{ borderColor: activeLayout === l.id ? "var(--primary)" : "var(--border-c)" }}>
                <span className="text-xs font-medium flex-1" style={{ color: "var(--text)" }}>{l.name}</span>
                {activeLayout === l.id && <Check size={13} style={{ color: "var(--primary)" }} />}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: "var(--muted)" }}>Preview only. Set the default for all shoppers in Admin → Appearance.</p>
        </div>
      )}
    </>
  );
}
