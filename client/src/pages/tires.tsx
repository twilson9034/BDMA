import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Package, AlertTriangle, CheckCircle, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import type { Part } from "@shared/schema";

interface TirePart extends Part {
  locationName?: string;
  vendorName?: string;
}

function TreadDepthBadge({ depth, original }: { depth?: number | string | null; original?: number | string | null }) {
  if (!depth) return <span className="text-muted-foreground">-</span>;
  
  const numDepth = typeof depth === 'string' ? parseFloat(depth) : depth;
  const numOriginal = original ? (typeof original === 'string' ? parseFloat(original) : original) : 10;
  
  const percentage = (numDepth / numOriginal) * 100;
  
  let className = "bg-green-500/10 text-green-600 border-green-500/20";
  let icon = <CheckCircle className="h-3 w-3" />;
  
  if (percentage <= 25) {
    className = "bg-red-500/10 text-red-600 border-red-500/20";
    icon = <XCircle className="h-3 w-3" />;
  } else if (percentage <= 50) {
    className = "bg-amber-500/10 text-amber-600 border-amber-500/20";
    icon = <AlertTriangle className="h-3 w-3" />;
  }
  
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      {icon}
      {numDepth.toFixed(1)}/32"
    </Badge>
  );
}

export default function Tires() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: partsData, isLoading } = useQuery<{ parts: TirePart[]; total: number }>({
    queryKey: ["/api/parts"],
  });

  const parts = partsData?.parts || [];
  const tireParts = parts.filter(p => p.isTire);

  const filteredTires = tireParts.filter((part) => {
    const matchesSearch =
      part.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.tireBrand?.toLowerCase().includes(search.toLowerCase()) ||
      part.tireModel?.toLowerCase().includes(search.toLowerCase()) ||
      part.tireSize?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || part.tireType === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: tireParts.length,
    inStock: tireParts.filter(t => parseFloat(t.quantityOnHand?.toString() || "0") > 0).length,
    lowStock: tireParts.filter(t => {
      const onHand = parseFloat(t.quantityOnHand?.toString() || "0");
      const reorder = parseFloat(t.reorderPoint?.toString() || "0");
      return onHand > 0 && onHand <= reorder;
    }).length,
    outOfStock: tireParts.filter(t => parseFloat(t.quantityOnHand?.toString() || "0") === 0).length,
  };

  const columns: Column<TirePart>[] = [
    {
      key: "partNumber",
      header: "Part Number",
      cell: (part: TirePart) => (
        <Link href={`/parts/${part.id}`}>
          <span className="font-medium text-primary hover:underline cursor-pointer" data-testid={`text-tire-part-${part.id}`}>
            {part.partNumber}
          </span>
        </Link>
      ),
    },
    {
      key: "brand",
      header: "Brand / Model",
      cell: (part: TirePart) => (
        <div className="space-y-0.5">
          <div className="font-medium">{part.tireBrand || "-"}</div>
          <div className="text-xs text-muted-foreground">{part.tireModel || ""}</div>
        </div>
      ),
    },
    {
      key: "size",
      header: "Size",
      cell: (part: TirePart) => <span>{part.tireSize || "-"}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (part: TirePart) => (
        <Badge variant="outline" className="capitalize">
          {part.tireType?.replace("_", " ") || "-"}
        </Badge>
      ),
    },
    {
      key: "treadDepth",
      header: "New Tread",
      cell: (part: TirePart) => (
        <TreadDepthBadge depth={part.tireTreadDepthNew} original={10} />
      ),
    },
    {
      key: "qtyOnHand",
      header: "Qty On Hand",
      cell: (part: TirePart) => {
        const qty = parseFloat(part.quantityOnHand?.toString() || "0");
        const reorder = parseFloat(part.reorderPoint?.toString() || "0");
        const isLow = qty > 0 && qty <= reorder;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? "text-amber-600 font-medium" : qty === 0 ? "text-red-600 font-medium" : ""}>
              {qty}
            </span>
            {isLow && <AlertTriangle className="h-3 w-3 text-amber-500" />}
            {qty === 0 && <XCircle className="h-3 w-3 text-red-500" />}
          </div>
        );
      },
    },
    {
      key: "dotCode",
      header: "DOT Code",
      cell: (part: TirePart) => (
        <span className="font-mono text-xs">{part.tireDotCode || "-"}</span>
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (part: TirePart) => <span>{part.unitCost ? `$${parseFloat(part.unitCost).toFixed(2)}` : "-"}</span>,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Tire Inventory"
        description="View and manage tire parts in inventory. Add tires to work orders using tire VMRS codes."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tire SKUs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
            <p className="text-xs text-muted-foreground">In Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-sm">Tire Workflow</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tires are managed through the inventory system. When performing tire work:
              </p>
              <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>Create a work order for the vehicle/equipment</li>
                <li>Add a line with a tire-related VMRS code (17-xxx)</li>
                <li>The system will show tire-specific fields for position, serial numbers, and tread depth</li>
                <li>Consume tire parts from inventory on the work order line</li>
              </ol>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/parts/new")} data-testid="button-add-tire-part">
              <Plus className="h-4 w-4 mr-2" />
              Add Tire Part
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by part number, brand, model, size..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-tires"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-tire-type-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="steer">Steer</SelectItem>
            <SelectItem value="drive">Drive</SelectItem>
            <SelectItem value="trailer">Trailer</SelectItem>
            <SelectItem value="all_position">All Position</SelectItem>
            <SelectItem value="winter">Winter</SelectItem>
            <SelectItem value="summer">Summer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading tire inventory...</div>
      ) : filteredTires.length === 0 ? (
        <EmptyState
          title="No tire parts found"
          description={tireParts.length === 0 
            ? "Add tire parts to inventory to track them here. Mark parts as tires when creating them."
            : "No tires match your current filters."}
          icon={Package}
          action={tireParts.length === 0 ? {
            label: "Add Tire Part",
            onClick: () => navigate("/parts/new"),
          } : undefined}
        />
      ) : (
        <DataTable
          data={filteredTires}
          columns={columns}
          getRowKey={(part) => part.id}
        />
      )}
    </div>
  );
}
