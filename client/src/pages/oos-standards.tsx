import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Shield, AlertTriangle, Check, X, FileSearch, RefreshCw, ChevronDown, ChevronUp, Info, AlertCircle } from "lucide-react";
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
              <div className="flex flex-wrap gap-2 mb-4">
                {versions.map((version) => (
                  <Button
                    key={version.id}
                    variant={selectedVersionId === version.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVersionId(version.id)}
                    data-testid={`button-version-${version.id}`}
                  >
                    v{version.version} ({version.rulesCount || 0} rules)
                  </Button>
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
              description="Seed the CVSA starter rules to add regulatory sources"
              action={{
                label: "Seed CVSA Rules",
                onClick: () => seedRulesMutation.mutate(),
              }}
            />
          ) : (
            <div className="grid gap-4">
              {sources.map((source) => (
                <Card key={source.id} data-testid={`source-card-${source.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle>{source.title}</CardTitle>
                        <CardDescription>{source.sourceType}</CardDescription>
                      </div>
                      {source.publishedDate && (
                        <Badge variant="outline">
                          Published: {format(new Date(source.publishedDate), "MMM d, yyyy")}
                        </Badge>
                      )}
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
    </div>
  );
}
