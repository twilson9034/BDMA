import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, Truck, Package, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Asset, Part, WorkOrder } from "@shared/schema";

interface SearchResult {
  id: number;
  type: "asset" | "part" | "workorder";
  title: string;
  subtitle: string;
  url: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    enabled: open && query.length >= 2,
  });

  const { data: partsData } = useQuery<{ parts: Part[]; total: number }>({
    queryKey: ["/api/parts"],
    enabled: open && query.length >= 2,
  });
  const parts = partsData?.parts;

  const { data: workOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
    enabled: open && query.length >= 2,
  });

  const getSearchResults = (): SearchResult[] => {
    if (query.length < 2) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    assets?.forEach((asset) => {
      if (
        asset.assetNumber.toLowerCase().includes(lowerQuery) ||
        asset.name.toLowerCase().includes(lowerQuery) ||
        (asset.manufacturer?.toLowerCase() || "").includes(lowerQuery)
      ) {
        results.push({
          id: asset.id,
          type: "asset",
          title: asset.assetNumber,
          subtitle: `${asset.name} - ${asset.manufacturer || ""} ${asset.model || ""}`,
          url: `/assets/${asset.id}`,
        });
      }
    });

    parts?.forEach((part) => {
      if (
        part.partNumber.toLowerCase().includes(lowerQuery) ||
        part.name.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: part.id,
          type: "part",
          title: part.partNumber,
          subtitle: part.name,
          url: `/inventory/${part.id}`,
        });
      }
    });

    workOrders?.forEach((wo) => {
      if (
        wo.workOrderNumber.toLowerCase().includes(lowerQuery) ||
        (wo.description?.toLowerCase() || "").includes(lowerQuery)
      ) {
        results.push({
          id: wo.id,
          type: "workorder",
          title: wo.workOrderNumber,
          subtitle: wo.description || "Work Order",
          url: `/work-orders/${wo.id}`,
        });
      }
    });

    return results.slice(0, 10);
  };

  const results = getSearchResults();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedIndex >= results.length && results.length > 0) {
      setSelectedIndex(results.length - 1);
    }
  }, [results.length, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const safeIndex = Math.min(selectedIndex, results.length - 1);
      if (safeIndex >= 0 && results[safeIndex]) {
        handleSelect(results[safeIndex]);
      }
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedIndex(0);
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "asset":
        return <Truck className="h-4 w-4" />;
      case "part":
        return <Package className="h-4 w-4" />;
      case "workorder":
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: SearchResult["type"]) => {
    switch (type) {
      case "asset":
        return <Badge variant="outline" data-testid="badge-type-asset">Asset</Badge>;
      case "part":
        return <Badge variant="outline" data-testid="badge-type-part">Part</Badge>;
      case "workorder":
        return <Badge variant="outline" data-testid="badge-type-workorder">Work Order</Badge>;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0" onKeyDown={handleDialogKeyDown}>
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="sr-only">Global Search</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search assets, parts, work orders..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 text-base"
                data-testid="input-global-search"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="border-t">
            {query.length < 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-search-hint">
                Type at least 2 characters to search
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-results">
                No results found for "{query}"
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto p-2" data-testid="search-results-container">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover-elevate"
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    data-testid={`search-result-${result.type}-${result.id}`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-result-title-${result.type}-${result.id}`}>
                        {result.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`text-result-subtitle-${result.type}-${result.id}`}>
                        {result.subtitle}
                      </p>
                    </div>
                    {getTypeBadge(result.type)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between" data-testid="search-footer-hints">
            <span>↑↓ to navigate, Enter to select</span>
            <span>ESC to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
