import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Scan, X, Camera, Keyboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ScanResult {
  type: "asset" | "workOrder" | "part";
  data: {
    id: number;
    name?: string;
    assetNumber?: string;
    workOrderNumber?: string;
    partNumber?: string;
    status?: string;
  };
}

export function BarcodeScanner() {
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("GET", `/api/scan/${encodeURIComponent(code)}`);
      return response.json();
    },
    onSuccess: (data: ScanResult) => {
      setResult(data);
      toast({
        title: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Found`,
        description: getResultDescription(data),
      });
    },
    onError: () => {
      toast({
        title: "Not Found",
        description: "No matching asset, part, or work order found for this code.",
        variant: "destructive",
      });
    },
  });

  const getResultDescription = (result: ScanResult): string => {
    switch (result.type) {
      case "asset":
        return `${result.data.assetNumber}: ${result.data.name}`;
      case "workOrder":
        return `${result.data.workOrderNumber}`;
      case "part":
        return `${result.data.partNumber}: ${result.data.name}`;
      default:
        return "Item found";
    }
  };

  const navigateToResult = useCallback(() => {
    if (!result) return;
    setOpen(false);
    switch (result.type) {
      case "asset":
        setLocation(`/assets/${result.data.id}`);
        break;
      case "workOrder":
        setLocation(`/work-orders/${result.data.id}`);
        break;
      case "part":
        setLocation(`/inventory/${result.data.id}`);
        break;
    }
  }, [result, setLocation]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please use manual entry.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      scanMutation.mutate(manualCode.trim());
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setResult(null);
      setManualCode("");
    }
  }, [open, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
          data-testid="button-scan"
        >
          <Scan className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scan or Enter Code
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter asset, work order, or part number..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                data-testid="input-scan-code"
              />
              <Button 
                onClick={handleManualSearch}
                disabled={!manualCode.trim() || scanMutation.isPending}
                data-testid="button-scan-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter an asset number (e.g., VEH-001), work order number (e.g., WO-2026-0001), 
              or part number/barcode to quickly navigate.
            </p>
          </TabsContent>

          <TabsContent value="camera" className="space-y-4 mt-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {scanning ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-32 border-2 border-primary rounded-lg" />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={stopCamera}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button onClick={startCamera}>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Position the barcode or QR code within the frame. 
              For best results, use manual entry with a barcode scanner.
            </p>
          </TabsContent>
        </Tabs>

        {result && (
          <Card className="mt-4 border-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase">
                    {result.type}
                  </p>
                  <p className="font-semibold">{getResultDescription(result)}</p>
                  {result.data.status && (
                    <p className="text-sm text-muted-foreground">
                      Status: {result.data.status}
                    </p>
                  )}
                </div>
                <Button onClick={navigateToResult} data-testid="button-scan-go">
                  Go to {result.type}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
