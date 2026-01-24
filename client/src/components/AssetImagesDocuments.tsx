import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image, FileText, Upload, X, Star, Trash2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AssetImage, AssetDocument } from "@shared/schema";

interface AssetImagesDocumentsProps {
  assetId: number;
}

export function AssetImages({ assetId }: AssetImagesDocumentsProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");

  const { data: images = [], isLoading } = useQuery<AssetImage[]>({
    queryKey: ["/api/assets", assetId, "images"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { imageUrl: string; caption?: string }) =>
      apiRequest("POST", `/api/assets/${assetId}/images`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "images"] });
      toast({ title: "Image added successfully" });
      setShowUploadDialog(false);
      setImageUrl("");
      setCaption("");
    },
    onError: () => {
      toast({ title: "Failed to add image", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/asset-images/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "images"] });
      toast({ title: "Image deleted" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: number) =>
      apiRequest("POST", `/api/assets/${assetId}/images/${imageId}/primary`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "images"] });
      toast({ title: "Primary image set" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Image className="h-5 w-5" />
          Photos
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploadDialog(true)}
          data-testid="button-add-image"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add Photo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No photos uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || "Asset image"}
                  className="w-full h-full object-cover"
                />
                {img.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.isPrimary && (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setPrimaryMutation.mutate(img.id)}
                      data-testid={`button-set-primary-${img.id}`}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(img.id)}
                    data-testid={`button-delete-image-${img.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                data-testid="input-image-url"
              />
            </div>
            <div>
              <Label>Caption (optional)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe the image"
                data-testid="input-image-caption"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ imageUrl, caption: caption || undefined })}
              disabled={!imageUrl || createMutation.isPending}
              data-testid="button-save-image"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const documentTypeLabels: Record<string, string> = {
  manual: "Manual",
  warranty: "Warranty",
  certificate: "Certificate",
  inspection_report: "Inspection Report",
  insurance: "Insurance",
  registration: "Registration",
  maintenance_record: "Maintenance Record",
  other: "Other",
};

export function AssetDocuments({ assetId }: AssetImagesDocumentsProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [documentType, setDocumentType] = useState("other");
  const [description, setDescription] = useState("");

  const { data: documents = [], isLoading } = useQuery<AssetDocument[]>({
    queryKey: ["/api/assets", assetId, "documents"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { documentUrl: string; fileName: string; documentType: string; description?: string }) =>
      apiRequest("POST", `/api/assets/${assetId}/documents`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "documents"] });
      toast({ title: "Document added successfully" });
      setShowUploadDialog(false);
      setDocumentUrl("");
      setFileName("");
      setDocumentType("other");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Failed to add document", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/asset-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "documents"] });
      toast({ title: "Document deleted" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploadDialog(true)}
          data-testid="button-add-document"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{documentTypeLabels[doc.documentType || "other"]}</span>
                      {doc.expirationDate && (
                        <span>
                          Expires: {new Date(doc.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    data-testid={`button-download-${doc.id}`}
                  >
                    <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    data-testid={`button-delete-document-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document URL</Label>
              <Input
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                data-testid="input-document-url"
              />
            </div>
            <div>
              <Label>File Name</Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="maintenance_manual.pdf"
                data-testid="input-file-name"
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger data-testid="select-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                data-testid="input-document-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  documentUrl,
                  fileName,
                  documentType,
                  description: description || undefined,
                })
              }
              disabled={!documentUrl || !fileName || createMutation.isPending}
              data-testid="button-save-document"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
