import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, ClipboardList, Truck, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/LoadingSpinner";

interface ChecklistTemplate {
  id: number;
  name: string;
  description: string | null;
  category: string;
  estimatedMinutes: number | null;
  items: string[] | null;
  isActive: boolean;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  pm_service: "PM Service",
  inspection: "Inspection",
  safety: "Safety",
  pre_trip: "Pre-Trip",
  post_trip: "Post-Trip",
  seasonal: "Seasonal",
  other: "Other",
};

export default function ChecklistTemplates() {
  const [search, setSearch] = useState("");

  const { data: templates, isLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const filteredTemplates = templates?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description?.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Checklist Templates"
        description="Create and manage reusable maintenance checklists for PM schedules and inspections"
        actions={
          <Button asChild data-testid="button-new-template">
            <Link href="/checklist-templates/new">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {(!filteredTemplates || filteredTemplates.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Checklist Templates</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create reusable checklists that can be assigned to PM schedules and assets.
            </p>
            <Button asChild>
              <Link href="/checklist-templates/new">
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Link key={template.id} href={`/checklist-templates/${template.id}`}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-template-${template.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[template.category] || template.category}
                        </Badge>
                      </div>
                    </div>
                    {!template.isActive && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {template.items?.length || 0} tasks
                    </div>
                    {template.estimatedMinutes && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {template.estimatedMinutes} min
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
