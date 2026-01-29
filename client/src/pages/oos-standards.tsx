import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Shield, AlertTriangle, Check, X, FileSearch, RefreshCw, ChevronDown, ChevronUp, Info, AlertCircle, Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/DataTable";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface OosSource {
  id: number;
  orgId: number | null;
  sourceType: string;
  title: string;
  url: string | null;
  publishedDate: string | null;
  editionDate: string | null;
  hash: string | null;
  notes: string | null;
  createdAt: string;
}

interface OosRulesVersion {
  id: number;
  orgId: number | null;
  sourceId: number;
  version: string;
  importedAt: string;
  importedByUserId: string | null;
  isActive: boolean;
  rulesCount: number | null;
}

interface OosRule {
  id: number;
  versionId: number;
  ruleCode: string;
  category: string;
  vmrsSystemCode: string | null;
  title: string;
  conditionJson: object | null;
  severity: string;
  explanationTemplate: string | null;
  isTriageOnly: boolean | null;
  citationText: string | null;
  citationUrl: string | null;
}

interface OosInspection {
  id: number;
  orgId: number;
  inspectionType: string;
  status: string;
  inspectedAt: string | null;
  inspectorName: string | null;
  inspectorBadge: string | null;
  assetId: number | null;
  odometerAtInspection: number | null;
  location: string | null;
  findingsCount: number | null;
  oosCount: number | null;
  overallResult: string | null;
}

const getSeverityBadgeColor = (severity: string | null | undefined) => {
  if (!severity) return "bg-gray-500 text-white";
  switch (severity.toLowerCase()) {
    case "critical": return "bg-red-600 text-white";
    case "high": return "bg-orange-500 text-white";
    case "medium": return "bg-yellow-500 text-black";
    case "low": return "bg-green-600 text-white";
    default: return "bg-gray-500 text-white";
  }
};

const getResultBadgeVariant = (result: string | null): "default" | "secondary" | "destructive" | "outline" => {
  switch (result?.toLowerCase()) {
    case "pass": return "default";
    case "oos": return "destructive";
    case "defects_noted": return "secondary";
    default: return "outline";
  }
};

export default function OosStandards() {
  const { toast } = useToast();
  const [expandedRule, setExpandedRule] = useState<number | null>(null);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<OosSource | null>(null);
  const [sourceForm, setSourceForm] = useState({
    title: "",
    sourceType: "federal",
    url: "",
    notes: "",
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<OosSource[]>({
    queryKey: ["/api/oos/sources"],
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<OosRulesVersion[]>({
    queryKey: ["/api/oos/rules-versions"],
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<OosInspection[]>({
    queryKey: ["/api/oos/inspections"],
  });

  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const { data: rules, isLoading: rulesLoading } = useQuery<OosRule[]>({
    queryKey: ["/api/oos/rules", selectedVersionId],
    enabled: !!selectedVersionId,
  });

  const seedRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/oos/seed-rules", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "OOS Rules Seeded",
        description: `Created ${data.rulesCount} rules in version ${data.version}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/oos/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/oos/rules-versions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed OOS rules", variant: "destructive" });
    },
  });

  const createSourceMutation = useMutation({
    mutationFn: async (data: typeof sourceForm) => {
      const res = await apiRequest("POST", "/api/oos/sources", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Source Created" });
      queryClient.invalidateQueries({ queryKey: ["/api/oos/sources"] });
      setSourceDialogOpen(false);
      resetSourceForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create source", variant: "destructive" });
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof sourceForm }) => {
      const res = await apiRequest("PATCH", `/api/oos/sources/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Source Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/oos/sources"] });
      setSourceDialogOpen(false);
      resetSourceForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update source", variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/oos/sources/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Source Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/oos/sources"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete source", variant: "destructive" });
    },
  });

  const toggleVersionActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/oos/rules-versions/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Version Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/oos/rules-versions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update version", variant: "destructive" });
    },
  });

  const resetSourceForm = () => {
    setEditingSource(null);
    setSourceForm({ title: "", sourceType: "federal", url: "", notes: "" });
  };

  const openCreateSource = () => {
    resetSourceForm();
    setSourceDialogOpen(true);
  };

  const openEditSource = (source: OosSource) => {
    setEditingSource(source);
    setSourceForm({
      title: source.title,
      sourceType: source.sourceType,
      url: source.url || "",
      notes: source.notes || "",
    });
    setSourceDialogOpen(true);
  };

  const handleSourceSubmit = () => {
    if (editingSource) {
      updateSourceMutation.mutate({ id: editingSource.id, data: sourceForm });
    } else {
      createSourceMutation.mutate(sourceForm);
    }
  };

  const inspectionColumns: Column<OosInspection>[] = [
    {
      key: "id",
      header: "ID",
      cell: (inspection) => `#${inspection.id}`,
    },
    {
      key: "inspectionType",
      header: "Type",
      cell: (inspection) => <Badge variant="outline">{inspection.inspectionType}</Badge>,
    },
    {
      key: "inspectedAt",
      header: "Date",
      cell: (inspection) => inspection.inspectedAt ? format(new Date(inspection.inspectedAt), "MMM d, yyyy") : "-",
    },
    {
      key: "status",
      header: "Status",
      cell: (inspection) => <Badge variant="secondary">{inspection.status}</Badge>,
    },
    {
      key: "overallResult",
      header: "Result",
      cell: (inspection) => (
        <Badge variant={getResultBadgeVariant(inspection.overallResult)}>
          {inspection.overallResult || "Pending"}
        </Badge>
      ),
    },
    {
      key: "findingsCount",
      header: "Findings",
      cell: (inspection) => (
        <span>
          {inspection.findingsCount || 0}
          {(inspection.oosCount ?? 0) > 0 && (
            <Badge variant="destructive" className="ml-2">
              {inspection.oosCount} OOS
            </Badge>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="oos-standards-page">
      <PageHeader
        title="OOS Standards"
        description="Out-of-Service compliance rules and inspection management"
        actions={
          <Button
            onClick={() => seedRulesMutation.mutate()}
            disabled={seedRulesMutation.isPending}
            data-testid="button-seed-rules"
          >
            {seedRulesMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Seed CVSA Rules
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-sources-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regulatory Sources</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sources-count">
              {sources?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">CVSA, FMCSA, State-specific</p>
          </CardContent>
        </Card>

        <Card data-testid="card-rules-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-rules-count">
              {versions?.reduce((sum, v) => sum + (v.rulesCount || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Across all versions</p>
          </CardContent>
        </Card>

        <Card data-testid="card-inspections-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspections</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inspections-count">
              {inspections?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {inspections?.filter(i => i.overallResult === "OOS").length || 0} OOS findings
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
          <TabsTrigger value="inspections" data-testid="tab-inspections">Inspections</TabsTrigger>
          <TabsTrigger value="sources" data-testid="tab-sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {versionsLoading ? (
            <Card>
              <CardContent className="py-10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading versions...</span>
              </CardContent>
            </Card>
          ) : !versions?.length ? (
            <EmptyState
              icon={Shield}
              title="No OOS Rules Loaded"
              description="Load the CVSA starter rules to begin compliance checking"
              action={{
                label: "Seed CVSA Rules",
                onClick: () => seedRulesMutation.mutate(),
              }}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                {versions.map((version) => (
                  <div key={version.id} className="flex items-center gap-1">
                    <Button
                      variant={selectedVersionId === version.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVersionId(version.id)}
                      className={!version.isActive ? "opacity-50" : ""}
                      data-testid={`button-version-${version.id}`}
                    >
                      v{version.version} ({version.rulesCount || 0} rules)
                      {version.isActive ? (
                        <Power className="h-3 w-3 ml-1 text-green-500" />
                      ) : (
                        <PowerOff className="h-3 w-3 ml-1 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => toggleVersionActiveMutation.mutate({ id: version.id, isActive: !version.isActive })}
                      disabled={toggleVersionActiveMutation.isPending}
                      title={version.isActive ? "Deactivate version" : "Activate version"}
                      data-testid={`button-toggle-version-${version.id}`}
                    >
                      {version.isActive ? (
                        <PowerOff className="h-3 w-3" />
                      ) : (
                        <Power className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {selectedVersionId && (
                <Card>
                  <CardHeader>
                    <CardTitle>OOS Rules</CardTitle>
                    <CardDescription>
                      Compliance rules for vehicle inspection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rulesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : !rules?.length ? (
                      <p className="text-muted-foreground text-center py-8">No rules in this version</p>
                    ) : (
                      <div className="space-y-3">
                        {rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="border rounded-lg p-4"
                            data-testid={`rule-row-${rule.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">{rule.ruleCode}</Badge>
                                  <Badge className={getSeverityBadgeColor(rule.severity)}>
                                    {rule.severity}
                                  </Badge>
                                  <Badge variant="secondary">{rule.category}</Badge>
                                  {rule.vmrsSystemCode && (
                                    <Badge variant="outline">VMRS: {rule.vmrsSystemCode}</Badge>
                                  )}
                                </div>
                                <h4 className="font-medium mt-2" data-testid={`text-rule-title-${rule.id}`}>
                                  {rule.title}
                                </h4>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                                data-testid={`button-expand-rule-${rule.id}`}
                              >
                                {expandedRule === rule.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {expandedRule === rule.id && (
                              <div className="mt-4 p-3 bg-muted rounded-lg space-y-3">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium">Explanation</p>
                                    <p className="text-sm text-muted-foreground" data-testid={`text-rule-explanation-${rule.id}`}>
                                      {rule.explanationTemplate || "No explanation provided"}
                                    </p>
                                    {rule.isTriageOnly && (
                                      <Badge variant="secondary" className="mt-1">Triage Only - Requires Confirmation</Badge>
                                    )}
                                  </div>
                                </div>

                                {rule.citationText && (
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium">Citation</p>
                                      <p className="text-sm text-muted-foreground">
                                        {rule.citationText}
                                        {rule.citationUrl && (
                                          <a
                                            href={rule.citationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-2 text-primary underline"
                                          >
                                            View Source
                                          </a>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-start gap-2">
                                  <FileSearch className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium">Condition Logic</p>
                                    <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                                      {JSON.stringify(rule.conditionJson, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="inspections">
          {inspectionsLoading ? (
            <Card>
              <CardContent className="py-10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !inspections?.length ? (
            <EmptyState
              icon={FileSearch}
              title="No Inspections"
              description="Create inspections from the DVIR page or asset detail view"
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <DataTable data={inspections} columns={inspectionColumns} getRowKey={(inspection) => inspection.id} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sources">
          <div className="flex justify-end mb-4">
            <Button onClick={openCreateSource} data-testid="button-add-source">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
          {sourcesLoading ? (
            <Card>
              <CardContent className="py-10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !sources?.length ? (
            <EmptyState
              icon={FileSearch}
              title="No Sources Configured"
              description="Add a regulatory source or seed the CVSA starter rules"
              action={{
                label: "Add Source",
                onClick: openCreateSource,
              }}
            />
          ) : (
            <div className="grid gap-4">
              {sources.map((source) => (
                <Card key={source.id} data-testid={`source-card-${source.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle>{source.title}</CardTitle>
                        <CardDescription>{source.sourceType}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {source.publishedDate && (
                          <Badge variant="outline">
                            Published: {format(new Date(source.publishedDate), "MMM d, yyyy")}
                          </Badge>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => openEditSource(source)}
                          data-testid={`button-edit-source-${source.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              data-testid={`button-delete-source-${source.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Source?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{source.title}" and all associated rules. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteSourceMutation.mutate(source.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {source.notes && (
                      <p className="text-sm text-muted-foreground mb-2">{source.notes}</p>
                    )}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline"
                      >
                        View Official Source
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={sourceDialogOpen} onOpenChange={(open) => {
        setSourceDialogOpen(open);
        if (!open) resetSourceForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSource ? "Edit Source" : "Add Source"}</DialogTitle>
            <DialogDescription>
              {editingSource ? "Update regulatory source details" : "Add a new regulatory source for OOS compliance rules"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-title">Title *</Label>
              <Input
                id="source-title"
                value={sourceForm.title}
                onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })}
                placeholder="e.g., CVSA Out-of-Service Criteria"
                data-testid="input-source-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select 
                value={sourceForm.sourceType} 
                onValueChange={(val) => setSourceForm({ ...sourceForm, sourceType: val })}
              >
                <SelectTrigger data-testid="select-source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="federal">Federal (FMCSA)</SelectItem>
                  <SelectItem value="cvsa">CVSA</SelectItem>
                  <SelectItem value="state">State-Specific</SelectItem>
                  <SelectItem value="company">Company Policy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">URL (optional)</Label>
              <Input
                id="source-url"
                value={sourceForm.url}
                onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                placeholder="https://..."
                data-testid="input-source-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-notes">Notes (optional)</Label>
              <Textarea
                id="source-notes"
                value={sourceForm.notes}
                onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                placeholder="Additional notes about this source..."
                rows={3}
                data-testid="input-source-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSourceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSourceSubmit}
              disabled={!sourceForm.title || createSourceMutation.isPending || updateSourceMutation.isPending}
              data-testid="button-save-source"
            >
              {editingSource ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
