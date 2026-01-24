import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, RotateCcw } from "lucide-react";

interface SignatureCaptureProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  title?: string;
}

export function SignatureCapture({ onSave, onCancel, title = "Sign Here" }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground text-center">{title}</div>
      
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
      </div>
      
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          data-testid="button-clear-signature"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Clear
        </Button>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            data-testid="button-cancel-signature"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={saveSignature}
            disabled={!hasDrawn}
            data-testid="button-save-signature"
          >
            <Check className="h-4 w-4 mr-1" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SignatureDisplayProps {
  signatureData: string;
  label: string;
  signedAt?: Date | string | null;
  signedBy?: string | null;
}

export function SignatureDisplay({ signatureData, label, signedAt, signedBy }: SignatureDisplayProps) {
  const formattedDate = signedAt 
    ? new Date(signedAt).toLocaleString()
    : null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="border rounded-lg p-2 bg-white">
        <img 
          src={signatureData} 
          alt={`${label} signature`}
          className="max-h-20 w-auto mx-auto"
          data-testid={`signature-display-${label.toLowerCase().replace(/\s/g, '-')}`}
        />
      </div>
      {(signedBy || formattedDate) && (
        <div className="text-xs text-muted-foreground">
          {signedBy && <span>{signedBy}</span>}
          {signedBy && formattedDate && <span> • </span>}
          {formattedDate && <span>{formattedDate}</span>}
        </div>
      )}
    </div>
  );
}
