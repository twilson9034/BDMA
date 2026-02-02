import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Book, ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";
import type { Manual } from "@shared/schema";

interface AssetManualsProps {
  assetId: number | null | undefined;
  assetName?: string;
}

export function AssetManuals({ assetId, assetName }: AssetManualsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: manuals, isLoading } = useQuery<Manual[]>({
    queryKey: [`/api/assets/${assetId}/manuals`],
    enabled: !!assetId && isExpanded,
  });

  if (!assetId) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Book className="h-5 w-5" />
            Asset Manuals & Documentation
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading manuals...</span>
            </div>
          ) : manuals && manuals.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Quick reference manuals for {assetName || "this asset"}. Click to view.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {manuals.map((manual) => (
                  <div
                    key={manual.id}
                    className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    data-testid={`manual-${manual.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <p className="font-medium text-sm truncate">{manual.title}</p>
                        </div>
                        {manual.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {manual.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {manual.manufacturer && (
                            <Badge variant="outline" className="text-xs">
                              {manual.manufacturer}
                            </Badge>
                          )}
                          {manual.model && (
                            <Badge variant="secondary" className="text-xs">
                              {manual.model}
                            </Badge>
                          )}
                          {manual.year && (
                            <Badge variant="secondary" className="text-xs">
                              {manual.year}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {manual.fileUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(manual.fileUrl!, "_blank");
                          }}
                          data-testid={`button-open-manual-${manual.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No manuals linked to this asset. Link manuals from the Manuals page.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
