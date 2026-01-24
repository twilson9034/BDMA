import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Package, AlertTriangle, BarChart3 } from "lucide-react";
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

export default function Inventory() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  const { data: parts, isLoading } = useQuery<PartWithVendor[]>({
    queryKey: ["/api/parts"],
  });

  const mockParts: PartWithVendor[] = [
    {
      id: 1,
      partNumber: "OIL-15W40-001",
      name: "Engine Oil 15W-40 (5 Gallon)",
      description: "Heavy duty diesel engine oil",
      category: "fluids",
      abcClass: "A",
      unitOfMeasure: "gallon",
      quantityOnHand: "3",
      quantityReserved: "1",
      reorderPoint: "10",
      reorderQuantity: "20",
      unitCost: "45.99",
      locationId: 1,
      locationName: "Main Warehouse",
      binLocation: "A-01-03",
      vendorId: 1,
      vendorName: "Auto Parts Plus",
      vendorPartNumber: "MOB-15W40-5G",
      barcode: "123456789012",
      imageUrl: null,
      isActive: true,
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      partNumber: "BRK-HD-002",
      name: "Brake Pads Heavy Duty (Set)",
      description: "Commercial vehicle brake pads",
      category: "brakes",
      abcClass: "A",
      unitOfMeasure: "set",
      quantityOnHand: "2",
      quantityReserved: "0",
      reorderPoint: "8",
      reorderQuantity: "12",
      unitCost: "89.50",
      locationId: 1,
      locationName: "Main Warehouse",
      binLocation: "B-02-01",
      vendorId: 1,
      vendorName: "Auto Parts Plus",
      vendorPartNumber: "BP-HD-COMM",
      barcode: "123456789013",
      imageUrl: null,
      isActive: true,
      createdAt: new Date("2023-02-10"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      partNumber: "AIR-STD-003",
      name: "Air Filter Standard",
      description: "Standard engine air filter",
      category: "filters",
      abcClass: "B",
      unitOfMeasure: "each",
      quantityOnHand: "5",
      quantityReserved: "2",
      reorderPoint: "15",
      reorderQuantity: "25",
      unitCost: "24.99",
      locationId: 1,
      locationName: "Main Warehouse",
      binLocation: "A-03-02",
      vendorId: 2,
      vendorName: "Fleet Supplies Inc",
      vendorPartNumber: "AF-STD-001",
      barcode: "123456789014",
      imageUrl: null,
      isActive: true,
      createdAt: new Date("2023-03-05"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 4,
      partNumber: "FUEL-FLT-004",
      name: "Fuel Filter Premium",
      description: "Premium diesel fuel filter",
      category: "filters",
      abcClass: "A",
      unitOfMeasure: "each",
      quantityOnHand: "18",
      quantityReserved: "3",
      reorderPoint: "10",
      reorderQuantity: "20",
      unitCost: "35.75",
      locationId: 1,
      locationName: "Main Warehouse",
      binLocation: "A-03-04",
      vendorId: 2,
      vendorName: "Fleet Supplies Inc",
      vendorPartNumber: "FF-PREM-001",
      barcode: "123456789015",
      imageUrl: null,
      isActive: true,
      createdAt: new Date("2023-04-12"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayParts = parts?.length ? parts : mockParts;

  const getStockLevel = (part: PartWithVendor) => {
    const qty = Number(part.quantityOnHand) || 0;
    const reorder = Number(part.reorderPoint) || 0;
    if (qty <= 0) return "out";
    if (qty <= reorder) return "low";
    return "normal";
  };

  const filteredParts = displayParts.filter((part) => {
    const matchesSearch =
      part.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      part.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;
    const stockLevel = getStockLevel(part);
    const matchesStock = stockFilter === "all" || stockLevel === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockCount = displayParts.filter((p) => getStockLevel(p) === "low").length;
  const outOfStockCount = displayParts.filter((p) => getStockLevel(p) === "out").length;
  const totalValue = displayParts.reduce(
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
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Inventory"
        description="Manage parts, supplies, and stock levels"
        actions={
          <Button asChild data-testid="button-new-part">
            <Link href="/inventory/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Parts</p>
                <p className="text-2xl font-bold">{displayParts.length}</p>
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
      )}
    </div>
  );
}
