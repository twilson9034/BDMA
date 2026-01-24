import { useQuery } from "@tanstack/react-query";

interface UserMembership {
  id: number;
  userId: string;
  orgId: number;
  role: string;
  primaryLocationId: number | null;
  isActive: boolean;
  isDefault: boolean;
}

export function useMembership() {
  const { data: membership, isLoading } = useQuery<UserMembership>({
    queryKey: ["/api/organizations/current/my-membership"],
  });

  return {
    membership,
    isLoading,
    primaryLocationId: membership?.primaryLocationId ?? null,
    role: membership?.role,
    isAdmin: membership?.role === "owner" || membership?.role === "admin",
    isManager: membership?.role === "manager" || membership?.role === "owner" || membership?.role === "admin",
  };
}
