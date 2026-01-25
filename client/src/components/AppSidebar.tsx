import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Wrench,
  Truck,
  Package,
  ClipboardList,
  ClipboardCheck,
  Calendar,
  ShoppingCart,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  MessageSquare,
  AlertTriangle,
  FileText,
  Calculator,
  ChevronDown,
  Upload,
  PackageCheck,
  PackageSearch,
  ListChecks,
  Bell,
  Boxes,
  RefreshCw,
  Clock,
  Circle,
  Mail,
  Share2,
  Database,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Work Orders", url: "/work-orders", icon: Wrench },
  { title: "Assets", url: "/assets", icon: Truck },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Tires", url: "/tires", icon: Circle },
  { title: "Part Kits", url: "/part-kits", icon: Boxes },
  { title: "Cycle Counts", url: "/cycle-counts", icon: RefreshCw },
];

const operationsItems = [
  { title: "PM Schedules", url: "/pm-schedules", icon: Calendar },
  { title: "PM Dues", url: "/pm-dues", icon: Clock },
  { title: "Checklists", url: "/checklist-templates", icon: ClipboardCheck },
  { title: "DVIRs", url: "/dvirs", icon: ClipboardList },
  { title: "Ready for Review", url: "/ready-for-review", icon: ListChecks },
  { title: "Predictions", url: "/predictions", icon: AlertTriangle },
  { title: "Estimates", url: "/estimates", icon: Calculator },
];

const procurementItems = [
  { title: "Analytics", url: "/procurement-analytics", icon: BarChart3 },
  { title: "Requisitions", url: "/requisitions", icon: FileText },
  { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart },
  { title: "Receiving", url: "/receiving", icon: PackageCheck },
  { title: "Reorder Alerts", url: "/reorder-alerts", icon: Bell },
  { title: "Part Requests", url: "/part-requests", icon: PackageSearch },
  { title: "Vendors", url: "/vendors", icon: Users },
];

const resourceItems = [
  { title: "Manuals", url: "/manuals", icon: BookOpen },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Messages", url: "/messages", icon: Mail },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Data Import", url: "/import", icon: Upload },
  { title: "Public Dashboards", url: "/public-dashboards", icon: Share2 },
  { title: "Admin Tools", url: "/admin-tools", icon: Database },
];

const toolsItems = [
  { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  { title: "Labor Rate Calculator", url: "/labor-rate-calculator", icon: Calculator },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const NavItem = ({ item }: { item: { title: string; url: string; icon: any } }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            B
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight">BDMA</span>
            <span className="text-xs text-muted-foreground">Best Damn Maintenance</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2 hover-elevate rounded">
                Operations
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {operationsItems.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2 hover-elevate rounded">
                Procurement
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {procurementItems.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2 hover-elevate rounded">
                Resources
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {resourceItems.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2 hover-elevate rounded">
                Tools
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {toolsItems.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                  <Link href="/settings" data-testid="nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 w-full rounded-md p-2 hover-elevate text-left"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2" data-testid="menu-profile">
                  <User className="h-4 w-4" />
                  <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/api/logout" className="flex items-center gap-2 text-destructive" data-testid="menu-logout">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
