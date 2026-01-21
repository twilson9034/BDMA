import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Calendar, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { PmSchedule } from "@shared/schema";

export default function PMSchedules() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: schedules, isLoading } = useQuery<PmSchedule[]>({
    queryKey: ["/api/pm-schedules"],
  });

  const mockSchedules: PmSchedule[] = [
    {
      id: 1,
      name: "Oil Change - Standard",
      description: "Engine oil and filter replacement",
      intervalType: "miles",
      intervalValue: 5000,
      estimatedHours: "1.50",
      estimatedCost: "150.00",
      priority: "medium",
      taskChecklist: ["Drain old oil", "Replace filter", "Add new oil", "Check for leaks"],
      isActive: true,
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      name: "Brake Inspection",
      description: "Complete brake system inspection",
      intervalType: "miles",
      intervalValue: 15000,
      estimatedHours: "2.00",
      estimatedCost: "250.00",
      priority: "high",
      taskChecklist: ["Inspect pads", "Check rotors", "Test fluid", "Inspect lines"],
      isActive: true,
      createdAt: new Date("2023-02-10"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      name: "Tire Rotation",
      description: "Rotate and balance all tires",
      intervalType: "miles",
      intervalValue: 7500,
      estimatedHours: "1.00",
      estimatedCost: "75.00",
      priority: "low",
      taskChecklist: ["Remove tires", "Rotate position", "Balance", "Check pressure"],
      isActive: true,
      createdAt: new Date("2023-03-05"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: 4,
      name: "Annual DOT Inspection",
      description: "Federal DOT compliance inspection",
      intervalType: "days",
      intervalValue: 365,
      estimatedHours: "3.00",
      estimatedCost: "350.00",
      priority: "critical",
      taskChecklist: ["Full vehicle inspection", "Document findings", "Issue certificate"],
      isActive: true,
      createdAt: new Date("2023-04-12"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displaySchedules = schedules?.length ? schedules : mockSchedules;

  const filteredSchedules = displaySchedules.filter((schedule) =>
    schedule.name.toLowerCase().includes(search.toLowerCase()) ||
    schedule.description?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<PmSchedule>[] = [
    {
      key: "name",
      header: "Schedule",
      cell: (schedule) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{schedule.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[250px]">
              {schedule.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "interval",
      header: "Interval",
      cell: (schedule) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {schedule.intervalValue.toLocaleString()} {schedule.intervalType}
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (schedule) => (
        <Badge
          variant="outline"
          className={`capitalize ${
            schedule.priority === "critical"
              ? "priority-critical border"
              : schedule.priority === "high"
              ? "priority-high border"
              : schedule.priority === "medium"
              ? "priority-medium border"
              : "priority-low border"
          }`}
        >
          {schedule.priority}
        </Badge>
      ),
    },
    {
      key: "estimatedHours",
      header: "Est. Hours",
      cell: (schedule) => (
        <span className="text-sm">{Number(schedule.estimatedHours || 0).toFixed(1)} hrs</span>
      ),
    },
    {
      key: "estimatedCost",
      header: "Est. Cost",
      cell: (schedule) => (
        <span className="text-sm font-medium">
          ${Number(schedule.estimatedCost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "tasks",
      header: "Tasks",
      cell: (schedule) => (
        <span className="text-sm text-muted-foreground">
          {(schedule.taskChecklist as string[] || []).length} items
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="PM Schedules"
        description="Manage preventive maintenance schedules"
        actions={
          <Button asChild data-testid="button-new-pm">
            <Link href="/pm-schedules/new">
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Schedules</p>
                <p className="text-2xl font-bold">{displaySchedules.filter(s => s.isActive).length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">8</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">2</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schedules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {filteredSchedules.length === 0 && !isLoading ? (
        <EmptyState
          icon={Calendar}
          title="No PM schedules found"
          description="Create your first preventive maintenance schedule"
          action={{
            label: "Create Schedule",
            onClick: () => navigate("/pm-schedules/new"),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredSchedules}
          isLoading={isLoading}
          onRowClick={(schedule) => navigate(`/pm-schedules/${schedule.id}`)}
          getRowKey={(schedule) => schedule.id}
          emptyMessage="No schedules found"
        />
      )}
    </div>
  );
}
