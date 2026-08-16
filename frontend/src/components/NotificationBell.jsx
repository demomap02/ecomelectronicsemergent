import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Truck, CheckCheck } from "lucide-react";
import { notifyApi } from "@/services/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], unread: 0 });

  const load = useCallback(() => { notifyApi.list().then(setData).catch(() => {}); }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const openItem = async (n) => {
    if (!n.read) { await notifyApi.read(n.id); load(); }
    if (n.order_id) navigate("/account");
  };
  const markAll = async () => { await notifyApi.readAll(); load(); };

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger asChild>
        <button data-testid="notif-bell" className="relative p-2 rounded-full hover:opacity-80" title="Notifications">
          <Bell size={21} style={{ color: "var(--text)" }} />
          {data.unread > 0 && (
            <span data-testid="notif-count" className="absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white rounded-full min-w-4 h-4 px-1 flex items-center justify-center" style={{ background: "var(--accent)" }}>
              {data.unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border-c)" }}>
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Notifications</span>
          {data.unread > 0 && (
            <button data-testid="notif-read-all" onClick={markAll} className="text-[11px] flex items-center gap-1" style={{ color: "var(--secondary)" }}>
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.items.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--muted)" }}>No notifications yet.</p>
          ) : data.items.map((n) => (
            <button key={n.id} data-testid={`notif-item-${n.id}`} onClick={() => openItem(n)}
              className="w-full text-left px-3 py-2.5 flex gap-2.5 border-b hover:opacity-90"
              style={{ borderColor: "var(--border-c)", background: n.read ? "transparent" : "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <div className="mt-0.5 shrink-0">{n.kind === "delivery" ? <Truck size={15} style={{ color: "var(--primary)" }} /> : <Package size={15} style={{ color: "var(--primary)" }} />}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{n.title}</p>
                <p className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>{n.body}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: "var(--accent)" }} />}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
