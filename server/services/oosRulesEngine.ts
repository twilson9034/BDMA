import { db } from "../db";
import { oosRules, oosRulesVersions, oosInspections, oosInspectionFindings, oosSources, oosChangeLog } from "@shared/schema";
import { eq, and, lte, gte, or, isNull } from "drizzle-orm";
import type { OosRule, OosRulesVersion, InsertOosInspection, InsertOosInspectionFinding, OosInspection } from "@shared/schema";

export interface RuleCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains" | "in" | "exists";
  value: any;
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: (RuleCondition | ConditionGroup)[];
}

export interface FindingObservation {
  [field: string]: any;
}

export interface RuleEvaluationResult {
  rule: OosRule;
  triggered: boolean;
  matchedConditions: string[];
  explanation: string;
}

export interface InspectionEvaluationResult {
  inspectionId: number;
  assetId: number;
  overallStatus: "PASS" | "FAIL" | "OOS" | "PENDING";
  findings: Array<{
    findingType: string;
    vmrsSystemCode?: string;
    observations: FindingObservation;
    triggeredRules: RuleEvaluationResult[];
    outcome: string;
    requiresConfirmation: boolean;
  }>;
  oosItems: Array<{
    ruleId: number;
    ruleTitle: string;
    explanation: string;
    outcome: string;
  }>;
}

function evaluateCondition(condition: RuleCondition, observation: FindingObservation): boolean {
  const fieldValue = observation[condition.field];
  
  switch (condition.operator) {
    case "eq":
      return fieldValue === condition.value;
    case "ne":
      return fieldValue !== condition.value;
    case "gt":
      return typeof fieldValue === "number" && fieldValue > condition.value;
    case "lt":
      return typeof fieldValue === "number" && fieldValue < condition.value;
    case "gte":
      return typeof fieldValue === "number" && fieldValue >= condition.value;
    case "lte":
      return typeof fieldValue === "number" && fieldValue <= condition.value;
    case "contains":
      return typeof fieldValue === "string" && fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    default:
      return false;
  }
}

function evaluateConditionGroup(group: ConditionGroup, observation: FindingObservation): { matched: boolean; matchedConditions: string[] } {
  const matchedConditions: string[] = [];
  
  if (group.operator === "AND") {
    let allMatched = true;
    for (const cond of group.conditions) {
      if ("field" in cond) {
        const matched = evaluateCondition(cond as RuleCondition, observation);
        if (matched) {
          matchedConditions.push(`${cond.field} ${cond.operator} ${cond.value}`);
        } else {
          allMatched = false;
        }
      } else {
        const result = evaluateConditionGroup(cond as ConditionGroup, observation);
        if (result.matched) {
          matchedConditions.push(...result.matchedConditions);
        } else {
          allMatched = false;
        }
      }
    }
    return { matched: allMatched, matchedConditions };
  } else {
    for (const cond of group.conditions) {
      if ("field" in cond) {
        const matched = evaluateCondition(cond as RuleCondition, observation);
        if (matched) {
          matchedConditions.push(`${cond.field} ${cond.operator} ${cond.value}`);
          return { matched: true, matchedConditions };
        }
      } else {
        const result = evaluateConditionGroup(cond as ConditionGroup, observation);
        if (result.matched) {
          return result;
        }
      }
    }
    return { matched: false, matchedConditions: [] };
  }
}

export function evaluateRule(rule: OosRule, observation: FindingObservation): RuleEvaluationResult {
  const conditionJson = rule.conditionJson as ConditionGroup | RuleCondition | null;
  
  if (!conditionJson) {
    return {
      rule,
      triggered: false,
      matchedConditions: [],
      explanation: "No conditions defined for rule",
    };
  }
  
  let result: { matched: boolean; matchedConditions: string[] };
  
  if ("field" in conditionJson) {
    const matched = evaluateCondition(conditionJson as RuleCondition, observation);
    result = {
      matched,
      matchedConditions: matched ? [`${conditionJson.field} ${conditionJson.operator} ${conditionJson.value}`] : [],
    };
  } else {
    result = evaluateConditionGroup(conditionJson as ConditionGroup, observation);
  }
  
  let explanation = rule.explanationTemplate || "";
  if (result.matched) {
    explanation = explanation || `Triggered by: ${result.matchedConditions.join(", ")}`;
    if (rule.isTriageOnly) {
      explanation = `[TRIAGE - Requires Confirmation] ${explanation}`;
    }
  }
  
  return {
    rule,
    triggered: result.matched,
    matchedConditions: result.matchedConditions,
    explanation,
  };
}

export async function getActiveRulesVersion(orgId: number, asOfDate: Date = new Date()): Promise<OosRulesVersion | null> {
  const versions = await db.select().from(oosRulesVersions)
    .where(and(
      or(eq(oosRulesVersions.orgId, orgId), isNull(oosRulesVersions.orgId)),
      eq(oosRulesVersions.status, "ACTIVE"),
      lte(oosRulesVersions.effectiveStart, asOfDate),
      or(gte(oosRulesVersions.effectiveEnd, asOfDate), isNull(oosRulesVersions.effectiveEnd))
    ))
    .limit(1);
  
  return versions[0] || null;
}

export async function getRulesForVersion(versionId: number, orgId?: number): Promise<OosRule[]> {
  const [version] = await db.select().from(oosRulesVersions).where(eq(oosRulesVersions.id, versionId));
  if (!version) {
    return [];
  }
  if (version.orgId !== null && orgId !== undefined && version.orgId !== orgId) {
    return [];
  }
  return db.select().from(oosRules).where(eq(oosRules.versionId, versionId));
}

export async function evaluateInspection(
  inspectionId: number,
  findings: Array<{
    findingType: string;
    vmrsSystemCode?: string;
    observations: FindingObservation;
  }>
): Promise<InspectionEvaluationResult> {
  const [inspection] = await db.select().from(oosInspections).where(eq(oosInspections.id, inspectionId));
  if (!inspection) {
    throw new Error(`Inspection ${inspectionId} not found`);
  }
  
  const rulesVersionId = inspection.rulesVersionId;
  if (!rulesVersionId) {
    throw new Error("No rules version associated with inspection");
  }
  
  const rules = await getRulesForVersion(rulesVersionId);
  
  const result: InspectionEvaluationResult = {
    inspectionId,
    assetId: inspection.assetId || 0,
    overallStatus: "PASS",
    findings: [],
    oosItems: [],
  };
  
  for (const finding of findings) {
    const applicableRules = rules.filter(r => 
      !r.vmrsSystemCode || r.vmrsSystemCode === finding.vmrsSystemCode
    );
    
    const triggeredRules: RuleEvaluationResult[] = [];
    let findingOutcome = "NOT_OOS";
    let requiresConfirmation = false;
    
    for (const rule of applicableRules) {
      const evalResult = evaluateRule(rule, finding.observations);
      if (evalResult.triggered) {
        triggeredRules.push(evalResult);
        
        if (rule.outcome === "OOS_VEHICLE" || rule.outcome === "OOS_DRIVER" || rule.outcome === "OOS_CARGO") {
          findingOutcome = rule.outcome;
          result.oosItems.push({
            ruleId: rule.id,
            ruleTitle: rule.title,
            explanation: evalResult.explanation,
            outcome: rule.outcome,
          });
          
          if (rule.isTriageOnly) {
            requiresConfirmation = true;
          }
        }
      }
    }
    
    result.findings.push({
      findingType: finding.findingType,
      vmrsSystemCode: finding.vmrsSystemCode,
      observations: finding.observations,
      triggeredRules,
      outcome: findingOutcome,
      requiresConfirmation,
    });
  }
  
  if (result.oosItems.length > 0) {
    const hasVehicleOos = result.oosItems.some(i => i.outcome === "OOS_VEHICLE");
    const hasDriverOos = result.oosItems.some(i => i.outcome === "OOS_DRIVER");
    result.overallStatus = hasVehicleOos || hasDriverOos ? "OOS" : "FAIL";
  }
  
  return result;
}

export async function createInspection(
  orgId: number,
  data: Omit<InsertOosInspection, "orgId">
): Promise<OosInspection> {
  let rulesVersionId = data.rulesVersionId;
  
  if (!rulesVersionId) {
    const activeVersion = await getActiveRulesVersion(orgId);
    rulesVersionId = activeVersion?.id;
  }
  
  const [inspection] = await db.insert(oosInspections).values([{
    ...data,
    orgId,
    rulesVersionId,
  } as any]).returning();
  
  return inspection;
}

export async function saveInspectionFinding(
  data: InsertOosInspectionFinding
): Promise<void> {
  await db.insert(oosInspectionFindings).values([data as any]);
}

export async function updateInspectionStatus(
  inspectionId: number,
  status: "PASS" | "FAIL" | "OOS" | "PENDING"
): Promise<void> {
  await db.update(oosInspections).set({ status }).where(eq(oosInspections.id, inspectionId));
}

const STARTER_OOS_RULES: Array<{
  category: string;
  vmrsSystemCode: string | null;
  title: string;
  conditionJson: ConditionGroup | RuleCondition;
  outcome: string;
  explanationTemplate: string;
  isTriageOnly: boolean;
}> = [
  {
    category: "VEHICLE",
    vmrsSystemCode: "013",
    title: "Brake Air Leak - Major",
    conditionJson: { operator: "AND", conditions: [
      { field: "airLeak", operator: "eq", value: true },
      { field: "leakSeverity", operator: "eq", value: "major" }
    ]},
    outcome: "OOS_VEHICLE",
    explanationTemplate: "Major air leak detected in brake system - vehicle OOS per CVSA OOSC",
    isTriageOnly: true,
  },
  {
    category: "VEHICLE",
    vmrsSystemCode: "013",
    title: "Inoperative Brake Indicator",
    conditionJson: { field: "brakeIndicatorInop", operator: "eq", value: true },
    outcome: "TRIAGE",
    explanationTemplate: "Inoperative brake indicator light - requires inspection confirmation",
    isTriageOnly: true,
  },
  {
    category: "VEHICLE",
    vmrsSystemCode: "017",
    title: "Tire Tread Below Minimum",
    conditionJson: { operator: "AND", conditions: [
      { field: "treadDepth", operator: "lt", value: 2 },
      { field: "position", operator: "in", value: ["steer", "front"] }
    ]},
    outcome: "OOS_VEHICLE",
    explanationTemplate: "Steer tire tread depth below 2/32\" minimum - vehicle OOS per CVSA OOSC",
    isTriageOnly: true,
  },
  {
    category: "VEHICLE",
    vmrsSystemCode: "017",
    title: "Tire Sidewall Damage",
    conditionJson: { field: "sidewallDamage", operator: "eq", value: true },
    outcome: "TRIAGE",
    explanationTemplate: "Sidewall damage detected - requires inspection confirmation",
    isTriageOnly: true,
  },
  {
    category: "VEHICLE",
    vmrsSystemCode: "034",
    title: "Inoperative Required Lamp",
    conditionJson: { operator: "AND", conditions: [
      { field: "lampInop", operator: "eq", value: true },
      { field: "lampType", operator: "in", value: ["headlamp", "tail_lamp", "brake_lamp", "turn_signal"] }
    ]},
    outcome: "TRIAGE",
    explanationTemplate: "Inoperative critical lamp - requires inspection confirmation",
    isTriageOnly: true,
  },
  {
    category: "DRIVER",
    vmrsSystemCode: null,
    title: "Invalid License",
    conditionJson: { operator: "OR", conditions: [
      { field: "licenseExpired", operator: "eq", value: true },
      { field: "licenseValid", operator: "eq", value: false }
    ]},
    outcome: "TRIAGE",
    explanationTemplate: "Driver license appears invalid/expired - requires document verification",
    isTriageOnly: true,
  },
  {
    category: "DRIVER",
    vmrsSystemCode: null,
    title: "Medical Certificate Issue",
    conditionJson: { operator: "OR", conditions: [
      { field: "medCertExpired", operator: "eq", value: true },
      { field: "medCertMissing", operator: "eq", value: true }
    ]},
    outcome: "TRIAGE",
    explanationTemplate: "Medical certificate issue - requires document verification",
    isTriageOnly: true,
  },
];

export async function seedOosRules(orgId: number | null = null): Promise<{ versionId: number; rulesCount: number }> {
  const now = new Date();
  const effectiveStart = new Date("2025-04-01");
  const effectiveEnd = new Date("2026-03-31");
  
  const existing = await db.select().from(oosRulesVersions)
    .where(and(
      eq(oosRulesVersions.name, "CVSA_OOSC_2025_TRIAGE"),
      orgId ? eq(oosRulesVersions.orgId, orgId) : isNull(oosRulesVersions.orgId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    const rules = await getRulesForVersion(existing[0].id);
    return { versionId: existing[0].id, rulesCount: rules.length };
  }
  
  const [version] = await db.insert(oosRulesVersions).values({
    orgId,
    name: "CVSA_OOSC_2025_TRIAGE",
    effectiveStart,
    effectiveEnd,
    status: "ACTIVE",
    sourceIds: [],
  }).returning();
  
  for (const rule of STARTER_OOS_RULES) {
    await db.insert(oosRules).values({
      versionId: version.id,
      category: rule.category as any,
      vmrsSystemCode: rule.vmrsSystemCode,
      title: rule.title,
      conditionJson: rule.conditionJson,
      outcome: rule.outcome as any,
      explanationTemplate: rule.explanationTemplate,
      isTriageOnly: rule.isTriageOnly,
    });
  }
  
  await db.insert(oosSources).values({
    orgId,
    sourceType: "CVSA_NEWS",
    title: "CVSA 2025 Out-of-Service Criteria Announcement",
    url: "https://www.cvsa.org/news/2025-oosc-now-in-effect/",
    publishedDate: new Date("2025-04-01"),
    editionDate: effectiveStart,
    notes: "CVSA 2025 OOSC effective April 1, 2025 - starter triage rules only",
  });
  
  return { versionId: version.id, rulesCount: STARTER_OOS_RULES.length };
}

export { STARTER_OOS_RULES };
