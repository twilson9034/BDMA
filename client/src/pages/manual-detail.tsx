import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, FileText, Download, ExternalLink, Calendar, Clock, Book, HardDrive, Sparkles, List, Car, Loader2, Link2, Pencil, Trash2, Eye, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Manual, Asset } from "@shared/schema";

interface ExtractedSection {
  title: string;
  page: number;
  summary: string;
}

export default function ManualDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/manuals/:id");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSections, setExtractedSections] = useState<ExtractedSection[]>([]);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLinkAssetDialog, setShowLinkAssetDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ExtractedSection | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    manufacturer: "",
    model: "",
    year: 0,
    version: "",
  });
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [newVinPattern, setNewVinPattern] = useState("");
  const { toast } = useToast();
  
  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: manual, isLoading, error } = useQuery<Manual>({
    queryKey: ["/api/manuals", params?.id],
    enabled: !!params?.id,
  });

  // Load AI extracted sections from database when manual loads
  useEffect(() => {
    if (manual?.aiExtractedSections) {
      const sections = manual.aiExtractedSections as ExtractedSection[];
      if (Array.isArray(sections) && sections.length > 0) {
        setExtractedSections(sections);
      }
    }
  }, [manual?.aiExtractedSections]);

  const handleAiExtraction = async () => {
    setIsExtracting(true);
    // Simulate AI section extraction (in real app, this would call an AI API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSections: ExtractedSection[] = [
      { title: "Engine Oil Change Procedure", page: 45, summary: "Step-by-step guide for engine oil replacement including specifications and torque values." },
      { title: "Brake System Inspection", page: 112, summary: "Complete brake inspection checklist with measurement tolerances and replacement criteria." },
      { title: "Electrical System Diagnostics", page: 178, summary: "Troubleshooting guide for common electrical faults with diagnostic codes." },
      { title: "Transmission Service", page: 234, summary: "Transmission fluid replacement and adjustment procedures." },
      { title: "Cooling System Maintenance", page: 156, summary: "Coolant flush procedure and thermostat testing instructions." },
    ];
    
    setExtractedSections(mockSections);
    
    // Save to database
    try {
      await apiRequest("PATCH", `/api/manuals/${params?.id}`, {
        aiExtractedSections: mockSections,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params?.id] });
      toast({
        title: "AI Extraction Complete",
        description: `Found ${mockSections.length} key sections. Saved to database.`,
      });
    } catch (err) {
      toast({
        title: "Extraction Complete",
        description: `Found ${mockSections.length} sections but failed to save.`,
        variant: "destructive",
      });
    }
    
    setIsExtracting(false);
  };

  const handleAddVinPattern = async () => {
    if (!newVinPattern.trim()) return;
    
    const currentPatterns = manual?.vinPatterns || [];
    const updatedPatterns = [...currentPatterns, newVinPattern.trim()];
    
    try {
      await apiRequest("PATCH", `/api/manuals/${params?.id}`, {
        vinPatterns: updatedPatterns,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params?.id] });
      setNewVinPattern("");
      toast({
        title: "VIN Pattern Added",
        description: `Pattern "${newVinPattern}" has been added.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add VIN pattern.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveVinPattern = async (patternToRemove: string) => {
    const currentPatterns = manual?.vinPatterns || [];
    const updatedPatterns = currentPatterns.filter(p => p !== patternToRemove);
    
    try {
      await apiRequest("PATCH", `/api/manuals/${params?.id}`, {
        vinPatterns: updatedPatterns,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params?.id] });
      toast({
        title: "VIN Pattern Removed",
        description: `Pattern has been removed.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove VIN pattern.",
        variant: "destructive",
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Manual>) => {
      return apiRequest("PATCH", `/api/manuals/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      setShowEditDialog(false);
      toast({
        title: "Manual Updated",
        description: "The manual has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update manual.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/manuals/${params?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      toast({
        title: "Manual Deleted",
        description: "The manual has been deleted successfully.",
      });
      navigate("/manuals");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete manual.",
        variant: "destructive",
      });
    },
  });

  const linkAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      return apiRequest("POST", `/api/asset-manuals`, {
        assetId,
        manualId: parseInt(params?.id || "0"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params?.id] });
      setShowLinkAssetDialog(false);
      setSelectedAssetId("");
      toast({
        title: "Asset Linked",
        description: "The asset has been linked to this manual.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to link asset. It may already be linked.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = () => {
    if (displayManual) {
      setEditForm({
        title: displayManual.title || "",
        description: displayManual.description || "",
        manufacturer: displayManual.manufacturer || "",
        model: displayManual.model || "",
        year: displayManual.year || 0,
        version: displayManual.version || "",
      });
      setShowEditDialog(true);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editForm);
  };

  const handleLinkAsset = () => {
    if (selectedAssetId) {
      linkAssetMutation.mutate(parseInt(selectedAssetId));
    }
  };

  const handleSectionClick = (section: ExtractedSection) => {
    setSelectedSection(section);
    setShowSectionDialog(true);
  };

  const handleViewInPdf = () => {
    if (selectedSection && displayManual?.fileUrl) {
      setShowPdfViewer(true);
      setShowSectionDialog(false);
      toast({
        title: "Navigating to section",
        description: `Opening page ${selectedSection.page} - ${selectedSection.title}`,
      });
    }
  };

  const mockManuals: Manual[] = [
    {
      id: 1,
      title: "Freightliner Cascadia Service Manual 2022",
      type: "service",
      description: "Complete service and repair manual for Freightliner Cascadia trucks. Includes detailed diagrams, specifications, torque values, and step-by-step repair procedures for all major systems.",
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
      description: "OEM parts catalog with diagrams for Ford Transit 350 vans. Contains part numbers, illustrations, and assembly groups for all vehicle systems.",
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
      description: "Operator safety and usage guide for Caterpillar GP25N forklifts. Covers pre-operation inspection, safe operating procedures, and daily maintenance checks.",
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
      description: "Scheduled maintenance procedures for Blue Bird Vision school buses. Includes PM intervals, fluid specifications, and inspection checklists.",
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

  const displayManual = manual || mockManuals.find(m => m.id === parseInt(params?.id || "0"));

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

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!displayManual) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/manuals")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Manual Not Found</h1>
        </div>
        <p className="text-muted-foreground">The requested manual could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/manuals")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <PageHeader
        title={displayManual.title}
        description={`${displayManual.manufacturer} ${displayManual.model} (${displayManual.year})`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-download">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button data-testid="button-open">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Manual Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold">{displayManual.title}</h2>
                    <Badge className={`capitalize ${getTypeColor(displayManual.type)}`}>
                      {displayManual.type}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{displayManual.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-pdf-viewer">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Document Preview</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPdfViewer(!showPdfViewer)}
                data-testid="button-toggle-pdf"
              >
                {showPdfViewer ? "Hide Viewer" : "Show Viewer"}
              </Button>
            </CardHeader>
            <CardContent>
              {showPdfViewer ? (
                displayManual.fileUrl && displayManual.fileUrl.startsWith("http") ? (
                  <iframe
                    src={displayManual.fileUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title={displayManual.title}
                    data-testid="iframe-pdf-viewer"
                  />
                ) : (
                  <div className="aspect-[16/10] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm font-medium">PDF Preview Not Available</p>
                      <p className="text-xs mt-1">Upload a PDF file to enable preview</p>
                      {displayManual.fileUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => window.open(displayManual.fileUrl!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Try Opening File
                        </Button>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="aspect-[16/10] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Click "Show Viewer" to preview the document</p>
                    <p className="text-xs mt-1">Or click "Open" to view in a new tab</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-ai-extraction">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Section Extraction
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiExtraction}
                disabled={isExtracting}
                data-testid="button-extract-sections"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Sections
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {extractedSections.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No sections extracted yet</p>
                  <p className="text-xs mt-1">Click "Extract Sections" to use AI to identify key sections</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extractedSections.map((section, index) => (
                    <button
                      key={index}
                      onClick={() => handleSectionClick(section)}
                      className="w-full text-left p-3 rounded-lg border hover-elevate cursor-pointer"
                      data-testid={`section-${index}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm" data-testid={`text-section-title-${index}`}>{section.title}</span>
                        <div className="flex items-center gap-2">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" data-testid={`badge-section-page-${index}`}>Page {section.page}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-section-summary-${index}`}>{section.summary}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>File Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  File Size
                </span>
                <span className="text-sm font-medium">{formatFileSize(displayManual.fileSize)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Name
                </span>
                <span className="text-sm font-medium truncate max-w-[150px]">{displayManual.fileName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Version
                </span>
                <span className="text-sm font-medium">v{displayManual.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created
                </span>
                <span className="text-sm font-medium">{formatDate(displayManual.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Updated
                </span>
                <span className="text-sm font-medium">{formatDate(displayManual.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-vehicle-info">
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Manufacturer</span>
                <span className="font-medium" data-testid="text-manufacturer">{displayManual.manufacturer || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium" data-testid="text-model">{displayManual.model || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Year</span>
                <span className="font-medium" data-testid="text-year">{displayManual.year || "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* VIN Patterns Card */}
          <Card data-testid="card-vin-patterns">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                VIN Patterns
              </CardTitle>
              <CardDescription>
                Add VIN patterns to auto-associate this manual with matching assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 1FUJG*, 3FALF5*"
                  value={newVinPattern}
                  onChange={(e) => setNewVinPattern(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddVinPattern()}
                  data-testid="input-vin-pattern"
                />
                <Button
                  size="icon"
                  onClick={handleAddVinPattern}
                  disabled={!newVinPattern.trim()}
                  data-testid="button-add-vin-pattern"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {displayManual?.vinPatterns && displayManual.vinPatterns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayManual.vinPatterns.map((pattern, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                      data-testid={`badge-vin-pattern-${index}`}
                    >
                      {pattern}
                      <button
                        onClick={() => handleRemoveVinPattern(pattern)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-pattern-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No VIN patterns defined. Use wildcards (*) for partial matching.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowLinkAssetDialog(true)}
                data-testid="button-link-asset"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link to Asset
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleEditClick}
                data-testid="button-edit"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
                data-testid="button-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Manual
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Manual Details</DialogTitle>
            <DialogDescription>Update the manual information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                data-testid="input-edit-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                data-testid="input-edit-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                <Input
                  id="edit-manufacturer"
                  value={editForm.manufacturer}
                  onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                  data-testid="input-edit-manufacturer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model</Label>
                <Input
                  id="edit-model"
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  data-testid="input-edit-model"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={editForm.year}
                  onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value) || 0 })}
                  data-testid="input-edit-year"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-version">Version</Label>
                <Input
                  id="edit-version"
                  value={editForm.version}
                  onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                  data-testid="input-edit-version"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-save-edit">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Asset Dialog */}
      <Dialog open={showLinkAssetDialog} onOpenChange={setShowLinkAssetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link to Asset</DialogTitle>
            <DialogDescription>Select an asset to link this manual to.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="asset-select">Asset</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger id="asset-select" data-testid="select-asset">
                <SelectValue placeholder="Select an asset..." />
              </SelectTrigger>
              <SelectContent>
                {assets?.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id.toString()}>
                    {asset.name} ({asset.assetNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkAssetDialog(false)}>Cancel</Button>
            <Button
              onClick={handleLinkAsset}
              disabled={!selectedAssetId || linkAssetMutation.isPending}
              data-testid="button-confirm-link"
            >
              {linkAssetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Link Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Detail Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              {selectedSection?.title}
            </DialogTitle>
            <DialogDescription>Page {selectedSection?.page}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">{selectedSection?.summary}</p>
            <div className="bg-muted rounded-lg p-4 text-center">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">This section starts on page {selectedSection?.page}</p>
              <p className="text-xs text-muted-foreground mt-1">Click below to view in the PDF viewer</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Close</Button>
            <Button onClick={handleViewInPdf} data-testid="button-view-in-pdf">
              <Eye className="h-4 w-4 mr-2" />
              View in PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Manual</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this manual? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
