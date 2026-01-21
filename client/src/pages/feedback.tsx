import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MessageSquare, ThumbsUp, Bug, Lightbulb, HelpCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Feedback } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

const typeIcons: Record<string, any> = {
  bug: Bug,
  feature_request: Lightbulb,
  improvement: ThumbsUp,
  question: HelpCircle,
  praise: Heart,
};

const typeColors: Record<string, string> = {
  bug: "bg-red-500/10 text-red-600 dark:text-red-400",
  feature_request: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  improvement: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  question: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  praise: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const statusColors: Record<string, string> = {
  new: "status-pending border",
  under_review: "status-in-maintenance border",
  planned: "status-pending border",
  in_progress: "status-in-maintenance border",
  completed: "status-operational border",
  declined: "bg-muted text-muted-foreground",
};

export default function FeedbackPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    type: "improvement" as const,
    title: "",
    description: "",
  });

  const { data: feedback, isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newFeedback) => {
      return apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setIsDialogOpen(false);
      setNewFeedback({ type: "improvement", title: "", description: "" });
      toast({ title: "Feedback submitted", description: "Thank you for your feedback!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit feedback", variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/feedback/${id}/vote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    },
  });

  const mockFeedback: Feedback[] = [
    {
      id: 1,
      userId: "user1",
      type: "feature_request",
      status: "planned",
      priority: "high",
      title: "Mobile app offline mode",
      description: "Allow technicians to complete work orders without internet connection and sync when back online.",
      pageUrl: "/work-orders",
      userAgent: null,
      screenshotUrl: null,
      votes: 24,
      aiSentiment: "positive",
      aiCategory: "mobile",
      responseNotes: "Great suggestion! We're planning this for Q2.",
      respondedById: "admin1",
      respondedAt: new Date("2024-01-10"),
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date("2024-01-10"),
    },
    {
      id: 2,
      userId: "user2",
      type: "bug",
      status: "in_progress",
      priority: "critical",
      title: "Work order status not updating",
      description: "When completing a work order line, the main work order status doesn't always update correctly.",
      pageUrl: "/work-orders/42",
      userAgent: null,
      screenshotUrl: null,
      votes: 18,
      aiSentiment: "negative",
      aiCategory: "functionality",
      responseNotes: "We're investigating this issue.",
      respondedById: "admin1",
      respondedAt: new Date("2024-01-14"),
      createdAt: new Date("2024-01-12"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 3,
      userId: "user3",
      type: "improvement",
      status: "under_review",
      priority: "medium",
      title: "Bulk import for parts",
      description: "Would be helpful to import parts from CSV file instead of adding one by one.",
      pageUrl: "/inventory",
      userAgent: null,
      screenshotUrl: null,
      votes: 12,
      aiSentiment: "neutral",
      aiCategory: "productivity",
      responseNotes: null,
      respondedById: null,
      respondedAt: null,
      createdAt: new Date("2024-01-14"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      id: 4,
      userId: "user1",
      type: "praise",
      status: "completed",
      priority: "low",
      title: "Love the new dashboard!",
      description: "The new KPI cards and charts are exactly what we needed. Great work!",
      pageUrl: "/",
      userAgent: null,
      screenshotUrl: null,
      votes: 8,
      aiSentiment: "positive",
      aiCategory: "ui",
      responseNotes: "Thank you! We're glad you like it.",
      respondedById: "admin1",
      respondedAt: new Date("2024-01-15"),
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  const displayFeedback = feedback?.length ? feedback : mockFeedback;

  const filteredFeedback = displayFeedback.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = () => {
    if (!newFeedback.title.trim() || !newFeedback.description.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(newFeedback);
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Feedback"
        description="Share ideas, report issues, and help us improve"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-submit-feedback">
                <Plus className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Feedback</DialogTitle>
                <DialogDescription>
                  Help us improve BDMA by sharing your thoughts
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newFeedback.type}
                    onValueChange={(value: any) => setNewFeedback({ ...newFeedback, type: value })}
                  >
                    <SelectTrigger data-testid="select-feedback-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="praise">Praise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary..."
                    value={newFeedback.title}
                    onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                    data-testid="input-feedback-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us more..."
                    rows={4}
                    value={newFeedback.description}
                    onChange={(e) => setNewFeedback({ ...newFeedback, description: e.target.value })}
                    data-testid="input-feedback-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">Bug Reports</SelectItem>
            <SelectItem value="feature_request">Feature Requests</SelectItem>
            <SelectItem value="improvement">Improvements</SelectItem>
            <SelectItem value="question">Questions</SelectItem>
            <SelectItem value="praise">Praise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredFeedback.length === 0 && !isLoading ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback yet"
          description="Be the first to share your thoughts"
          action={{
            label: "Submit Feedback",
            onClick: () => setIsDialogOpen(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item) => {
            const Icon = typeIcons[item.type] || MessageSquare;
            return (
              <Card key={item.id} className="hover-elevate transition-all" data-testid={`feedback-${item.id}`}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => voteMutation.mutate(item.id)}
                        data-testid={`vote-${item.id}`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">{item.votes}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={typeColors[item.type]}>
                            <Icon className="h-3 w-3 mr-1" />
                            {item.type.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className={statusColors[item.status]}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt!).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium mt-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      {item.responseNotes && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                          <p className="text-sm">{item.responseNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
