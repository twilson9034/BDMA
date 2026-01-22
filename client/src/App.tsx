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
import { BarcodeScanner } from "@/components/BarcodeScanner";

import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import WorkOrders from "@/pages/work-orders";
import WorkOrderNew from "@/pages/work-order-new";
import WorkOrderDetail from "@/pages/work-order-detail";
import Assets from "@/pages/assets";
import AssetNew from "@/pages/asset-new";
import AssetDetail from "@/pages/asset-detail";
import Inventory from "@/pages/inventory";
import PartDetail from "@/pages/part-detail";
import PartNew from "@/pages/part-new";
import PMSchedules from "@/pages/pm-schedules";
import PMScheduleDetail from "@/pages/pm-schedule-detail";
import PMScheduleNew from "@/pages/pm-schedule-new";
import DVIRs from "@/pages/dvirs";
import DvirDetail from "@/pages/dvir-detail";
import DvirNew from "@/pages/dvir-new";
import Predictions from "@/pages/predictions";
import Requisitions from "@/pages/requisitions";
import RequisitionDetail from "@/pages/requisition-detail";
import RequisitionNew from "@/pages/requisition-new";
import PurchaseOrders from "@/pages/purchase-orders";
import PurchaseOrderDetail from "@/pages/purchase-order-detail";
import PurchaseOrderNew from "@/pages/purchase-order-new";
import Vendors from "@/pages/vendors";
import VendorDetail from "@/pages/vendor-detail";
import VendorNew from "@/pages/vendor-new";
import Manuals from "@/pages/manuals";
import Reports from "@/pages/reports";
import Feedback from "@/pages/feedback";
import Settings from "@/pages/settings";
import VmrsSettings from "@/pages/vmrs-settings";
import Estimates from "@/pages/estimates";
import EstimateDetail from "@/pages/estimate-detail";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/work-orders" component={WorkOrders} />
      <Route path="/work-orders/new" component={WorkOrderNew} />
      <Route path="/work-orders/:id" component={WorkOrderDetail} />
      <Route path="/assets" component={Assets} />
      <Route path="/assets/new" component={AssetNew} />
      <Route path="/assets/:id" component={AssetDetail} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/new" component={PartNew} />
      <Route path="/inventory/:id" component={PartDetail} />
      <Route path="/pm-schedules" component={PMSchedules} />
      <Route path="/pm-schedules/new" component={PMScheduleNew} />
      <Route path="/pm-schedules/:id" component={PMScheduleDetail} />
      <Route path="/dvirs" component={DVIRs} />
      <Route path="/dvirs/new" component={DvirNew} />
      <Route path="/dvirs/:id" component={DvirDetail} />
      <Route path="/predictions" component={Predictions} />
      <Route path="/requisitions" component={Requisitions} />
      <Route path="/requisitions/new" component={RequisitionNew} />
      <Route path="/requisitions/:id" component={RequisitionDetail} />
      <Route path="/purchase-orders" component={PurchaseOrders} />
      <Route path="/purchase-orders/new" component={PurchaseOrderNew} />
      <Route path="/purchase-orders/:id" component={PurchaseOrderDetail} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendors/new" component={VendorNew} />
      <Route path="/vendors/:id" component={VendorDetail} />
      <Route path="/manuals" component={Manuals} />
      <Route path="/reports" component={Reports} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/estimates" component={Estimates} />
      <Route path="/estimates/:id" component={EstimateDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/vmrs" component={VmrsSettings} />
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
            <div className="flex items-center gap-2">
              <BarcodeScanner />
              <ThemeToggle />
            </div>
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
