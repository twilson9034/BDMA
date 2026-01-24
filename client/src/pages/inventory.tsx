import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Package, AlertTriangle, BarChart3, Download, Barcode, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Part } from "@shared/schema";

interface PartWithVendor extends Part {
  vendorName?: string;
  locationName?: string;
}

interface PaginatedPartsResponse {
  parts: PartWithVendor[];
  total: number;
}

export default function Inventory() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [abcFilter, setAbcFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const { toast } = useToast();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when searching
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery<PaginatedPartsResponse>({
    queryKey: ["/api/parts", { page, limit, search: debouncedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const res = await fetch(`/api/parts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch parts");
      return res.json();
    },
  });

  const parts = data?.parts || [];
  const totalParts = data?.total || 0;
  const totalPages = Math.ceil(totalParts / limit);

  const getStockLevel = (part: PartWithVendor) => {
    const qty = Number(part.quantityOnHand) || 0;
    const reorder = Number(part.reorderPoint) || 0;
    if (qty <= 0) return "out";
    if (qty <= reorder) return "low";
    return "normal";
  };

  // Client-side filtering for category, stock level, and ABC class (search is server-side)
  const filteredParts = parts.filter((part) => {
    const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;
    const stockLevel = getStockLevel(part);
    const matchesStock = stockFilter === "all" || stockLevel === stockFilter;
    const matchesAbc = abcFilter === "all" || part.abcClass === abcFilter;
    return matchesCategory && matchesStock && matchesAbc;
  });

  const handleExportCSV = () => {
    const headers = [
      "Part Number",
      "Name",
      "Description",
      "Category",
      "ABC Class",
      "Unit of Measure",
      "Quantity on Hand",
      "Quantity Reserved",
      "Reorder Point",
      "Reorder Quantity",
      "Unit Cost",
      "Bin Location",
      "Location",
      "Vendor",
      "Barcode",
    ];

    const rows = filteredParts.map((part) => [
      part.partNumber,
      part.name,
      part.description || "",
      part.category || "",
      part.abcClass || "",
      part.unitOfMeasure || "",
      part.quantityOnHand || "0",
      part.quantityReserved || "0",
      part.reorderPoint || "0",
      part.reorderQuantity || "0",
      part.unitCost || "0",
      part.binLocation || "",
      part.locationName || "",
      part.vendorName || "",
      part.barcode || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredParts.length} parts to CSV`,
    });
  };

  const lowStockCount = parts.filter((p) => getStockLevel(p) === "low").length;
  const outOfStockCount = parts.filter((p) => getStockLevel(p) === "out").length;
  const totalValue = parts.reduce(
    (sum, p) => sum + (Number(p.quantityOnHand) || 0) * (Number(p.unitCost) || 0),
    0
  );

  const columns: Column<PartWithVendor>[] = [
    {
      key: "partNumber",
      header: "Part",
      cell: (part) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{part.partNumber}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{part.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (part) => (
        <Badge variant="outline" className="capitalize">
          {part.category}
        </Badge>
      ),
    },
    {
      key: "abcClass",
      header: "ABC",
      cell: (part) => (
        <Badge 
          variant={part.abcClass === "A" ? "destructive" : part.abcClass === "B" ? "default" : "secondary"}
          data-testid={`badge-abc-${part.id}`}
        >
          {part.abcClass || "-"}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Stock Level",
      cell: (part) => {
        const qty = Number(part.quantityOnHand) || 0;
        const reorder = Number(part.reorderPoint) || 1;
        const percentage = Math.min((qty / reorder) * 100, 100);
        const stockLevel = getStockLevel(part);

        return (
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{qty} {part.unitOfMeasure}</span>
              {stockLevel === "low" && (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              {stockLevel === "out" && (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              )}
            </div>
            <Progress
              value={percentage}
              className={`h-2 ${
                stockLevel === "out"
                  ? "[&>div]:bg-red-500"
                  : stockLevel === "low"
                  ? "[&>div]:bg-yellow-500"
                  : "[&>div]:bg-green-500"
              }`}
            />
          </div>
        );
      },
    },
    {
      key: "reorderPoint",
      header: "Reorder At",
      cell: (part) => (
        <span className="text-sm">{Number(part.reorderPoint) || 0}</span>
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (part) => (
        <span className="text-sm font-medium">
          ${Number(part.unitCost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (part) => (
        <div className="text-sm">
          <p>{part.binLocation || "-"}</p>
          <p className="text-xs text-muted-foreground">{part.locationName}</p>
        </div>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      cell: (part) => (
        <div className="flex items-center gap-2">
          {part.barcode ? (
            <>
              <Barcode className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono">{part.barcode}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Inventory"
        description="Manage parts, supplies, and stock levels"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button asChild data-testid="button-new-part">
              <Link href="/inventory/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Parts</p>
                <p className="text-2xl font-bold">{totalParts}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {lowStockCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {outOfStockCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="filters">Filters</SelectItem>
              <SelectItem value="fluids">Fluids</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="brakes">Brakes</SelectItem>
              <SelectItem value="engine">Engine</SelectItem>
              <SelectItem value="transmission">Transmission</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="body">Body</SelectItem>
              <SelectItem value="tires">Tires</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-stock">
              <SelectValue placeholder="Stock Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="normal">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={abcFilter} onValueChange={setAbcFilter}>
            <SelectTrigger className="w-[100px]" data-testid="select-abc">
              <SelectValue placeholder="ABC Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ABC</SelectItem>
              <SelectItem value="A">Class A</SelectItem>
              <SelectItem value="B">Class B</SelectItem>
              <SelectItem value="C">Class C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredParts.length === 0 && !isLoading ? (
        <EmptyState
          icon={Package}
          title="No parts found"
          description={search || categoryFilter !== "all" || stockFilter !== "all"
            ? "Try adjusting your filters"
            : "Add your first part to get started"}
          action={{
            label: "Add Part",
            onClick: () => navigate("/inventory/new"),
          }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredParts}
            isLoading={isLoading}
            onRowClick={(part) => navigate(`/inventory/${part.id}`)}
            getRowKey={(part) => part.id}
            emptyMessage="No parts found"
            rowClassName={(part) => {
              const level = getStockLevel(part);
              return level === "out" ? "bg-red-500/5" : level === "low" ? "bg-yellow-500/5" : "";
            }}
          />
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 flex-wrap mt-4 px-2">
              <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, totalParts)} of {totalParts} parts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={isLoading}
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
