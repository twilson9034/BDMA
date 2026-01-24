import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { orgMemberships, organizations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface TenantContext {
  orgId: number;
  userId: string;
  role: "owner" | "admin" | "manager" | "technician" | "viewer";
  organization: {
    id: number;
    name: string;
    slug: string;
    plan: string | null;
    status: string | null;
    maxAssets: number | null;
  };
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export async function getUserOrgMembership(userId: string, orgId?: number) {
  const condition = orgId 
    ? and(eq(orgMemberships.userId, userId), eq(orgMemberships.orgId, orgId))
    : eq(orgMemberships.userId, userId);
    
  const memberships = await db
    .select({
      id: orgMemberships.id,
      orgId: orgMemberships.orgId,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPlan: organizations.plan,
      orgStatus: organizations.status,
      orgMaxAssets: organizations.maxAssets,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(condition)
    .limit(1);

  if (memberships.length === 0) return null;
  
  const m = memberships[0];
  return {
    id: m.id,
    orgId: m.orgId,
    userId: m.userId,
    role: m.role as TenantContext["role"],
    organization: {
      id: m.orgId,
      name: m.orgName,
      slug: m.orgSlug,
      plan: m.orgPlan,
      status: m.orgStatus,
      maxAssets: m.orgMaxAssets,
    },
  };
}

export async function getUserOrgMemberships(userId: string) {
  const memberships = await db
    .select({
      id: orgMemberships.id,
      orgId: orgMemberships.orgId,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPlan: organizations.plan,
      orgStatus: organizations.status,
      orgMaxAssets: organizations.maxAssets,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId));

  return memberships.map(m => ({
    id: m.id,
    orgId: m.orgId,
    userId: m.userId,
    role: m.role as TenantContext["role"],
    organization: {
      id: m.orgId,
      name: m.orgName,
      slug: m.orgSlug,
      plan: m.orgPlan,
      status: m.orgStatus,
      maxAssets: m.orgMaxAssets,
    },
  }));
}

export function tenantMiddleware(options?: { required?: boolean }) {
  const { required = true } = options || {};
  
  return async function(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      if (required) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return next();
    }

    const userId = (req.user as any)?.claims?.sub;
    if (!userId) {
      if (required) {
        return res.status(401).json({ error: "User ID not found" });
      }
      return next();
    }

    const selectedOrgId = (req.session as any)?.selectedOrgId;
    
    try {
      const membership = await getUserOrgMembership(userId, selectedOrgId || undefined);
      
      if (!membership) {
        const defaultMembership = await getUserOrgMembership(userId);
        if (!defaultMembership) {
          if (required) {
            return res.status(403).json({ error: "No organization access" });
          }
          return next();
        }
        
        if (req.session) {
          (req.session as any).selectedOrgId = defaultMembership.orgId;
        }
        
        req.tenant = {
          orgId: defaultMembership.orgId,
          userId,
          role: defaultMembership.role,
          organization: defaultMembership.organization,
        };
      } else {
        req.tenant = {
          orgId: membership.orgId,
          userId,
          role: membership.role,
          organization: membership.organization,
        };
      }

      next();
    } catch (error) {
      console.error("Tenant middleware error:", error);
      if (required) {
        return res.status(500).json({ error: "Failed to load organization context" });
      }
      next();
    }
  };
}

export function requireTenantRole(...allowedRoles: TenantContext["role"][]) {
  return function(req: Request, res: Response, next: NextFunction) {
    if (!req.tenant) {
      return res.status(401).json({ error: "No tenant context" });
    }
    
    if (!allowedRoles.includes(req.tenant.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    next();
  };
}

export function getOrgId(req: Request): number | null {
  return req.tenant?.orgId || null;
}
