import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut, LayoutDashboard, Truck, Menu, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { shopApi } from "@/services/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const navigate = useNavigate();
  const { user, setShowAuth, logout } = useAuth();
  const { cart } = useStore();
  const [q, setQ] = useState("");
  const [cats, setCats] = useState([]);

  useEffect(() => { shopApi.categories().then(setCats).catch(() => {}); }, []);

  const submit = (e) => { e.preventDefault(); navigate(`/products?search=${encodeURIComponent(q)}`); };

  return (
    <header className="sticky top-0 z-40 glass border-b" style={{ borderColor: "var(--border-c)" }}>
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4">
        <button data-testid="logo-btn" onClick={() => navigate("/")} className="flex items-center gap-1.5 shrink-0">
          <div className="p-1.5 rounded" style={{ background: "var(--primary)" }}><Zap size={20} style={{ color: "var(--text)" }} /></div>
          <span className="font-head text-xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>VoltMart</span>
        </button>

        <form onSubmit={submit} className="flex-1 max-w-2xl relative hidden sm:block">
          <input data-testid="search-input" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search laptops, phones, headphones and more…"
            className="w-full pl-4 pr-11 py-2.5 text-sm outline-none border"
            style={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)", borderRadius: "var(--radius-c)" }} />
          <button data-testid="search-btn" type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5" style={{ background: "var(--primary)", borderRadius: "4px" }}>
            <Search size={16} style={{ color: "var(--text)" }} />
          </button>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <button data-testid="cart-btn" onClick={() => navigate("/cart")} className="relative p-2 rounded-full hover:opacity-80" title="Cart">
            <ShoppingCart size={22} style={{ color: "var(--text)" }} />
            {cart.count > 0 && (
              <span data-testid="cart-count" className="absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white rounded-full w-4.5 h-4.5 px-1 flex items-center justify-center" style={{ background: "var(--accent)" }}>
                {cart.count}
              </span>
            )}
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-btn" className="flex items-center gap-1.5 px-2 py-1.5 rounded" style={{ color: "var(--text)" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--primary)", color: "var(--text)" }}>
                    {(user.name || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden md:block max-w-[90px] truncate">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-orders" onClick={() => navigate("/account")}><User size={15} className="mr-2" />My Orders</DropdownMenuItem>
                {user.role === "admin" && <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")}><LayoutDashboard size={15} className="mr-2" />Admin Panel</DropdownMenuItem>}
                {(user.role === "delivery_partner" || user.role === "admin") && <DropdownMenuItem data-testid="menu-delivery" onClick={() => navigate("/delivery")}><Truck size={15} className="mr-2" />Delivery Dashboard</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-logout" onClick={logout}><LogOut size={15} className="mr-2" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button data-testid="login-btn" onClick={() => setShowAuth(true)} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
              <User size={15} /> Login
            </button>
          )}
        </div>
      </div>

      <nav className="border-t hidden md:block" style={{ borderColor: "var(--border-c)" }}>
        <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-1 overflow-x-auto hide-scroll">
          <button onClick={() => navigate("/products")} className="text-xs font-semibold px-3 py-2 flex items-center gap-1 shrink-0" style={{ color: "var(--text)" }}>
            <Menu size={13} /> All Categories
          </button>
          {cats.map((c) => (
            <button key={c.id} data-testid={`nav-cat-${c.slug}`} onClick={() => navigate(`/products?category=${c.slug}`)}
              className="text-xs px-3 py-2 whitespace-nowrap hover:opacity-70" style={{ color: "var(--muted)" }}>
              {c.name}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
