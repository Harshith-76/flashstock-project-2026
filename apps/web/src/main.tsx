import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CartDrawer } from './components/common/CartDrawer'
import { Footer } from './components/common/Footer'
import { Navbar } from './components/common/Navbar'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CartPage } from './pages/customer/CartPage'
import { CheckoutPage } from './pages/customer/CheckoutPage'
import { PaymentPage } from './pages/customer/PaymentPage'
import { LandingPage } from './pages/customer/LandingPage'
import { OrderConfirmationPage } from './pages/customer/OrderConfirmationPage'
import { ProductDetailPage } from './pages/customer/ProductDetailPage'
import { ProductsPage } from './pages/customer/ProductsPage'
import { LoginPage, RegisterPage } from './pages/customer/AuthPages'
import { AccountPage, OrderHistoryPage } from './pages/customer/AccountPage'
import { OrderDetailPage } from './pages/customer/OrderDetailPage'
import { AdminPage } from './pages/AdminPage'
import { useAuth } from './context/AuthContext'
import './index.css'

const CustomerLayout: React.FC = () => (
  <>
    <Navbar />
    <Outlet />
    <Footer />
    <CartDrawer />
  </>
)

const RequireAuth: React.FC<{ admin?: boolean }> = ({ admin = false }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-gray-400">Checking your session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && user.role !== 'admin') return <Navigate to="/account" replace />
  return <Outlet />
}

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<CustomerLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/:id" element={<PaymentPage />} />
              <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/account/orders" element={<OrderHistoryPage />} />
              <Route path="/account/orders/:id" element={<OrderDetailPage />} />
            </Route>
          </Route>
          <Route element={<RequireAuth admin />}><Route path="/admin" element={<AdminPage />} /></Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
