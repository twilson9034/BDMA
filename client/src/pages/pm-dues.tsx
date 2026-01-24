import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Calendar, Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PmAssetInstance, PmSchedule, Asset } from "@shared/schema";
import { format, isPast, isToday, addDays } from "date-fns";

interface PmDue extends PmAssetInstance {
  pmSchedule?: PmSchedule;
  asset?: Asset;
}

export default function PmDues() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: pmDues, isLoading } = useQuery<PmDue[]>({
    queryKey: ["/api/pm-dues"],
  });

  const createWorkOrdersMutation = useMutation({
    mutationFn: async (instanceIds: number[]) => {
      const response = await apiRequest("POST", "/api/pm-dues/batch-create-work-orders", { instanceIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Work Orders Created", description: `${data.created} work order(s) created` });
      queryClient.invalidateQueries({ queryKey: ["/api/pm-dues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create work orders", variant: "destructive" });
    },
  });

  const filteredDues = (pmDues || []).filter((due) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      due.pmSchedule?.name?.toLowerCase().includes(searchLower) ||
      due.asset?.name?.toLowerCase().includes(searchLower) ||
      due.asset?.assetNumber?.toLowerCase().includes(searchLower)
    );
  });

  const getDueStatus = (due: PmDue) => {
    if (!due.nextDueDate) return { label: "No Due Date", variant: "secondary" as const };
    const dueDate = new Date(due.nextDueDate);
    if (isPast(dueDate) && !isToday(dueDate)) return { label: "Overdue", variant: "destructive" as const };
    if (isToday(dueDate)) return { label: "Due Today", variant: "destructive" as const };
    if (dueDate <= addDays(new Date(), 7)) return { label: "Due Soon", variant: "default" as const };
    return { label: "Scheduled", variant: "secondary" as const };
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDues.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDues.map(d => d.id));
    }
  };

  const columns: Column<PmDue>[] = [
    {
      key: "select",
      header: "Select",
      cell: (due) => (
        <Checkbox
          checked={selectedIds.includes(due.id)}
          onCheckedChange={() => toggleSelect(due.id)}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-select-${due.id}`}
        />
      ),
    },
    {
      key: "pmSchedule",
      header: "PM Schedule",
      cell: (due) => (
        <div>
          <p className="font-medium">{due.pmSchedule?.name}</p>
          <p className="text-sm text-muted-foreground">
            Every {due.pmSchedule?.intervalValue} {due.pmSchedule?.intervalType}
          </p>
        </div>
      ),
    },
    {
      key: "asset",
      header: "Asset",
      cell: (due) => (
        <div>
          <p className="font-medium">{due.asset?.name}</p>
          <p className="text-sm text-muted-foreground">{due.asset?.assetNumber}</p>
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (due) => due.nextDueDate ? format(new Date(due.nextDueDate), "MMM d, yyyy") : "-",
    },
    {
      key: "dueMeter",
      header: "Due Meter",
      cell: (due) => due.nextDueMeter ? `${Number(due.nextDueMeter).toLocaleString()} ${due.pmSchedule?.intervalType || ""}` : "-",
    },
    {
      key: "lastCompleted",
      header: "Last Completed",
      cell: (due) => due.lastCompletedDate ? format(new Date(due.lastCompletedDate), "MMM d, yyyy") : "Never",
    },
    {
      key: "status",
      header: "Status",
      cell: (due) => {
        const status = getDueStatus(due);
        return <Badge variant={status.variant} data-testid={`badge-status-${due.id}`}>{status.label}</Badge>;
      },
    },
  ];

  const overdueCounts = filteredDues.filter(d => {
    if (!d.nextDueDate) return false;
    return isPast(new Date(d.nextDueDate)) && !isToday(new Date(d.nextDueDate));
  }).length;

  const dueTodayCount = filteredDues.filter(d => d.nextDueDate && isToday(new Date(d.nextDueDate))).length;
  const dueSoonCount = filteredDues.filter(d => {
    if (!d.nextDueDate) return false;
    const dueDate = new Date(d.nextDueDate);
    return !isPast(dueDate) && !isToday(dueDate) && dueDate <= addDays(new Date(), 7);
  }).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="PM Dues"
        description="Upcoming and overdue preventive maintenance schedules"
        actions={
          selectedIds.length > 0 && (
            <Button
              onClick={() => createWorkOrdersMutation.mutate(selectedIds)}
              disabled={createWorkOrdersMutation.isPending}
              data-testid="button-create-work-orders"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Create {selectedIds.length} Work Order(s)
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total PMs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDues.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCounts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{dueTodayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueSoonCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-4 pb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by PM or asset..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-pm-dues"
          />
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading PM dues...</div>
        ) : filteredDues.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No PM Dues Found"
            description={search 
              ? "Try adjusting your search" 
              : "All preventive maintenance is up to date"}
          />
        ) : (
          <DataTable data={filteredDues} columns={columns} getRowKey={(due) => due.id} />
        )}
      </div>
    </div>
  );
}
