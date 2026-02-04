import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users,
  DollarSign,
  Save,
  AlertCircle,
  UserCircle,
  Wrench
} from "lucide-react";

interface OrgMember {
  id: number;
  userId: string;
  role: string | null;
  joinedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  hourlyRate: string | null;
}

function getRoleLabel(role: string | null): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleBadgeVariant(role: string | null): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
    case "admin":
      return "default";
    case "manager":
      return "secondary";
    default:
      return "outline";
  }
}

function TechnicianCard({ 
  member, 
  onSaveRate,
  isSaving 
}: { 
  member: OrgMember; 
  onSaveRate: (memberId: number, rate: string) => void;
  isSaving: boolean;
}) {
  const [hourlyRate, setHourlyRate] = useState(member.hourlyRate || "");
  const [isEditing, setIsEditing] = useState(false);
  
  const hasChanges = hourlyRate !== (member.hourlyRate || "");
  const initials = `${member.firstName?.charAt(0) || ""}${member.lastName?.charAt(0) || ""}`.toUpperCase() || "?";
  const displayName = member.firstName && member.lastName 
    ? `${member.firstName} ${member.lastName}` 
    : member.email || "Unknown User";

  const handleSave = () => {
    onSaveRate(member.id, hourlyRate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setHourlyRate(member.hourlyRate || "");
    setIsEditing(false);
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium truncate" data-testid={`text-tech-name-${member.id}`}>
                {displayName}
              </h3>
              <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-role-${member.id}`}>
                {getRoleLabel(member.role)}
              </Badge>
            </div>
            
            {member.email && (
              <p className="text-sm text-muted-foreground truncate">
                {member.email}
              </p>
            )}
            
            <div className="mt-3">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-[150px]">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="pl-8"
                      placeholder="0.00"
                      data-testid={`input-hourly-rate-${member.id}`}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">/hr</span>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={isSaving}
                    data-testid={`button-save-rate-${member.id}`}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={handleCancel}
                    data-testid={`button-cancel-rate-${member.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {member.hourlyRate ? (
                      <span className="font-medium text-foreground" data-testid={`text-rate-${member.id}`}>
                        ${parseFloat(member.hourlyRate).toFixed(2)}/hr
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">No rate set</span>
                    )}
                  </span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    data-testid={`button-edit-rate-${member.id}`}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicianCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-3" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MyMembership {
  role: string | null;
}

export default function TechnicianManagement() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const { data: myMembership } = useQuery<MyMembership>({
    queryKey: ["/api/organizations/current/my-membership"],
    enabled: isAuthenticated,
  });
  
  const userRole = myMembership?.role ?? null;
  const canManage = userRole === "owner" || userRole === "admin" || userRole === "manager";

  const { data: members = [], isLoading, error } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations/current/members"],
    enabled: isAuthenticated,
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ memberId, hourlyRate }: { memberId: number; hourlyRate: string }) => {
      return apiRequest("PATCH", `/api/organizations/current/members/${memberId}/hourly-rate`, { hourlyRate: hourlyRate || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/current/members"] });
      toast({
        title: "Rate updated",
        description: "Technician hourly rate has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update rate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveRate = (memberId: number, rate: string) => {
    updateRateMutation.mutate({ memberId, hourlyRate: rate });
  };

  const technicians = members.filter(m => m.role === "technician");
  const allMembers = members;
  
  const totalLaborCost = members.reduce((sum, m) => {
    if (m.hourlyRate) {
      return sum + parseFloat(m.hourlyRate);
    }
    return sum;
  }, 0);
  
  const avgRate = members.filter(m => m.hourlyRate).length > 0
    ? totalLaborCost / members.filter(m => m.hourlyRate).length
    : 0;

  if (!canManage) {
    return (
      <div className="flex-1 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Access Restricted</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Only managers, administrators, and owners can access technician wage management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Technician Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage hourly rates for your team members
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold" data-testid="text-total-members">
                {isLoading ? "-" : allMembers.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Technicians
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold" data-testid="text-total-technicians">
                {isLoading ? "-" : technicians.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Hourly Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold" data-testid="text-avg-rate">
                {isLoading ? "-" : avgRate > 0 ? `$${avgRate.toFixed(2)}` : "Not set"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Set hourly rates for labor cost calculations. Rates are used in work orders and labor tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-destructive">Failed to load team members</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <TechnicianCardSkeleton key={i} />
              ))}
            </div>
          ) : allMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team members found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {allMembers.map(member => (
                <TechnicianCard
                  key={member.id}
                  member={member}
                  onSaveRate={handleSaveRate}
                  isSaving={updateRateMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
