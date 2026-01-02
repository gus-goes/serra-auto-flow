import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import ClientsPage from "./pages/ClientsPage";
import SimulatorPage from "./pages/SimulatorPage";
import ProposalsPage from "./pages/ProposalsPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import FunnelPage from "./pages/FunnelPage";
import VendorsPage from "./pages/VendorsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/veiculos" element={<VehiclesPage />} />
              <Route path="/clientes" element={<ClientsPage />} />
              <Route path="/simulador" element={<SimulatorPage />} />
              <Route path="/propostas" element={<ProposalsPage />} />
              <Route path="/recibos" element={<ReceiptsPage />} />
              <Route path="/funil" element={<FunnelPage />} />
              <Route path="/vendedores" element={<VendorsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
