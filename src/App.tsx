import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProductProvider } from "./contexts/ProductContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { ClientManagement } from "./pages/ClientManagement";
import { ClientsList } from "./pages/ClientsList";
import { Subscriptions } from "./pages/Subscriptions";
import { Reservations } from "./pages/Reservations";
import { Products } from "./pages/Products";
import Profits from "./pages/Profits";

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Home />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <ClientManagement />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients-list"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <ClientsList />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Subscriptions />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Reservations />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Products />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Profits"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Profits />
                  </>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ProductProvider>
    </AuthProvider>
  );
}

export default App;
