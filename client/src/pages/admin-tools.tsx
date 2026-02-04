import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Package,
  Truck,
  Wrench,
  ClipboardList,
  FileText,
  Users,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface RecordCounts {
  assets: number;
  workOrders: number;
  parts: number;
  dvirs: number;
  pmSchedules: number;
  documents: number;
}

interface DataType {
  id: string;
  name: string;
  icon: typeof Truck;
  countKey: keyof RecordCounts;
  description: string;
}

const dataTypeDefinitions: DataType[] = [
  { id: "assets", name: "Assets", icon: Truck, countKey: "assets", description: "Vehicles, trailers, and equipment" },
  { id: "work_orders", name: "Work Orders", icon: Wrench, countKey: "workOrders", description: "Maintenance work orders" },
  { id: "parts", name: "Parts/Inventory", icon: Package, countKey: "parts", description: "Parts and inventory items" },
  { id: "dvirs", name: "DVIRs", icon: ClipboardList, countKey: "dvirs", description: "Driver vehicle inspections" },
  { id: "pm_schedules", name: "PM Schedules", icon: RefreshCw, countKey: "pmSchedules", description: "Preventive maintenance schedules" },
  { id: "documents", name: "Documents", icon: FileText, countKey: "documents", description: "Manuals and attachments" },
];

export default function AdminTools() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);

  // Fetch actual record counts from the database
  const { data: recordCounts, isLoading: countsLoading } = useQuery<RecordCounts>({
    queryKey: ["/api/admin/record-counts"],
  });
  
  const [generatorConfig, setGeneratorConfig] = useState({
    workOrders: 30,
    dvirs: 25,
    predictions: 15,
    purchaseOrders: 10,
  });

  const seedDataMutation = useMutation({
    mutationFn: async (config: typeof generatorConfig) => {
      const response = await apiRequest("POST", "/api/admin/seed-test-data", config);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/record-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dvirs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ 
        title: "Test Data Generated", 
        description: data.message || "Sample data has been added to your organization.",
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Generation Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    setGenerateProgress(10);
    
    try {
      // Show progress while making the API call
      const progressInterval = setInterval(() => {
        setGenerateProgress(prev => Math.min(prev + 15, 85));
      }, 500);
      
      await seedDataMutation.mutateAsync(generatorConfig);
      
      clearInterval(progressInterval);
      setGenerateProgress(100);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerateProgress(0);
      }, 500);
    }
  };

  const handlePurgeData = async () => {
    if (purgeConfirmText !== "DELETE") {
      toast({ title: "Confirmation Required", description: "Please type DELETE to confirm", variant: "destructive" });
      return;
    }
    
    setIsPurging(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPurging(false);
    setIsPurgeDialogOpen(false);
    setPurgeConfirmText("");
    setSelectedTypes([]);
    
    toast({ 
      title: "Data Purged", 
      description: `Successfully purged ${selectedTypes.length} data type(s).`,
    });
  };

  const toggleDataType = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Admin Tools"
        description="Development and maintenance utilities"
      />

      <Alert variant="destructive" data-testid="alert-warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle data-testid="text-alert-title">Warning</AlertTitle>
        <AlertDescription data-testid="text-alert-description">
          These tools can significantly modify your data. Use with caution, especially in production environments.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test Data Generator */}
        <Card data-testid="card-test-data-generator">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-generator-title">
              <Database className="h-5 w-5" />
              Test Data Generator
            </CardTitle>
            <CardDescription data-testid="text-generator-description">
              Generate sample data for testing and demonstration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Generates test data linked to your existing assets. Work orders, DVIRs, and AI predictions will be created with varying dates for realistic testing.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="wo-count" data-testid="label-wo-count">Work Orders</Label>
                <Input 
                  id="wo-count"
                  type="number" 
                  min="0"
                  max="100"
                  value={generatorConfig.workOrders}
                  onChange={(e) => setGeneratorConfig({ ...generatorConfig, workOrders: parseInt(e.target.value) || 0 })}
                  data-testid="input-work-orders-count"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dvirs-count" data-testid="label-dvirs-count">DVIRs</Label>
                <Input 
                  id="dvirs-count"
                  type="number" 
                  min="0"
                  max="100"
                  value={generatorConfig.dvirs}
                  onChange={(e) => setGeneratorConfig({ ...generatorConfig, dvirs: parseInt(e.target.value) || 0 })}
                  data-testid="input-dvirs-count"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="predictions-count" data-testid="label-predictions-count">AI Predictions</Label>
                <Input 
                  id="predictions-count"
                  type="number" 
                  min="0"
                  max="50"
                  value={generatorConfig.predictions}
                  onChange={(e) => setGeneratorConfig({ ...generatorConfig, predictions: parseInt(e.target.value) || 0 })}
                  data-testid="input-predictions-count"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-count" data-testid="label-po-count">Purchase Orders</Label>
                <Input 
                  id="po-count"
                  type="number" 
                  min="0"
                  max="50"
                  value={generatorConfig.purchaseOrders}
                  onChange={(e) => setGeneratorConfig({ ...generatorConfig, purchaseOrders: parseInt(e.target.value) || 0 })}
                  data-testid="input-po-count"
                />
              </div>
            </div>

            {isGenerating && (
              <div className="space-y-2" data-testid="section-generate-progress">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span data-testid="text-generating-status">Generating data...</span>
                  <span data-testid="text-generate-percent">{Math.round(generateProgress)}%</span>
                </div>
                <Progress value={generateProgress} className="h-2" data-testid="progress-generate" />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateTestData}
                disabled={isGenerating}
                className="flex-1"
                data-testid="button-generate-data"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Test Data
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4" data-testid="section-generated-data-info">
              <h4 className="text-sm font-medium mb-2" data-testid="text-generated-includes-title">Generated Data Includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2" data-testid="text-includes-assets">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Realistic asset names and VINs
                </li>
                <li className="flex items-center gap-2" data-testid="text-includes-wo">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Work orders with proper status flow
                </li>
                <li className="flex items-center gap-2" data-testid="text-includes-parts">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Parts with stock levels and prices
                </li>
                <li className="flex items-center gap-2" data-testid="text-includes-dvirs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  DVIR inspections with defects
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data Purge Tool */}
        <Card data-testid="card-data-purge">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive" data-testid="text-purge-title">
              <Trash2 className="h-5 w-5" />
              Data Purge
            </CardTitle>
            <CardDescription data-testid="text-purge-description">
              Remove data from selected categories (use with extreme caution)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {dataTypeDefinitions.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedTypes.includes(type.id);
                const count = recordCounts?.[type.countKey] ?? 0;
                return (
                  <div 
                    key={type.id}
                    className={`flex items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer ${isSelected ? 'border-destructive bg-destructive/5' : 'hover-elevate'}`}
                    onClick={() => toggleDataType(type.id)}
                    data-testid={`purge-type-${type.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleDataType(type.id)}
                        data-testid={`checkbox-${type.id}`}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm" data-testid={`text-type-name-${type.id}`}>{type.name}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-type-desc-${type.id}`}>{type.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-count-${type.id}`}>
                      {countsLoading ? "..." : count.toLocaleString()} records
                    </Badge>
                  </div>
                );
              })}
            </div>

            <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={selectedTypes.length === 0}
                  className="w-full"
                  data-testid="button-purge-data"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Purge Selected Data ({selectedTypes.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive" data-testid="text-purge-dialog-title">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Data Purge
                  </DialogTitle>
                  <DialogDescription data-testid="text-purge-dialog-description">
                    This action cannot be undone. All selected data will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="rounded-lg bg-destructive/10 p-3" data-testid="section-delete-summary">
                    <p className="text-sm font-medium text-destructive mb-2" data-testid="text-delete-heading">You are about to delete:</p>
                    <ul className="text-sm space-y-1">
                      {selectedTypes.map(typeId => {
                        const type = dataTypeDefinitions.find(t => t.id === typeId);
                        const count = recordCounts?.[type?.countKey ?? "assets"] ?? 0;
                        return type && (
                          <li key={typeId} className="flex items-center gap-2" data-testid={`text-delete-item-${typeId}`}>
                            <Trash2 className="h-3 w-3" />
                            {type.name}: {count.toLocaleString()} records
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label data-testid="label-confirm-delete">Type DELETE to confirm</Label>
                    <Input 
                      value={purgeConfirmText}
                      onChange={(e) => setPurgeConfirmText(e.target.value)}
                      placeholder="DELETE"
                      data-testid="input-purge-confirm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPurgeDialogOpen(false)} data-testid="button-cancel-purge">Cancel</Button>
                  <Button 
                    variant="destructive"
                    onClick={handlePurgeData}
                    disabled={isPurging || purgeConfirmText !== "DELETE"}
                    data-testid="button-confirm-purge"
                  >
                    {isPurging ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Purging...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Purge Data
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      <Card data-testid="card-database-stats">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-stats-title">
            <Settings className="h-5 w-5" />
            Database Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {dataTypeDefinitions.map((type) => {
              const Icon = type.icon;
              const count = recordCounts?.[type.countKey] ?? 0;
              return (
                <div key={type.id} className="text-center p-4 rounded-lg border" data-testid={`stat-${type.id}`}>
                  <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold" data-testid={`text-count-${type.id}`}>
                    {countsLoading ? "..." : count.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-stat-name-${type.id}`}>{type.name}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
