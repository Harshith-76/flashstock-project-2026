import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { CartDrawer } from './components/common/CartDrawer'
import { Footer } from './components/common/Footer'
import { Navbar } from './components/common/Navbar'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CartPage } from './pages/customer/CartPage'
import { CheckoutPage } from './pages/customer/CheckoutPage'
import { LandingPage } from './pages/customer/LandingPage'
import { OrderConfirmationPage } from './pages/customer/OrderConfirmationPage'
import { ProductDetailPage } from './pages/customer/ProductDetailPage'
import { ProductsPage } from './pages/customer/ProductsPage'
import './index.css'

const CustomerLayout: React.FC = () => (
  <>
    <Navbar />
    <Outlet />
    <Footer />
    <CartDrawer />
  </>
)

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<CustomerLayout />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
          </Route>
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
