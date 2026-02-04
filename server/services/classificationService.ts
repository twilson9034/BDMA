import { storage } from "../storage";
import type { Part, InsertPartClassificationSnapshot } from "@shared/schema";

interface ClassificationWeights {
  costWeight: number;
  roadcallWeight: number;
  safetyWeight: number;
  leadTimeBonus14Days: number;
  leadTimeBonus30Days: number;
}

interface ClassificationThresholds {
  classAPercentile: number;
  classBPercentile: number;
  xyzCvThresholdX: number;
  xyzCvThresholdY: number;
  xyzMinMonthsForNonZ: number;
}

const DEFAULT_WEIGHTS: ClassificationWeights = {
  costWeight: 0.35,
  roadcallWeight: 0.35,
  safetyWeight: 0.30,
  leadTimeBonus14Days: 3,
  leadTimeBonus30Days: 5,
};

const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  classAPercentile: 0.80,
  classBPercentile: 0.50,
  xyzCvThresholdX: 0.5,
  xyzCvThresholdY: 1.0,
  xyzMinMonthsForNonZ: 3,
};

interface ScoreExplanation {
  costFactors: { annualSpend: number; percentileRank: number };
  roadcallFactors: { count: number; downtimeHours: number; percentileRank: number };
  safetyFactors: { safetySystem: string | null; failureSeverity: number; complianceOverride: boolean; traceabilityRequired: boolean };
  xyzFactors: { mean: number; stdev: number; cv: number; nonZeroMonths: number };
  finalScore: number;
  leadTimeBonus: number;
}

export interface ClassificationResult {
  partId: number;
  smartClass: "S" | "A" | "B" | "C";
  xyzClass: "X" | "Y" | "Z";
  totalScore: number;
  costScore: number;
  roadcallScore: number;
  safetyScore: number;
  annualQty: number;
  annualSpend: number;
  roadcallCount: number;
  downtimeHours: number;
  explanation: ScoreExplanation;
}

function calculatePercentileRank(value: number, allValues: number[]): number {
  const sorted = [...allValues].filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}

function calculateSafetyScore(part: Part): number {
  let base = 10;
  
  if (part.safetySystem === "BRAKES" || part.safetySystem === "STEERING" || part.safetySystem === "TIRES_WHEELS") {
    base = 60;
  } else if (part.safetySystem === "SUSPENSION") {
    base = 40;
  } else if (part.safetySystem === "ELECTRICAL") {
    base = 20;
  } else if (part.safetySystem === "HVAC" || part.safetySystem === "OTHER") {
    base = 15;
  }
  
  const severity = part.failureSeverity ?? 1;
  base += (severity - 1) * 10;
  
  return Math.min(Math.max(base, 0), 100);
}

function isClassS(part: Part): boolean {
  if (part.complianceOverride || part.traceabilityRequired) {
    return true;
  }
  
  const criticalSafetySystems = ["BRAKES", "STEERING", "TIRES_WHEELS"];
  const severity = part.failureSeverity ?? 1;
  
  if (criticalSafetySystems.includes(part.safetySystem || "") && severity >= 4) {
    return true;
  }
  
  return false;
}

function calculateXyzClass(monthlyUsage: Array<{ month: string; qty: number }>, thresholds: ClassificationThresholds): { xyz: "X" | "Y" | "Z"; mean: number; stdev: number; cv: number; nonZeroMonths: number } {
  const quantities = monthlyUsage.map(m => m.qty);
  const nonZeroMonths = quantities.filter(q => q > 0).length;
  
  if (nonZeroMonths < thresholds.xyzMinMonthsForNonZ) {
    return { xyz: "Z", mean: 0, stdev: 0, cv: Infinity, nonZeroMonths };
  }
  
  const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  
  if (mean === 0) {
    return { xyz: "Z", mean: 0, stdev: 0, cv: Infinity, nonZeroMonths };
  }
  
  const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
  const stdev = Math.sqrt(variance);
  const cv = stdev / Math.max(mean, 0.0001);
  
  let xyz: "X" | "Y" | "Z";
  if (cv <= thresholds.xyzCvThresholdX) {
    xyz = "X";
  } else if (cv <= thresholds.xyzCvThresholdY) {
    xyz = "Y";
  } else {
    xyz = "Z";
  }
  
  return { xyz, mean, stdev, cv, nonZeroMonths };
}

export async function runClassification(
  orgId: number,
  windowMonths: number = 12,
  weights: ClassificationWeights = DEFAULT_WEIGHTS,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): Promise<{ runId: number; results: ClassificationResult[] }> {
  const run = await storage.createClassificationRun({
    orgId,
    windowMonths,
    parametersJson: { weights, thresholds },
    status: "running",
  });

  try {
    const partsResult = await storage.getPartsByOrgPaginated(orgId, { limit: 10000, offset: 0, search: "" });
    const allParts = partsResult.parts;
    
    const usageAgg = await storage.getPartUsageAggregation(orgId, windowMonths);
    const usageMap = new Map(usageAgg.map(u => [u.partId, u]));
    
    const allSpends = usageAgg.map(u => u.totalSpend);
    const results: ClassificationResult[] = [];
    
    const roadcallStatsPromises = allParts.map(async (part) => {
      const stats = await storage.getPartRoadcallStats(part.id, windowMonths);
      return { partId: part.id, ...stats };
    });
    const roadcallStats = await Promise.all(roadcallStatsPromises);
    const roadcallMap = new Map(roadcallStats.map(s => [s.partId, s]));
    
    const allRoadcallScores = roadcallStats.map(s => s.count + s.downtimeHours * 0.25);
    
    for (const part of allParts) {
      const usage = usageMap.get(part.id) || { totalQty: 0, totalSpend: 0 };
      const roadcall = roadcallMap.get(part.id) || { count: 0, downtimeHours: 0 };
      
      const costScore = calculatePercentileRank(usage.totalSpend, allSpends);
      const roadcallRaw = roadcall.count + roadcall.downtimeHours * 0.25;
      const roadcallScore = calculatePercentileRank(roadcallRaw, allRoadcallScores);
      const safetyScore = calculateSafetyScore(part);
      
      let totalScore = 
        weights.costWeight * costScore +
        weights.roadcallWeight * roadcallScore +
        weights.safetyWeight * safetyScore;
      
      let leadTimeBonus = 0;
      if (part.leadTimeDays && part.leadTimeDays >= 30) {
        leadTimeBonus = weights.leadTimeBonus30Days;
      } else if (part.leadTimeDays && part.leadTimeDays >= 14) {
        leadTimeBonus = weights.leadTimeBonus14Days;
      }
      totalScore = Math.min(totalScore + leadTimeBonus, 100);
      
      const monthlyUsage = await storage.getPartMonthlyUsage(part.id, windowMonths);
      const xyzResult = calculateXyzClass(monthlyUsage, thresholds);
      
      let smartClass: "S" | "A" | "B" | "C";
      if (isClassS(part)) {
        smartClass = "S";
      } else {
        smartClass = "C";
      }
      
      const explanation: ScoreExplanation = {
        costFactors: { annualSpend: usage.totalSpend, percentileRank: costScore },
        roadcallFactors: { count: roadcall.count, downtimeHours: roadcall.downtimeHours, percentileRank: roadcallScore },
        safetyFactors: { 
          safetySystem: part.safetySystem || null, 
          failureSeverity: part.failureSeverity ?? 1,
          complianceOverride: part.complianceOverride ?? false,
          traceabilityRequired: part.traceabilityRequired ?? false,
        },
        xyzFactors: { mean: xyzResult.mean, stdev: xyzResult.stdev, cv: xyzResult.cv, nonZeroMonths: xyzResult.nonZeroMonths },
        finalScore: totalScore,
        leadTimeBonus,
      };
      
      results.push({
        partId: part.id,
        smartClass,
        xyzClass: xyzResult.xyz,
        totalScore,
        costScore,
        roadcallScore,
        safetyScore,
        annualQty: usage.totalQty,
        annualSpend: usage.totalSpend,
        roadcallCount: roadcall.count,
        downtimeHours: roadcall.downtimeHours,
        explanation,
      });
    }
    
    const nonSResults = results.filter(r => r.smartClass !== "S");
    const sortedByScore = [...nonSResults].sort((a, b) => b.totalScore - a.totalScore);
    
    const classAThreshold = Math.floor(sortedByScore.length * (1 - thresholds.classAPercentile));
    const classBThreshold = Math.floor(sortedByScore.length * (1 - thresholds.classBPercentile));
    
    for (let i = 0; i < sortedByScore.length; i++) {
      const result = sortedByScore[i];
      if (i < classAThreshold) {
        result.smartClass = "A";
      } else if (i < classBThreshold) {
        result.smartClass = "B";
      } else {
        result.smartClass = "C";
      }
    }
    
    let partsUpdated = 0;
    for (const result of results) {
      const part = allParts.find(p => p.id === result.partId);
      if (!part) continue;
      
      const snapshot: InsertPartClassificationSnapshot = {
        runId: run.id,
        partId: result.partId,
        annualQty: String(result.annualQty),
        annualSpend: String(result.annualSpend),
        costScore: String(result.costScore),
        roadcallCount: result.roadcallCount,
        downtimeHours: String(result.downtimeHours),
        roadcallScore: String(result.roadcallScore),
        safetyScore: String(result.safetyScore),
        totalScore: String(result.totalScore),
        classResult: result.smartClass,
        xyzResult: result.xyzClass,
        explanationJson: result.explanation,
      };
      await storage.createPartClassificationSnapshot(snapshot);
      
      if (!part.classificationLocked) {
        const oldClass = part.smartClass;
        const oldXyz = part.xyzClass;
        
        if (oldClass !== result.smartClass || oldXyz !== result.xyzClass) {
          await storage.updatePart(part.id, {
            smartClass: result.smartClass,
            xyzClass: result.xyzClass,
            priorityScore: String(result.totalScore),
            lastClassifiedAt: new Date(),
          });
          
          await storage.createClassificationAuditLogEntry({
            orgId,
            partId: part.id,
            oldClass,
            newClass: result.smartClass,
            oldXyz,
            newXyz: result.xyzClass,
            reason: `Auto-classification run ${run.id}`,
            isSystem: true,
          });
          
          partsUpdated++;
        }
      }
    }
    
    await storage.updateClassificationRun(run.id, {
      status: "completed",
      finishedAt: new Date(),
      partsProcessed: results.length,
      partsUpdated,
    });
    
    return { runId: run.id, results };
  } catch (error) {
    await storage.updateClassificationRun(run.id, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function overridePartClassification(
  partId: number,
  newClass: "S" | "A" | "B" | "C",
  newXyz: "X" | "Y" | "Z" | undefined,
  reason: string,
  userId: string,
  orgId: number
): Promise<void> {
  const part = await storage.getPart(partId);
  if (!part) throw new Error("Part not found");
  
  const oldClass = part.smartClass;
  const oldXyz = part.xyzClass;
  
  const updateData: Partial<Part> = {
    smartClass: newClass,
    classificationLocked: true,
    lastClassifiedAt: new Date(),
  };
  
  if (newXyz) {
    updateData.xyzClass = newXyz;
  }
  
  await storage.updatePart(partId, updateData as any);
  
  await storage.createClassificationAuditLogEntry({
    orgId,
    partId,
    changedByUserId: userId,
    oldClass,
    newClass,
    oldXyz,
    newXyz: newXyz || oldXyz,
    reason,
    isSystem: false,
  });
}

export async function unlockPartClassification(
  partId: number,
  userId: string,
  orgId: number
): Promise<void> {
  const part = await storage.getPart(partId);
  if (!part) throw new Error("Part not found");
  
  await storage.updatePart(partId, {
    classificationLocked: false,
  } as any);
  
  await storage.createClassificationAuditLogEntry({
    orgId,
    partId,
    changedByUserId: userId,
    oldClass: part.smartClass,
    newClass: part.smartClass,
    oldXyz: part.xyzClass,
    newXyz: part.xyzClass,
    reason: "Classification unlocked - will be auto-updated on next run",
    isSystem: false,
  });
}
