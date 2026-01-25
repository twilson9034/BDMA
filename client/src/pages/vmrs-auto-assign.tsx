import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Check, X, RefreshCw, Sparkles, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import type { Part } from "@shared/schema";

interface VmrsSuggestion {
  systemCode: string;
  systemDescription?: string;
  assemblyCode?: string;
  assemblyDescription?: string;
  componentCode?: string;
  componentDescription?: string;
  safetySystem?: string;
  confidence: number;
  explanation: string;
}

interface PartSuggestionResult {
  partId: number;
  partNumber: string;
  partName: string;
  suggestions: VmrsSuggestion[];
  topSuggestion: VmrsSuggestion | null;
}

interface BulkSuggestResponse {
  processed: number;
  results: PartSuggestionResult[];
  highConfidence: number;
}

interface PartsResponse {
  parts: Part[];
  total: number;
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return "bg-green-600 text-white";
  if (confidence >= 0.75) return "bg-green-500 text-white";
  if (confidence >= 0.5) return "bg-yellow-500 text-black";
  return "bg-orange-500 text-white";
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.75) return "Good";
  if (confidence >= 0.5) return "Medium";
  return "Low";
};

export default function VmrsAutoAssign() {
  const { toast } = useToast();
  const [expandedPart, setExpandedPart] = useState<number | null>(null);
  const [suggestionResults, setSuggestionResults] = useState<PartSuggestionResult[]>([]);

  const { data: partsData, isLoading: partsLoading } = useQuery<PartsResponse>({
    queryKey: ["/api/parts"],
  });

  const suggestBulkMutation = useMutation({
    mutationFn: async (limit: number) => {
      const res = await apiRequest("POST", "/api/vmrs/suggest-bulk", { limit });
      return res.json() as Promise<BulkSuggestResponse>;
    },
    onSuccess: (data) => {
      setSuggestionResults(data.results);
      toast({
        title: "Suggestions Generated",
        description: `Processed ${data.processed} parts. ${data.highConfidence} have high confidence matches.`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate VMRS suggestions", variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ partId, suggestion }: { partId: number; suggestion: VmrsSuggestion }) => {
      const res = await apiRequest("POST", "/api/vmrs/accept", {
        partId,
        suggestion,
        acceptedSystemCode: suggestion.systemCode,
        acceptedAssemblyCode: suggestion.assemblyCode,
        acceptedComponentCode: suggestion.componentCode,
        acceptedSafetySystem: suggestion.safetySystem,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      setSuggestionResults(prev => prev.filter(r => r.partId !== variables.partId));
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Accepted", description: "VMRS code assigned to part" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept suggestion", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ partId, suggestion }: { partId: number; suggestion: VmrsSuggestion }) => {
      const res = await apiRequest("POST", "/api/vmrs/reject", { partId, suggestion });
      return res.json();
    },
    onSuccess: (_, variables) => {
      setSuggestionResults(prev => prev.filter(r => r.partId !== variables.partId));
      toast({ title: "Rejected", description: "Suggestion rejected and recorded for learning" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject suggestion", variant: "destructive" });
    },
  });

  const seedDictionaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vmrs/seed-dictionary", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Dictionary Seeded", description: `Added ${data.insertedCount} VMRS rules` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed dictionary", variant: "destructive" });
    },
  });

  const allParts = partsData?.parts || [];
  const partsWithoutVmrs = allParts.filter(p => !p.vmrsCode);
  const partsWithVmrs = allParts.filter(p => p.vmrsCode);

  const pendingCount = suggestionResults.length;
  const highConfidenceCount = suggestionResults.filter(r => r.topSuggestion && r.topSuggestion.confidence >= 0.9).length;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="vmrs-auto-assign-page">
      <PageHeader
        title="VMRS Auto-Assign"
        description="Automatically suggest and assign VMRS codes to parts using keyword matching"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-parts-without-vmrs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Without VMRS</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-parts-without-count">{partsWithoutVmrs.length}</div>
            <p className="text-xs text-muted-foreground">of {allParts.length} total parts</p>
          </CardContent>
        </Card>

        <Card data-testid="card-parts-with-vmrs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts With VMRS</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-parts-with-count">{partsWithVmrs.length}</div>
            <Progress value={(partsWithVmrs.length / Math.max(allParts.length, 1)) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-pending-review">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">{highConfidenceCount} high confidence</p>
          </CardContent>
        </Card>

        <Card data-testid="card-actions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full"
              onClick={() => suggestBulkMutation.mutate(50)}
              disabled={suggestBulkMutation.isPending || partsWithoutVmrs.length === 0}
              data-testid="button-run-suggestions"
            >
              {suggestBulkMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Suggestions
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => seedDictionaryMutation.mutate()}
              disabled={seedDictionaryMutation.isPending}
              data-testid="button-seed-dictionary"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Seed Dictionary
            </Button>
          </CardContent>
        </Card>
      </div>

      {partsLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading parts...</span>
            </div>
          </CardContent>
        </Card>
      ) : suggestionResults.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No Pending Suggestions"
          description={partsWithoutVmrs.length > 0 
            ? `${partsWithoutVmrs.length} parts need VMRS codes. Click "Run Suggestions" to generate AI-powered recommendations.`
            : "All parts have VMRS codes assigned. Great job!"
          }
          action={partsWithoutVmrs.length > 0 ? {
            label: "Run Suggestions",
            onClick: () => suggestBulkMutation.mutate(50),
          } : undefined}
        />
      ) : (
        <Card data-testid="card-suggestions-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Suggested VMRS Assignments
              <Badge variant="secondary">{suggestionResults.length} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestionResults.map((result) => (
                <div
                  key={result.partId}
                  className="border rounded-lg p-4 space-y-3"
                  data-testid={`suggestion-row-${result.partId}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" data-testid={`text-part-number-${result.partId}`}>
                          {result.partNumber}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {result.partName}
                        </span>
                      </div>
                      {result.topSuggestion && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge className={getConfidenceColor(result.topSuggestion.confidence)}>
                            {(result.topSuggestion.confidence * 100).toFixed(0)}% {getConfidenceLabel(result.topSuggestion.confidence)}
                          </Badge>
                          <Badge variant="outline">
                            {result.topSuggestion.systemCode}: {result.topSuggestion.systemDescription || "Unknown System"}
                          </Badge>
                          {result.topSuggestion.assemblyCode && (
                            <Badge variant="secondary">
                              {result.topSuggestion.assemblyCode}: {result.topSuggestion.assemblyDescription || "Assembly"}
                            </Badge>
                          )}
                          {result.topSuggestion.safetySystem && (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Safety: {result.topSuggestion.safetySystem}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.topSuggestion && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setExpandedPart(expandedPart === result.partId ? null : result.partId)}
                                  data-testid={`button-expand-${result.partId}`}
                                >
                                  {expandedPart === result.partId ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View explanation</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            size="sm"
                            onClick={() => acceptMutation.mutate({ partId: result.partId, suggestion: result.topSuggestion! })}
                            disabled={acceptMutation.isPending}
                            data-testid={`button-accept-${result.partId}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate({ partId: result.partId, suggestion: result.topSuggestion! })}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-${result.partId}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {expandedPart === result.partId && result.topSuggestion && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Why this suggestion?</p>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-explanation-${result.partId}`}>
                            {result.topSuggestion.explanation}
                          </p>
                        </div>
                      </div>
                      
                      {result.suggestions.length > 1 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Alternative suggestions:</p>
                          <div className="space-y-2">
                            {result.suggestions.slice(1).map((alt, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {(alt.confidence * 100).toFixed(0)}%
                                  </Badge>
                                  <span>{alt.systemCode}: {alt.systemDescription}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => acceptMutation.mutate({ partId: result.partId, suggestion: alt })}
                                  data-testid={`button-accept-alt-${result.partId}-${idx}`}
                                >
                                  Use This
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
