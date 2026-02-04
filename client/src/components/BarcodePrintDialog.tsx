import { useState } from "react";
import { Printer, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PartToPrint {
  id: number;
  partNumber: string;
  name: string;
  barcode: string | null;
}

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: PartToPrint[];
  defaultQuantity?: number;
  title?: string;
  description?: string;
}

type LabelSize = "small" | "medium" | "large";

const labelSizes: Record<LabelSize, { width: string; height: string; fontSize: string; barcodeSize: string }> = {
  small: { width: "2in", height: "1in", fontSize: "8px", barcodeSize: "36px" },
  medium: { width: "3in", height: "1.5in", fontSize: "10px", barcodeSize: "48px" },
  large: { width: "4in", height: "2in", fontSize: "12px", barcodeSize: "60px" },
};

export function BarcodePrintDialog({
  open,
  onOpenChange,
  parts,
  defaultQuantity = 1,
  title = "Print Barcode Labels",
  description = "Configure and print barcode labels for the selected parts",
}: BarcodePrintDialogProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    parts.reduce((acc, part) => ({ ...acc, [part.id]: defaultQuantity }), {})
  );
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [includePartName, setIncludePartName] = useState(true);

  const updateQuantity = (partId: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [partId]: Math.max(1, (prev[partId] || defaultQuantity) + delta),
    }));
  };

  const setQuantity = (partId: number, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [partId]: Math.max(1, value),
    }));
  };

  const getTotalLabels = () => {
    return parts.reduce((total, part) => total + (quantities[part.id] || defaultQuantity), 0);
  };

  const handlePrint = () => {
    const size = labelSizes[labelSize];
    const printWindow = window.open("", "_blank", "width=800,height=600");
    
    if (!printWindow) {
      alert("Please allow popups to print barcode labels");
      return;
    }

    const labelsHtml = parts
      .filter((part) => part.barcode)
      .flatMap((part) => {
        const qty = quantities[part.id] || defaultQuantity;
        return Array(qty)
          .fill(null)
          .map(
            (_, index) => `
            <div class="label" style="width: ${size.width}; height: ${size.height};">
              ${includePartName ? `<div class="part-name">${part.name}</div>` : ""}
              <div class="barcode" style="font-size: ${size.barcodeSize};">*${part.barcode}*</div>
              <div class="barcode-text" style="font-size: ${size.fontSize};">${part.barcode}</div>
              <div class="part-number" style="font-size: ${size.fontSize};">${part.partNumber}</div>
            </div>
          `
          );
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels</title>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 0.25in;
            }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 0.125in;
            }
            .label {
              border: 1px dashed #ccc;
              padding: 0.125in;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .part-name {
              font-size: ${size.fontSize};
              font-weight: bold;
              text-align: center;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              margin-bottom: 4px;
            }
            .barcode {
              font-family: 'Libre Barcode 39', monospace;
              line-height: 1;
            }
            .barcode-text {
              font-family: monospace;
              margin-top: 4px;
            }
            .part-number {
              font-size: ${size.fontSize};
              color: #666;
              margin-top: 2px;
            }
            .no-print {
              margin-top: 20px;
              text-align: center;
            }
            .no-print button {
              padding: 10px 20px;
              font-size: 14px;
              cursor: pointer;
              margin: 0 5px;
            }
            @media print {
              .no-print { display: none; }
              .label { border: 1px solid #000; }
              body { padding: 0; }
            }
            @page {
              margin: 0.25in;
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelsHtml}
          </div>
          <div class="no-print">
            <button onclick="window.print()">Print Labels</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const partsWithBarcodes = parts.filter((p) => p.barcode);
  const partsWithoutBarcodes = parts.filter((p) => !p.barcode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Label Size</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger data-testid="select-label-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (2" x 1")</SelectItem>
                  <SelectItem value="medium">Medium (3" x 1.5")</SelectItem>
                  <SelectItem value="large">Large (4" x 2")</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="includePartName"
                checked={includePartName}
                onChange={(e) => setIncludePartName(e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-include-part-name"
              />
              <Label htmlFor="includePartName" className="text-sm">
                Include part name
              </Label>
            </div>
          </div>

          <Separator />

          {partsWithBarcodes.length > 0 && (
            <div className="space-y-3">
              <Label>Parts to Print ({partsWithBarcodes.length})</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {partsWithBarcodes.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between p-2 rounded border border-border"
                    data-testid={`print-part-${part.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{part.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{part.barcode}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(part.id, -1)}
                        disabled={quantities[part.id] <= 1}
                        data-testid={`button-decrease-${part.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={quantities[part.id] || defaultQuantity}
                        onChange={(e) => setQuantity(part.id, parseInt(e.target.value) || 1)}
                        className="w-14 h-7 text-center text-sm"
                        data-testid={`input-quantity-${part.id}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(part.id, 1)}
                        data-testid={`button-increase-${part.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {partsWithoutBarcodes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Parts without barcodes ({partsWithoutBarcodes.length})
              </Label>
              <div className="flex flex-wrap gap-1">
                {partsWithoutBarcodes.map((part) => (
                  <Badge key={part.id} variant="secondary" className="gap-1">
                    <X className="h-3 w-3" />
                    {part.partNumber}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These parts need barcodes generated before printing.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            Total: {getTotalLabels()} label{getTotalLabels() !== 1 ? "s" : ""}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-print">
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={partsWithBarcodes.length === 0}
            data-testid="button-print-labels"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function printSingleBarcode(part: PartToPrint, labelSize: LabelSize = "medium") {
  if (!part.barcode) {
    alert("This part does not have a barcode assigned.");
    return;
  }

  const size = labelSizes[labelSize];
  const printWindow = window.open("", "_blank", "width=400,height=300");
  
  if (!printWindow) {
    alert("Please allow popups to print barcode labels");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Barcode - ${part.partNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 20px; 
          }
          .label {
            border: 1px dashed #ccc;
            padding: 16px;
            text-align: center;
            width: ${size.width};
          }
          .part-name {
            font-size: ${size.fontSize};
            font-weight: bold;
            margin-bottom: 8px;
          }
          .barcode {
            font-family: 'Libre Barcode 39', monospace;
            font-size: ${size.barcodeSize};
            line-height: 1;
          }
          .barcode-text {
            font-family: monospace;
            font-size: ${size.fontSize};
            margin-top: 8px;
          }
          .no-print { margin-top: 20px; }
          .no-print button { padding: 10px 20px; cursor: pointer; margin: 0 5px; }
          @media print {
            .no-print { display: none; }
            .label { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="part-name">${part.name}</div>
          <div class="barcode">*${part.barcode}*</div>
          <div class="barcode-text">${part.barcode}</div>
        </div>
        <div class="no-print">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
