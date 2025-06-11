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
import Maintenances from "./pages/Maintenances";
import DeletedVisitsList from "./pages/DeletedVisitsList";
import AttendanceForm from "./pages/AttendanceForm";
import { ProductPerformanceChart } from "./pages/ProductsPerformance";
import { AbsentClients } from "./pages/AbsentClient";
import MoneyArchive from "./pages/MoneyArchive";

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
                <ProtectedRoute >
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
                <ProtectedRoute adminOnly>
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
                <ProtectedRoute adminOnly>
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
                <ProtectedRoute adminOnly>
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
                <ProtectedRoute adminOnly>
                  <>
                    <Navbar />
                    <Profits />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenances"
              element={
                <ProtectedRoute adminOnly>
                  <>
                    <Navbar />
                    <Maintenances />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/DeletedVisitsList"
              element={
                <ProtectedRoute adminOnly>
                  <>
                    <Navbar />
                    <DeletedVisitsList />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/AttendanceForm"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <AttendanceForm />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ProductsPerformance"
              element={
                <ProtectedRoute adminOnly>
                  <>
                    <Navbar />
                    <ProductPerformanceChart />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/AbsentClient"
              element={
                <ProtectedRoute adminOnly>
                  <>
                    <Navbar />
                    <AbsentClients  />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/MoneyArchive"
              element={
                <ProtectedRoute adminOnly>
                  <>
                    <Navbar />
                    <MoneyArchive  />
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