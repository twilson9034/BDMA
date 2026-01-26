import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Share2, 
  Plus, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Eye, 
  EyeOff,
  Code,
  Globe,
  Lock,
  RefreshCw,
  Loader2,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Location {
  id: number;
  name: string;
}

interface PublicDashboard {
  id: string;
  name: string;
  type: "fleet_status" | "kpi_summary" | "work_orders" | "custom";
  accessToken: string;
  isActive: boolean;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  locationId: number | null;
}

const mockDashboards: PublicDashboard[] = [
  {
    id: "dash-1",
    name: "Fleet Status Overview",
    type: "fleet_status",
    accessToken: "pk_live_a1b2c3d4e5f6",
    isActive: true,
    expiresAt: null,
    viewCount: 142,
    createdAt: "2024-01-10",
    locationId: null,
  },
  {
    id: "dash-2",
    name: "Monthly KPIs",
    type: "kpi_summary",
    accessToken: "pk_live_x7y8z9w0v1u2",
    isActive: true,
    expiresAt: "2024-06-30",
    viewCount: 89,
    createdAt: "2024-01-15",
    locationId: 1,
  },
];

export default function PublicDashboards() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDashboard, setNewDashboard] = useState({ 
    name: "", 
    type: "fleet_status" as const,
    locationId: null as number | null
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const dashboards = mockDashboards;

  const getLocationName = (locationId: number | null) => {
    if (locationId === null) return "All Locations";
    const location = locations?.find(l => l.id === locationId);
    return location?.name || "Unknown Location";
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const getEmbedCode = (dashboard: PublicDashboard) => {
    const baseUrl = window.location.origin;
    return `<iframe src="${baseUrl}/public/dashboard/${dashboard.id}?token=${dashboard.accessToken}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const getPublicUrl = (dashboard: PublicDashboard) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/dashboard/${dashboard.id}?token=${dashboard.accessToken}`;
  };

  const getDashboardTypeLabel = (type: string) => {
    switch (type) {
      case "fleet_status": return "Fleet Status";
      case "kpi_summary": return "KPI Summary";
      case "work_orders": return "Work Orders";
      case "custom": return "Custom";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Public Dashboards"
        description="Create shareable dashboards with public access links"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-dashboard">
                <Plus className="h-4 w-4 mr-2" />
                Create Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle data-testid="text-create-dialog-title">Create Public Dashboard</DialogTitle>
                <DialogDescription data-testid="text-create-dialog-description">
                  Create a new shareable dashboard with a public access link
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label data-testid="label-dashboard-name">Dashboard Name</Label>
                  <Input 
                    value={newDashboard.name}
                    onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
                    placeholder="e.g., Monthly Fleet Report"
                    data-testid="input-dashboard-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label data-testid="label-dashboard-type">Dashboard Type</Label>
                  <Select 
                    value={newDashboard.type}
                    onValueChange={(val: any) => setNewDashboard({ ...newDashboard, type: val })}
                  >
                    <SelectTrigger data-testid="select-dashboard-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fleet_status" data-testid="option-fleet-status">Fleet Status</SelectItem>
                      <SelectItem value="kpi_summary" data-testid="option-kpi-summary">KPI Summary</SelectItem>
                      <SelectItem value="work_orders" data-testid="option-work-orders">Work Orders</SelectItem>
                      <SelectItem value="custom" data-testid="option-custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label data-testid="label-dashboard-location">Location Filter</Label>
                  <Select 
                    value={newDashboard.locationId?.toString() || "all"}
                    onValueChange={(val) => setNewDashboard({ 
                      ...newDashboard, 
                      locationId: val === "all" ? null : parseInt(val)
                    })}
                  >
                    <SelectTrigger data-testid="select-dashboard-location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="option-location-all">
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          All Locations
                        </span>
                      </SelectItem>
                      {locations?.map((location) => (
                        <SelectItem 
                          key={location.id} 
                          value={location.id.toString()}
                          data-testid={`option-location-${location.id}`}
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {location.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose which location's data this dashboard will display
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
                <Button 
                  onClick={() => {
                    toast({ title: "Dashboard Created", description: "Your public dashboard has been created." });
                    setIsCreateDialogOpen(false);
                    setNewDashboard({ name: "", type: "fleet_status", locationId: null });
                  }}
                  data-testid="button-confirm-create"
                >
                  Create Dashboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id} data-testid={`dashboard-card-${dashboard.id}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2" data-testid={`text-dashboard-name-${dashboard.id}`}>
                  {dashboard.isActive ? (
                    <Globe className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  {dashboard.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1 flex-wrap" data-testid={`text-dashboard-desc-${dashboard.id}`}>
                  <Badge variant="secondary" data-testid={`badge-dashboard-type-${dashboard.id}`}>{getDashboardTypeLabel(dashboard.type)}</Badge>
                  <Badge variant="outline" className="gap-1" data-testid={`badge-dashboard-location-${dashboard.id}`}>
                    <MapPin className="h-3 w-3" />
                    {getLocationName(dashboard.locationId)}
                  </Badge>
                  <span className="text-xs" data-testid={`text-view-count-${dashboard.id}`}>{dashboard.viewCount} views</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={dashboard.isActive} 
                  data-testid={`switch-active-${dashboard.id}`}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground" data-testid={`label-access-token-${dashboard.id}`}>Access Token</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={showToken[dashboard.id] ? dashboard.accessToken : "•".repeat(16)}
                    readOnly
                    className="font-mono text-sm"
                    data-testid={`text-access-token-${dashboard.id}`}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowToken({ ...showToken, [dashboard.id]: !showToken[dashboard.id] })}
                    data-testid={`button-toggle-token-${dashboard.id}`}
                  >
                    {showToken[dashboard.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(dashboard.accessToken, "Access token")}
                    data-testid={`button-copy-token-${dashboard.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground" data-testid={`label-public-url-${dashboard.id}`}>Public URL</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={getPublicUrl(dashboard)}
                    readOnly
                    className="text-sm truncate"
                    data-testid={`input-public-url-${dashboard.id}`}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getPublicUrl(dashboard), "Public URL")}
                    data-testid={`button-copy-url-${dashboard.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(getPublicUrl(dashboard), "_blank")}
                    data-testid={`button-open-${dashboard.id}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="embed" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="embed" className="flex-1" data-testid={`tab-embed-${dashboard.id}`}>Embed Code</TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1" data-testid={`tab-settings-${dashboard.id}`}>Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="embed" className="mt-2">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto" data-testid={`text-embed-code-${dashboard.id}`}>
                      {getEmbedCode(dashboard)}
                    </pre>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(getEmbedCode(dashboard), "Embed code")}
                      data-testid={`button-copy-embed-${dashboard.id}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="settings" className="mt-2 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm" data-testid={`label-settings-location-${dashboard.id}`}>Location Filter</Label>
                    <Select 
                      value={dashboard.locationId?.toString() || "all"}
                      onValueChange={(val) => {
                        toast({ 
                          title: "Location Updated", 
                          description: `Dashboard will now show ${val === "all" ? "all locations" : getLocationName(parseInt(val))}` 
                        });
                      }}
                    >
                      <SelectTrigger data-testid={`select-settings-location-${dashboard.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" data-testid={`option-settings-all-${dashboard.id}`}>
                          <span className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            All Locations
                          </span>
                        </SelectItem>
                        {locations?.map((location) => (
                          <SelectItem 
                            key={location.id} 
                            value={location.id.toString()}
                            data-testid={`option-settings-location-${location.id}-${dashboard.id}`}
                          >
                            <span className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {location.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm" data-testid={`label-expires-${dashboard.id}`}>Expires</span>
                    <span className="text-sm text-muted-foreground" data-testid={`text-expires-${dashboard.id}`}>
                      {dashboard.expiresAt || "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm" data-testid={`label-created-${dashboard.id}`}>Created</span>
                    <span className="text-sm text-muted-foreground" data-testid={`text-created-${dashboard.id}`}>{dashboard.createdAt}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" data-testid={`button-regenerate-${dashboard.id}`}>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Regenerate Token
                    </Button>
                    <Button variant="destructive" size="sm" data-testid={`button-delete-${dashboard.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {dashboards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Public Dashboards</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a public dashboard to share KPIs and metrics with external stakeholders
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
