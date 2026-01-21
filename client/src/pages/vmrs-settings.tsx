import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Code2, ArrowLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { VmrsCode } from "@shared/schema";

export default function VmrsSettings() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<VmrsCode | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    systemCode: "",
    assemblyCode: "",
    componentCode: "",
  });

  const { data: vmrsCodes = [], isLoading } = useQuery<VmrsCode[]>({
    queryKey: ["/api/vmrs-codes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/vmrs-codes", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vmrs-codes"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "VMRS code created", description: "The code has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create VMRS code.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest(`/api/vmrs-codes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vmrs-codes"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "VMRS code updated", description: "The code has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update VMRS code.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/vmrs-codes/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vmrs-codes"] });
      setShowDeleteDialog(false);
      setDeleteId(null);
      toast({ title: "VMRS code deleted", description: "The code has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete VMRS code.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ code: "", title: "", description: "", systemCode: "", assemblyCode: "", componentCode: "" });
    setEditingCode(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleOpenEdit = (vmrsCode: VmrsCode) => {
    setEditingCode(vmrsCode);
    setFormData({
      code: vmrsCode.code,
      title: vmrsCode.title,
      description: vmrsCode.description || "",
      systemCode: vmrsCode.systemCode || "",
      assemblyCode: vmrsCode.assemblyCode || "",
      componentCode: vmrsCode.componentCode || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.title.trim()) {
      toast({ title: "Validation Error", description: "Code and Title are required.", variant: "destructive" });
      return;
    }
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const columns = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }: any) => (
        <span className="font-mono font-medium">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: any) => (
        <span className="text-muted-foreground truncate max-w-[300px] block">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleOpenEdit(row.original)}
            data-testid={`button-edit-vmrs-${row.original.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(row.original.id)}
            data-testid={`button-delete-vmrs-${row.original.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" data-testid="button-back-settings">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="VMRS Codes"
          description="Manage Vehicle Maintenance Reporting Standards codes for work order categorization"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              VMRS Code Library
            </CardTitle>
            <CardDescription>
              Standard codes for categorizing maintenance tasks
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} data-testid="button-add-vmrs">
            <Plus className="h-4 w-4 mr-2" />
            Add Code
          </Button>
        </CardHeader>
        <CardContent>
          {vmrsCodes.length > 0 ? (
            <DataTable columns={columns} data={vmrsCodes} searchColumn="code" searchPlaceholder="Search by code..." />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No VMRS codes configured yet.</p>
              <p className="text-sm">Add codes to standardize work order categorization.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? "Edit VMRS Code" : "Add VMRS Code"}</DialogTitle>
            <DialogDescription>
              {editingCode ? "Update the VMRS code details." : "Create a new VMRS code for work order categorization."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  placeholder="e.g. 013-001-001"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  data-testid="input-vmrs-code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="e.g. Front Brakes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-vmrs-title"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Detailed description of this VMRS code"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-vmrs-description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">System Code</label>
                <Input
                  placeholder="013"
                  value={formData.systemCode}
                  onChange={(e) => setFormData({ ...formData, systemCode: e.target.value })}
                  data-testid="input-vmrs-system"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Assembly Code</label>
                <Input
                  placeholder="001"
                  value={formData.assemblyCode}
                  onChange={(e) => setFormData({ ...formData, assemblyCode: e.target.value })}
                  data-testid="input-vmrs-assembly"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Component Code</label>
                <Input
                  placeholder="001"
                  value={formData.componentCode}
                  onChange={(e) => setFormData({ ...formData, componentCode: e.target.value })}
                  data-testid="input-vmrs-component"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-vmrs"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCode ? "Save Changes" : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete VMRS Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this VMRS code? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-vmrs"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
