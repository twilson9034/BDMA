import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Users, Star, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { Vendor } from "@shared/schema";

export default function Vendors() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const mockVendors: Vendor[] = [
    {
      id: 1,
      name: "Auto Parts Plus",
      code: "APP-001",
      contactName: "John Smith",
      email: "john@autopartsplus.com",
      phone: "(555) 123-4567",
      address: "123 Industrial Blvd",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      website: "www.autopartsplus.com",
      notes: "Preferred vendor for engine parts",
      rating: "4.50",
      isActive: true,
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      name: "Fleet Supplies Inc",
      code: "FSI-002",
      contactName: "Sarah Johnson",
      email: "sarah@fleetsupplies.com",
      phone: "(555) 234-5678",
      address: "456 Commerce Dr",
      city: "Detroit",
      state: "MI",
      zipCode: "48201",
      website: "www.fleetsupplies.com",
      notes: "Best prices on filters",
      rating: "4.20",
      isActive: true,
      createdAt: new Date("2023-02-10"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      name: "TruckPro Services",
      code: "TPS-003",
      contactName: "Mike Williams",
      email: "mike@truckpro.com",
      phone: "(555) 345-6789",
      address: "789 Truck Lane",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
      website: "www.truckpro.com",
      notes: "24/7 emergency parts delivery",
      rating: "4.80",
      isActive: true,
      createdAt: new Date("2023-03-05"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayVendors = vendors?.length ? vendors : mockVendors;

  const filteredVendors = displayVendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(search.toLowerCase()) ||
    vendor.code?.toLowerCase().includes(search.toLowerCase()) ||
    vendor.contactName?.toLowerCase().includes(search.toLowerCase())
  );

  const renderRating = (rating: string | null) => {
    const numRating = Number(rating) || 0;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < Math.floor(numRating)
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        ))}
        <span className="text-sm ml-1">{numRating.toFixed(1)}</span>
      </div>
    );
  };

  const columns: Column<Vendor>[] = [
    {
      key: "name",
      header: "Vendor",
      cell: (vendor) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{vendor.name}</p>
            <p className="text-xs text-muted-foreground">{vendor.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (vendor) => (
        <div className="text-sm">
          <p className="font-medium">{vendor.contactName}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="text-xs">{vendor.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (vendor) => (
        <div className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          {vendor.phone}
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (vendor) => (
        <span className="text-sm">
          {vendor.city}, {vendor.state}
        </span>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      cell: (vendor) => renderRating(vendor.rating),
    },
    {
      key: "status",
      header: "Status",
      cell: (vendor) => (
        <Badge variant="outline" className={vendor.isActive ? "status-operational border" : "bg-muted"}>
          {vendor.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Vendors"
        description="Manage your parts and service suppliers"
        actions={
          <Button asChild data-testid="button-new-vendor">
            <Link href="/vendors/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {filteredVendors.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="No vendors found"
          description="Add your first vendor to get started"
          action={{
            label: "Add Vendor",
            onClick: () => navigate("/vendors/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredVendors}
          isLoading={isLoading}
          onRowClick={(vendor) => navigate(`/vendors/${vendor.id}`)}
          getRowKey={(vendor) => vendor.id}
          emptyMessage="No vendors found"
        />
      )}
    </div>
  );
}
