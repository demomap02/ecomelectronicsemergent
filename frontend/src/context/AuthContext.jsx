import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "@/services/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=guest, obj=user
  const [showAuth, setShowAuth] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem("vm_token");
    if (!token) { setUser(false); return; }
    try { setUser(await authApi.me()); }
    catch { localStorage.removeItem("vm_token"); setUser(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const finishAuth = (data) => {
    localStorage.setItem("vm_token", data.token);
    setUser(data.user);
    setShowAuth(false);
  };

  const logout = () => { localStorage.removeItem("vm_token"); setUser(false); };

  return (
    <AuthCtx.Provider value={{ user, setUser, showAuth, setShowAuth, finishAuth, logout, reload: load }}>
      {children}
    </AuthCtx.Provider>
  );
}
