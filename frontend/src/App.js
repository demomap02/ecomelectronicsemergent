import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { ThemeFab } from "@/components/ThemeFab";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import Delivery from "@/pages/Delivery";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <Header />
            <main className="min-h-[60vh]">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/account" element={<Account />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/delivery" element={<Delivery />} />
              </Routes>
            </main>
            <Footer />
            <AuthModal />
            <ThemeFab />
            <Toaster position="top-right" richColors />
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
