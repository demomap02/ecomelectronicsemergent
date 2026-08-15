import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { authApi, apiErr } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export function AuthModal() {
  const { showAuth, setShowAuth, finishAuth } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = mode === "login"
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form);
      finishAuth(data);
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
    } catch (err) { toast.error(apiErr(err.response?.data?.detail) || err.message); }
    setLoading(false);
  };

  const requestOtp = async () => {
    if (phone.length < 6) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      const r = await authApi.otpRequest(phone);
      setOtpSent(true); setDevOtp(r.debug_otp);
      toast.success("OTP sent", { description: `Demo OTP: ${r.debug_otp}` });
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const data = await authApi.otpVerify({ phone, otp });
      finishAuth(data);
      toast.success("Logged in via OTP!");
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    setLoading(false);
  };

  const inputCls = "w-full px-3 py-2.5 text-sm outline-none border rounded-md";
  const inputStyle = { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border-c)" };

  return (
    <Dialog open={showAuth} onOpenChange={setShowAuth}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0" data-testid="auth-modal">
        <DialogTitle className="sr-only">Login or Sign up</DialogTitle>
        <div className="p-5 text-center border-b" style={{ background: "var(--primary)", borderColor: "var(--border-c)" }}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap size={22} /><span className="font-head text-xl font-extrabold">VoltMart</span>
          </div>
          <p className="text-xs opacity-80">Login or create an account to shop</p>
        </div>
        <div className="p-5">
          <Tabs defaultValue="email">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="email" data-testid="tab-email"><Mail size={14} className="mr-1.5" />Email</TabsTrigger>
              <TabsTrigger value="phone" data-testid="tab-phone"><Phone size={14} className="mr-1.5" />Phone OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={submitEmail} className="space-y-3">
                {mode === "register" && (
                  <input data-testid="auth-name" required placeholder="Full name" value={form.name} onChange={set("name")} className={inputCls} style={inputStyle} />
                )}
                <input data-testid="auth-email" required type="email" placeholder="Email address" value={form.email} onChange={set("email")} className={inputCls} style={inputStyle} />
                <input data-testid="auth-password" required type="password" placeholder="Password" value={form.password} onChange={set("password")} className={inputCls} style={inputStyle} />
                {mode === "register" && (
                  <select data-testid="auth-role" value={form.role} onChange={set("role")} className={inputCls} style={inputStyle}>
                    <option value="customer">Shop as Customer</option>
                    <option value="delivery_partner">Join as Delivery Partner</option>
                  </select>
                )}
                <button data-testid="auth-submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {mode === "login" ? "Login" : "Create Account"}
                </button>
              </form>
              <p className="text-xs text-center mt-3" style={{ color: "var(--muted)" }}>
                {mode === "login" ? "New here? " : "Have an account? "}
                <button data-testid="auth-toggle" onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-bold underline" style={{ color: "var(--secondary)" }}>
                  {mode === "login" ? "Create account" : "Login"}
                </button>
              </p>
            </TabsContent>

            <TabsContent value="phone">
              {!otpSent ? (
                <div className="space-y-3">
                  <input data-testid="otp-phone" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} style={inputStyle} />
                  <button data-testid="otp-request" disabled={loading} onClick={requestOtp} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                    {loading && <Loader2 size={15} className="animate-spin" />}Send OTP
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Enter the 4-digit code sent to {phone}. <b>Demo OTP: {devOtp}</b></p>
                  <input data-testid="otp-code" placeholder="4-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className={inputCls} style={inputStyle} />
                  <button data-testid="otp-verify" disabled={loading} onClick={verifyOtp} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                    {loading && <Loader2 size={15} className="animate-spin" />}Verify & Login
                  </button>
                  <button onClick={() => setOtpSent(false)} className="text-xs underline w-full" style={{ color: "var(--muted)" }}>Change number</button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
