import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { shopApi, cartApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

function applyTheme(theme) {
  if (!theme) return;
  const c = theme.colors;
  const r = document.documentElement.style;
  r.setProperty("--primary", c.primary);
  r.setProperty("--secondary", c.secondary);
  r.setProperty("--bg", c.background);
  r.setProperty("--surface", c.surface);
  r.setProperty("--text", c.text);
  r.setProperty("--muted", c.muted);
  r.setProperty("--border-c", c.border);
  r.setProperty("--accent", c.accent);
  r.setProperty("--radius-c", theme.radius);
  r.setProperty("--font-heading", theme.typography.heading);
  r.setProperty("--font-body", theme.typography.body);
  document.documentElement.classList.toggle("dark", !!theme.dark);
}

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [previewTheme, setPreviewTheme] = useState(null);
  const [previewLayout, setPreviewLayout] = useState(null);

  const loadConfig = useCallback(async () => {
    const c = await shopApi.config();
    setConfig(c);
    return c;
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  useEffect(() => {
    if (!config) return;
    const themeId = previewTheme || config.active_theme;
    applyTheme(config.themes[themeId]);
  }, [config, previewTheme]);

  const refreshCart = useCallback(async () => {
    if (!user) { setCart({ items: [], subtotal: 0, count: 0 }); return; }
    try { setCart(await cartApi.get()); } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  const activeLayout = previewLayout || config?.active_layout;
  const activeTheme = previewTheme || config?.active_theme;

  return (
    <StoreCtx.Provider value={{
      config, setConfig, loadConfig, cart, setCart, refreshCart,
      activeLayout, activeTheme, previewTheme, setPreviewTheme,
      previewLayout, setPreviewLayout,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}
