import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X, AlertCircle, Wrench, Package, Truck, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import type { Notification } from "@shared/schema";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "work_order_assigned":
    case "work_order_status_changed":
    case "work_order_due_soon":
      return <Wrench className="h-4 w-4" />;
    case "pm_due":
      return <Clock className="h-4 w-4" />;
    case "part_low_stock":
    case "part_request_status":
      return <Package className="h-4 w-4" />;
    case "purchase_order_status":
      return <Truck className="h-4 w-4" />;
    case "asset_status_changed":
      return <Activity className="h-4 w-4" />;
    case "prediction_alert":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "text-destructive";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    default:
      return "text-muted-foreground";
  }
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = countData?.count || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="notification-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover-elevate cursor-pointer ${
                    !notification.isRead ? "bg-muted/50" : ""
                  }`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 ${getPriorityColor(notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                markReadMutation.mutate(notification.id);
                              }}
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissMutation.mutate(notification.id);
                            }}
                            data-testid={`button-dismiss-${notification.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                      {notification.link && (
                        <Link href={notification.link}>
                          <a
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline mt-1 inline-block"
                            onClick={() => {
                              if (!notification.isRead) {
                                markReadMutation.mutate(notification.id);
                              }
                              setOpen(false);
                            }}
                            data-testid={`link-notification-${notification.id}`}
                          >
                            View details
                          </a>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
