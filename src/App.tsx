import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import ClienteDashboardPage from "./pages/cliente/ClienteDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import ClientsPage from "./pages/ClientsPage";
import SimulatorPage from "./pages/SimulatorPage";
import ProposalsPage from "./pages/ProposalsPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import FunnelPage from "./pages/FunnelPage";
import VendorsPage from "./pages/VendorsPage";
import SettingsPage from "./pages/SettingsPage";
import DocumentsPage from "./pages/DocumentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PrivacyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cliente/login" element={<Navigate to="/login" replace />} />
              
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Client area */}
              <Route 
                path="/cliente" 
                element={
                  <ProtectedRoute allowedRoles={['cliente']}>
                    <ClienteDashboardPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Staff area (admin/vendedor) */}
              <Route element={
                <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/veiculos" element={<VehiclesPage />} />
                <Route path="/clientes" element={<ClientsPage />} />
                <Route path="/simulador" element={<SimulatorPage />} />
                <Route path="/propostas" element={<ProposalsPage />} />
                <Route path="/recibos" element={<ReceiptsPage />} />
                <Route path="/funil" element={<FunnelPage />} />
                <Route path="/documentos" element={<DocumentsPage />} />
                <Route path="/vendedores" element={<VendorsPage />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PrivacyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
