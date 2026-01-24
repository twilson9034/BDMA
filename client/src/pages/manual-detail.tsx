import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, FileText, Download, ExternalLink, Calendar, Clock, Book, HardDrive, Sparkles, List, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Manual } from "@shared/schema";

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
  const { toast } = useToast();

  const { data: manual, isLoading, error } = useQuery<Manual>({
    queryKey: ["/api/manuals", params?.id],
    enabled: !!params?.id,
  });

  const handleAiExtraction = async () => {
    setIsExtracting(true);
    // Simulate AI section extraction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSections: ExtractedSection[] = [
      { title: "Engine Oil Change Procedure", page: 45, summary: "Step-by-step guide for engine oil replacement including specifications and torque values." },
      { title: "Brake System Inspection", page: 112, summary: "Complete brake inspection checklist with measurement tolerances and replacement criteria." },
      { title: "Electrical System Diagnostics", page: 178, summary: "Troubleshooting guide for common electrical faults with diagnostic codes." },
      { title: "Transmission Service", page: 234, summary: "Transmission fluid replacement and adjustment procedures." },
      { title: "Cooling System Maintenance", page: 156, summary: "Coolant flush procedure and thermostat testing instructions." },
    ];
    
    setExtractedSections(mockSections);
    setIsExtracting(false);
    toast({
      title: "AI Extraction Complete",
      description: `Found ${mockSections.length} key sections in this manual.`,
    });
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
              {showPdfViewer && displayManual.fileUrl ? (
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
                    <div key={index} className="p-3 rounded-lg border hover-elevate" data-testid={`section-${index}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm" data-testid={`text-section-title-${index}`}>{section.title}</span>
                        <Badge variant="outline" data-testid={`badge-section-page-${index}`}>Page {section.page}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-section-summary-${index}`}>{section.summary}</p>
                    </div>
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

          <Card data-testid="card-vin-patterns">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                VIN Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(displayManual as any).vinPatterns && (displayManual as any).vinPatterns.length > 0 ? (
                <div className="space-y-2">
                  {((displayManual as any).vinPatterns as string[]).map((pattern, index) => (
                    <Badge key={index} variant="outline" className="mr-2" data-testid={`badge-vin-pattern-${index}`}>
                      {pattern}
                    </Badge>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    Assets with VINs matching these patterns will be auto-associated.
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p className="text-sm">No VIN patterns configured</p>
                  <p className="text-xs mt-1">Add patterns like "1FUJG*" to auto-link assets</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" data-testid="button-link-asset">
                Link to Asset
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-edit">
                Edit Details
              </Button>
              <Button variant="destructive" className="w-full" data-testid="button-delete">
                Delete Manual
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
