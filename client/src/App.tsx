import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/AppSidebar";
import { PageLoader } from "@/components/LoadingSpinner";

import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import WorkOrders from "@/pages/work-orders";
import WorkOrderNew from "@/pages/work-order-new";
import Assets from "@/pages/assets";
import AssetNew from "@/pages/asset-new";
import Inventory from "@/pages/inventory";
import PMSchedules from "@/pages/pm-schedules";
import DVIRs from "@/pages/dvirs";
import Predictions from "@/pages/predictions";
import Requisitions from "@/pages/requisitions";
import PurchaseOrders from "@/pages/purchase-orders";
import Vendors from "@/pages/vendors";
import Manuals from "@/pages/manuals";
import Reports from "@/pages/reports";
import Feedback from "@/pages/feedback";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/work-orders" component={WorkOrders} />
      <Route path="/work-orders/new" component={WorkOrderNew} />
      <Route path="/assets" component={Assets} />
      <Route path="/assets/new" component={AssetNew} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/pm-schedules" component={PMSchedules} />
      <Route path="/dvirs" component={DVIRs} />
      <Route path="/predictions" component={Predictions} />
      <Route path="/requisitions" component={Requisitions} />
      <Route path="/purchase-orders" component={PurchaseOrders} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/manuals" component={Manuals} />
      <Route path="/reports" component={Reports} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 custom-scrollbar">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
