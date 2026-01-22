import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  Truck,
  Package,
  Wrench,
  ShoppingCart,
  Building2,
  MapPin,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ImportJob } from "@shared/schema";

const IMPORT_TYPES = [
  { value: "assets", label: "Assets", icon: Truck, description: "Vehicles, equipment, facilities" },
  { value: "parts", label: "Parts Inventory", icon: Package, description: "Parts with stock levels and pricing" },
  { value: "work_orders", label: "Work Order History", icon: Wrench, description: "Historical work orders" },
  { value: "purchase_orders", label: "Purchase Orders", icon: ShoppingCart, description: "PO history and records" },
  { value: "vendors", label: "Vendors", icon: Building2, description: "Supplier information" },
  { value: "locations", label: "Locations", icon: MapPin, description: "Facilities and sites" },
];

const SCHEMA_MAPPINGS: Record<string, { required: string[]; optional: string[] }> = {
  assets: {
    required: ["assetNumber", "name", "type"],
    optional: ["description", "status", "manufacturer", "model", "serialNumber", "year", "meterType", "currentMeterReading", "notes"],
  },
  parts: {
    required: ["partNumber", "name"],
    optional: ["description", "category", "manufacturer", "unitCost", "quantityOnHand", "reorderPoint", "reorderQuantity", "barcode"],
  },
  work_orders: {
    required: ["assetId", "type", "priority"],
    optional: ["title", "description", "status", "assignedTo", "scheduledDate", "completedDate", "notes"],
  },
  purchase_orders: {
    required: ["vendorId"],
    optional: ["status", "notes", "subtotal", "taxAmount", "shippingAmount", "grandTotal"],
  },
  vendors: {
    required: ["name"],
    optional: ["contactName", "email", "phone", "address", "city", "state", "zipCode", "notes"],
  },
  locations: {
    required: ["name"],
    optional: ["address", "city", "state", "zipCode", "phone"],
  },
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split("\n").filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

export default function BulkImportPage() {
  const { toast } = useToast();
  const [importType, setImportType] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");

  const { data: importJobs = [], refetch } = useQuery<ImportJob[]>({
    queryKey: ["/api/import-jobs"],
    refetchInterval: 5000,
  });

  const importMutation = useMutation({
    mutationFn: async (data: { type: string; fileName: string; data: any[]; mappings: Record<string, string> }) => {
      return apiRequest("POST", "/api/import-jobs", data);
    },
    onSuccess: () => {
      toast({ title: "Import started", description: "Your data is being processed" });
      queryClient.invalidateQueries({ queryKey: ["/api/import-jobs"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCsvHeaders([]);
    setCsvData([]);
    setMappings({});
    setFileName("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (file.name.endsWith(".csv")) {
        const { headers, rows } = parseCSV(data as string);
        setCsvHeaders(headers);
        setCsvData(rows);
        setMappings({});
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = (jsonData[0] as any[]).map(h => String(h || "").trim());
          const rows: Record<string, string>[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const rowValues = jsonData[i] as any[];
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              if (header) {
                row[header] = String(rowValues[index] || "").trim();
              }
            });
            rows.push(row);
          }
          
          setCsvHeaders(headers.filter(h => h !== ""));
          setCsvData(rows);
          setMappings({});
        }
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleMappingChange = (csvColumn: string, schemaField: string) => {
    if (schemaField === "__none__") {
      const newMappings = { ...mappings };
      delete newMappings[csvColumn];
      setMappings(newMappings);
    } else {
      setMappings({ ...mappings, [csvColumn]: schemaField });
    }
  };

  const handleImport = () => {
    if (!importType || csvData.length === 0) return;

    const schema = SCHEMA_MAPPINGS[importType];
    const mappedFields = Object.values(mappings);
    const missingRequired = schema.required.filter(f => !mappedFields.includes(f));

    if (missingRequired.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please map: ${missingRequired.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      type: importType,
      fileName,
      data: csvData,
      mappings,
    });
  };

  const selectedTypeInfo = IMPORT_TYPES.find(t => t.value === importType);
  const schema = importType ? SCHEMA_MAPPINGS[importType] : null;

  const downloadTemplate = (type: string) => {
    const schema = SCHEMA_MAPPINGS[type];
    if (!schema) return;

    const headers = [...schema.required, ...schema.optional];
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk Data Import</h1>
          <p className="text-muted-foreground">Import your existing data for seamless migration</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-imports">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Import Type</CardTitle>
              <CardDescription>Choose what kind of data you want to import</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {IMPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => { setImportType(type.value); resetForm(); }}
                    className={`p-4 rounded-lg border text-left transition-all hover-elevate ${
                      importType === type.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                    data-testid={`button-import-type-${type.value}`}
                  >
                    <type.icon className={`h-6 w-6 mb-2 ${importType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </button>
                ))}
              </div>

              {importType && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(importType)}
                    data-testid="button-download-template"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {importType && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Upload File</CardTitle>
                <CardDescription>
                  Upload a CSV or Excel (.xlsx, .xls) file with your {selectedTypeInfo?.label.toLowerCase()} data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      data-testid="input-import-file"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {fileName || "Click to upload or drag and drop a CSV or Excel file"}
                      </span>
                    </Label>
                  </div>

                  {csvHeaders.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{fileName} - {csvData.length} rows detected</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {csvHeaders.map(header => (
                          <Badge key={header} variant="secondary">{header}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {csvHeaders.length > 0 && schema && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Map Fields</CardTitle>
                <CardDescription>
                  Map your file columns to the system fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {csvHeaders.map(header => (
                      <div key={header} className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="text-sm">{header}</Label>
                        </div>
                        <div className="flex-1">
                          <Select
                            value={mappings[header] || "__none__"}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger data-testid={`select-mapping-${header}`}>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- Skip --</SelectItem>
                              {schema.required.map(field => (
                                <SelectItem key={field} value={field}>
                                  {field} *
                                </SelectItem>
                              ))}
                              {schema.optional.map(field => (
                                <SelectItem key={field} value={field}>
                                  {field}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Mapped {Object.keys(mappings).length} of {csvHeaders.length} columns
                    </div>
                    <Button
                      onClick={handleImport}
                      disabled={importMutation.isPending}
                      data-testid="button-start-import"
                    >
                      {importMutation.isPending ? "Importing..." : "Start Import"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {importJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No imports yet
                </p>
              ) : (
                <div className="space-y-3">
                  {importJobs.slice(0, 10).map((job) => (
                    <div key={job.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm capitalize">{job.type.replace("_", " ")}</span>
                        <Badge variant={
                          job.status === "completed" ? "default" :
                          job.status === "failed" ? "destructive" :
                          job.status === "processing" ? "secondary" : "outline"
                        }>
                          {job.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {job.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                          {job.status === "processing" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{job.fileName}</div>
                      {job.status === "processing" && (
                        <Progress value={(job.processedRows! / job.totalRows!) * 100} className="h-1" />
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="text-green-600">{job.successRows} success</span>
                        {job.errorRows! > 0 && (
                          <span className="text-red-600">{job.errorRows} errors</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {schema && (
            <Card>
              <CardHeader>
                <CardTitle>Field Reference</CardTitle>
                <CardDescription>Available fields for {selectedTypeInfo?.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Required</div>
                    <div className="flex flex-wrap gap-1">
                      {schema.required.map(field => (
                        <Badge key={field} variant="default">{field}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Optional</div>
                    <div className="flex flex-wrap gap-1">
                      {schema.optional.map(field => (
                        <Badge key={field} variant="secondary">{field}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
