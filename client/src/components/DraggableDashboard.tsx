import { useState, useEffect, ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Settings, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export interface DashboardWidget {
  id: string;
  title: string;
  component: ReactNode;
  colSpan?: 1 | 2 | 3;
  visible: boolean;
}

interface SortableWidgetProps {
  widget: DashboardWidget;
  isDragging?: boolean;
}

function SortableWidget({ widget, isDragging }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colSpanClass = widget.colSpan === 2 
    ? "lg:col-span-2" 
    : widget.colSpan === 3 
      ? "lg:col-span-3" 
      : "";

  if (!widget.visible) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${colSpanClass}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded bg-background/80 backdrop-blur-sm border border-border"
        data-testid={`widget-drag-handle-${widget.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {widget.component}
    </div>
  );
}

interface DraggableDashboardProps {
  widgets: DashboardWidget[];
  storageKey?: string;
  columns?: 1 | 2 | 3;
}

const DEFAULT_WIDGET_ORDER = [
  "fleet-availability",
  "open-work-orders", 
  "overdue-items",
  "pm-due",
  "mttr",
  "asset-uptime",
  "pm-compliance",
  "avg-cost",
  "work-order-trend",
  "asset-status",
  "recent-work-orders",
  "quick-actions",
  "parts-fulfillment",
  "fleet-health",
  "predictions",
  "procurement",
  "top-parts",
  "tire-health",
  "upcoming-pm",
];

export function DraggableDashboard({ 
  widgets, 
  storageKey = "dashboard-widget-order",
  columns = 3 
}: DraggableDashboardProps) {
  const [orderedWidgets, setOrderedWidgets] = useState<DashboardWidget[]>(widgets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const savedOrder = localStorage.getItem(storageKey);
    const savedVisibility = localStorage.getItem(`${storageKey}-visibility`);
    
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const visibilityMap = savedVisibility 
          ? (JSON.parse(savedVisibility) as Record<string, boolean>)
          : {};
        
        const reorderedWidgets = orderIds
          .map(id => {
            const widget = widgets.find(w => w.id === id);
            if (widget) {
              return {
                ...widget,
                visible: visibilityMap[id] !== undefined ? visibilityMap[id] : widget.visible,
              };
            }
            return null;
          })
          .filter((w): w is DashboardWidget => w !== null);

        widgets.forEach(w => {
          if (!orderIds.includes(w.id)) {
            reorderedWidgets.push({
              ...w,
              visible: visibilityMap[w.id] !== undefined ? visibilityMap[w.id] : w.visible,
            });
          }
        });

        setOrderedWidgets(reorderedWidgets);
      } catch {
        setOrderedWidgets(widgets);
      }
    } else {
      setOrderedWidgets(widgets);
    }
  }, [widgets, storageKey]);

  const saveOrder = (newWidgets: DashboardWidget[]) => {
    const orderIds = newWidgets.map(w => w.id);
    const visibilityMap = newWidgets.reduce((acc, w) => {
      acc[w.id] = w.visible;
      return acc;
    }, {} as Record<string, boolean>);
    
    localStorage.setItem(storageKey, JSON.stringify(orderIds));
    localStorage.setItem(`${storageKey}-visibility`, JSON.stringify(visibilityMap));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setOrderedWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveOrder(newOrder);
        return newOrder;
      });
    }
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setOrderedWidgets((items) => {
      const newItems = items.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      );
      saveOrder(newItems);
      return newItems;
    });
  };

  const resetLayout = () => {
    const resetWidgets = DEFAULT_WIDGET_ORDER
      .map(id => widgets.find(w => w.id === id))
      .filter((w): w is DashboardWidget => w !== null)
      .map(w => ({ ...w, visible: true }));

    widgets.forEach(w => {
      if (!DEFAULT_WIDGET_ORDER.includes(w.id)) {
        resetWidgets.push({ ...w, visible: true });
      }
    });

    setOrderedWidgets(resetWidgets);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}-visibility`);
  };

  const activeWidget = orderedWidgets.find((w) => w.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-customize-dashboard">
              <Settings className="h-4 w-4 mr-2" />
              Customize
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Widget Visibility</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {orderedWidgets.map((widget) => (
              <DropdownMenuCheckboxItem
                key={widget.id}
                checked={widget.visible}
                onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                data-testid={`checkbox-widget-${widget.id}`}
              >
                {widget.title}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetLayout} data-testid="button-reset-layout">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Layout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedWidgets.filter(w => w.visible).map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${columns}`}>
            {orderedWidgets
              .filter((w) => w.visible)
              .map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isDragging={activeId === widget.id}
                />
              ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget ? (
            <div className="opacity-80 shadow-lg">
              {activeWidget.component}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
