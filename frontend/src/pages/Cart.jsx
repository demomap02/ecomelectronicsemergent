import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { cartApi, money } from "@/services/api";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";

export default function Cart() {
  const navigate = useNavigate();
  const { cart, setCart } = useStore();
  const { user, setShowAuth } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <ShoppingBag size={44} className="mx-auto mb-4" style={{ color: "var(--muted)" }} />
        <h2 className="font-head text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Login to view your cart</h2>
        <button onClick={() => setShowAuth(true)} className="btn-primary px-6 py-2.5 text-sm mt-2">Login</button>
      </div>
    );
  }

  const changeQty = async (pid, qty) => { if (qty < 1) return; setCart(await cartApi.update(pid, qty)); };
  const remove = async (pid) => { setCart(await cartApi.remove(pid)); toast.success("Removed from cart"); };

  const shipping = cart.subtotal > 499 || cart.subtotal === 0 ? 0 : 49;
  const total = cart.subtotal + shipping;

  if (!cart.items.length) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <ShoppingBag size={44} className="mx-auto mb-4" style={{ color: "var(--muted)" }} />
        <h2 className="font-head text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Your cart is empty</h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Add some gadgets to get started.</p>
        <button onClick={() => navigate("/products")} className="btn-primary px-6 py-2.5 text-sm">Start Shopping</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="font-head text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>My Cart ({cart.count})</h1>
        {cart.items.map((it) => (
          <div key={it.product.id} data-testid={`cart-item-${it.product.id}`} className="surface border p-3 flex gap-3" style={{ borderColor: "var(--border-c)" }}>
            <img src={it.product.images[0]} alt={it.product.title} className="w-20 h-20 object-contain bg-white rounded cursor-pointer" onClick={() => navigate(`/product/${it.product.id}`)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{it.product.title}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{it.product.brand}</p>
              <p className="text-base font-bold mt-1" style={{ color: "var(--text)" }}>{money(it.product.price)}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border" style={{ borderColor: "var(--border-c)", borderRadius: "var(--radius-c)" }}>
                  <button data-testid={`qty-dec-${it.product.id}`} onClick={() => changeQty(it.product.id, it.qty - 1)} className="p-1.5"><Minus size={13} /></button>
                  <span className="px-3 text-sm font-bold">{it.qty}</span>
                  <button data-testid={`qty-inc-${it.product.id}`} onClick={() => changeQty(it.product.id, it.qty + 1)} className="p-1.5"><Plus size={13} /></button>
                </div>
                <button data-testid={`remove-${it.product.id}`} onClick={() => remove(it.product.id)} className="text-xs flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
            <div className="text-right font-bold text-sm" style={{ color: "var(--text)" }}>{money(it.line_total)}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="surface border p-5 sticky top-28" style={{ borderColor: "var(--border-c)" }}>
          <h3 className="font-head text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Order Summary</h3>
          <div className="space-y-2 text-sm">
            <Row l="Subtotal" v={money(cart.subtotal)} />
            <Row l="Shipping" v={shipping === 0 ? "FREE" : money(shipping)} />
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base" style={{ borderColor: "var(--border-c)", color: "var(--text)" }}>
              <span>Total</span><span data-testid="cart-total">{money(total)}</span>
            </div>
          </div>
          <button data-testid="checkout-btn" onClick={() => navigate("/checkout")} className="btn-primary w-full py-3 text-sm mt-4 flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }) {
  return <div className="flex justify-between" style={{ color: "var(--muted)" }}><span>{l}</span><span style={{ color: "var(--text)", fontWeight: 500 }}>{v}</span></div>;
}
