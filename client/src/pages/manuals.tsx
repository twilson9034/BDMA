import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, BookOpen, FileText, Download, ExternalLink } from "lucide-react";
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
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { Manual } from "@shared/schema";

export default function Manuals() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: manuals, isLoading } = useQuery<Manual[]>({
    queryKey: ["/api/manuals"],
  });

  const mockManuals: Manual[] = [
    {
      id: 1,
      title: "Freightliner Cascadia Service Manual 2022",
      type: "service",
      description: "Complete service and repair manual",
      fileUrl: "/manuals/freightliner-cascadia-2022.pdf",
      fileName: "freightliner-cascadia-2022.pdf",
      fileSize: 45678912,
      manufacturer: "Freightliner",
      model: "Cascadia",
      year: 2022,
      version: "1.0",
      isActive: true,
      uploadedById: "user1",
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      title: "Ford Transit Parts Catalog 2021",
      type: "parts",
      description: "OEM parts catalog with diagrams",
      fileUrl: "/manuals/ford-transit-parts-2021.pdf",
      fileName: "ford-transit-parts-2021.pdf",
      fileSize: 32456789,
      manufacturer: "Ford",
      model: "Transit 350",
      year: 2021,
      version: "2.1",
      isActive: true,
      uploadedById: "user1",
      createdAt: new Date("2023-02-10"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      title: "Caterpillar GP25N Operator Guide",
      type: "operator",
      description: "Operator safety and usage guide",
      fileUrl: "/manuals/cat-gp25n-operator.pdf",
      fileName: "cat-gp25n-operator.pdf",
      fileSize: 12345678,
      manufacturer: "Caterpillar",
      model: "GP25N",
      year: 2020,
      version: "1.5",
      isActive: true,
      uploadedById: "user1",
      createdAt: new Date("2023-03-05"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 4,
      title: "Blue Bird Vision Maintenance Guide",
      type: "maintenance",
      description: "Scheduled maintenance procedures",
      fileUrl: "/manuals/bluebird-vision-maintenance.pdf",
      fileName: "bluebird-vision-maintenance.pdf",
      fileSize: 28765432,
      manufacturer: "Blue Bird",
      model: "Vision",
      year: 2023,
      version: "1.0",
      isActive: true,
      uploadedById: "user1",
      createdAt: new Date("2023-04-12"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayManuals = manuals?.length ? manuals : mockManuals;

  const filteredManuals = displayManuals.filter((manual) => {
    const matchesSearch =
      manual.title.toLowerCase().includes(search.toLowerCase()) ||
      manual.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      manual.model?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || manual.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "parts":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "service":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "operator":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Manuals"
        description="Maintenance and parts manuals library"
        actions={
          <Button asChild data-testid="button-upload-manual">
            <Link href="/manuals/upload">
              <Plus className="h-4 w-4 mr-2" />
              Upload Manual
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search manuals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="parts">Parts</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredManuals.length === 0 && !isLoading ? (
        <EmptyState
          icon={BookOpen}
          title="No manuals found"
          description="Upload your first manual to get started"
          action={{
            label: "Upload Manual",
            onClick: () => navigate("/manuals/upload"),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredManuals.map((manual) => (
            <Card
              key={manual.id}
              className="hover-elevate transition-all cursor-pointer"
              onClick={() => navigate(`/manuals/${manual.id}`)}
              data-testid={`manual-card-${manual.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2">
                        {manual.title}
                      </h3>
                      <Badge className={`flex-shrink-0 capitalize ${getTypeColor(manual.type)}`}>
                        {manual.type}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {manual.manufacturer} {manual.model} ({manual.year})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(manual.fileSize)} • v{manual.version}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {manual.description}
                  </span>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
