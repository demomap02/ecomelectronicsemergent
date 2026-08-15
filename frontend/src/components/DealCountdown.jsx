import { useEffect, useState } from "react";

export function DealCountdown({ hours = 6, size = "md" }) {
  const [end] = useState(() => Date.now() + hours * 3600 * 1000);
  const [left, setLeft] = useState(end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const box = size === "lg" ? "text-2xl px-3 py-1.5" : "text-sm px-2 py-1";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {[pad(h), pad(m), pad(s)].map((v, i) => (
        <span key={i} className="contents">
          <span className={`font-bold text-white ${box}`} style={{ background: "var(--text)", borderRadius: "4px" }}>{v}</span>
          {i < 2 && <span className="font-bold" style={{ color: "var(--accent)" }}>:</span>}
        </span>
      ))}
    </div>
  );
}
