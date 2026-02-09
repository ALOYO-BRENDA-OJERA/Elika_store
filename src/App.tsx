import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminOrders from "./pages/admin/Orders";
import AdminMessages from "./pages/admin/Messages";
import NotFound from "./pages/NotFound";
import { AdminGate } from "./pages/admin/AdminGate";

const queryClient = new QueryClient();

const ADMIN_BASE = (import.meta.env.VITE_ADMIN_PATH as string | undefined) || "admin";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path={`/${ADMIN_BASE}`}
              element={(
                <AdminGate adminBase={ADMIN_BASE}>
                  <AdminDashboard />
                </AdminGate>
              )}
            />
            <Route
              path={`/${ADMIN_BASE}/products`}
              element={(
                <AdminGate adminBase={ADMIN_BASE}>
                  <AdminProducts />
                </AdminGate>
              )}
            />
            <Route
              path={`/${ADMIN_BASE}/categories`}
              element={(
                <AdminGate adminBase={ADMIN_BASE}>
                  <AdminCategories />
                </AdminGate>
              )}
            />
            <Route
              path={`/${ADMIN_BASE}/orders`}
              element={(
                <AdminGate adminBase={ADMIN_BASE}>
                  <AdminOrders />
                </AdminGate>
              )}
            />
            <Route
              path={`/${ADMIN_BASE}/messages`}
              element={(
                <AdminGate adminBase={ADMIN_BASE}>
                  <AdminMessages />
                </AdminGate>
              )}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
