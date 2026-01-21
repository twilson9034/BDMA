import OpenAI from "openai";
import { storage } from "../storage";
import type { Asset, TelematicsData, FaultCode, InsertPrediction } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface AnalysisResult {
  prediction: string;
  predictionType: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  reasoning: string;
  dataPoints: string[];
  recommendedAction: string;
  estimatedCost?: number;
  dueDate?: Date;
}

export async function analyzeAssetHealth(assetId: number): Promise<AnalysisResult[]> {
  const asset = await storage.getAsset(assetId);
  if (!asset) throw new Error("Asset not found");

  const telematics = await storage.getLatestTelematicsData(assetId);
  const faultCodes = await storage.getFaultCodes(assetId);
  const activeFaults = faultCodes.filter(f => f.status === "active" || f.status === "pending");
  const workOrders = await storage.getWorkOrdersByAsset(assetId);
  const recentWorkOrders = workOrders.slice(0, 10);

  const prompt = buildAnalysisPrompt(asset, telematics, activeFaults, recentWorkOrders);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert fleet maintenance analyst AI. Analyze vehicle telematics data, fault codes, and maintenance history to predict potential failures and recommend preventive actions. 

Always respond with a valid JSON array of predictions. Each prediction should have:
- predictionType: string (e.g., "engine_failure", "brake_wear", "battery_replacement", "fluid_service")
- prediction: string (clear description of the predicted issue)
- severity: "low" | "medium" | "high" | "critical"
- confidence: number between 0 and 1
- reasoning: string (detailed explanation of why this prediction was made)
- dataPoints: array of strings (specific data points that led to this prediction)
- recommendedAction: string (what maintenance action should be taken)
- estimatedCost: number (optional, estimated repair cost in USD)
- daysUntilDue: number (optional, estimated days until maintenance is needed)

Be specific and actionable. If there are no concerning patterns, return an empty array.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const predictions = parsed.predictions || [];

    return predictions.map((p: any) => ({
      prediction: p.prediction,
      predictionType: p.predictionType,
      severity: p.severity || "medium",
      confidence: p.confidence || 0.5,
      reasoning: p.reasoning || "",
      dataPoints: p.dataPoints || [],
      recommendedAction: p.recommendedAction || "",
      estimatedCost: p.estimatedCost,
      dueDate: p.daysUntilDue ? new Date(Date.now() + p.daysUntilDue * 24 * 60 * 60 * 1000) : undefined,
    }));
  } catch (error) {
    console.error("AI analysis error:", error);
    return generateFallbackPredictions(asset, telematics, activeFaults);
  }
}

function buildAnalysisPrompt(
  asset: Asset,
  telematics: TelematicsData | null,
  faultCodes: FaultCode[],
  workOrders: any[]
): string {
  let prompt = `Analyze maintenance needs for:

ASSET: ${asset.name} (${asset.assetNumber})
Type: ${asset.type}
Status: ${asset.status}
Make/Model: ${asset.manufacturer || "Unknown"} ${asset.model || ""}
Year: ${asset.year || "Unknown"}
Current Meter: ${asset.currentMeterReading || "N/A"} ${asset.meterType || ""}

`;

  if (telematics) {
    prompt += `LATEST TELEMATICS (${telematics.timestamp}):
- Engine Hours: ${telematics.engineHours || "N/A"}
- Odometer: ${telematics.odometer || "N/A"} miles
- Fuel Level: ${telematics.fuelLevel || "N/A"}%
- Coolant Temp: ${telematics.coolantTemp || "N/A"}°F
- Oil Pressure: ${telematics.oilPressure || "N/A"} PSI
- Battery Voltage: ${telematics.batteryVoltage || "N/A"}V
- DEF Level: ${telematics.defLevel || "N/A"}%
- Speed: ${telematics.speed || "N/A"} mph

`;
  } else {
    prompt += `TELEMATICS: No data available\n\n`;
  }

  if (faultCodes.length > 0) {
    prompt += `ACTIVE FAULT CODES:\n`;
    faultCodes.forEach(fc => {
      prompt += `- ${fc.code}: ${fc.description || "No description"} (Severity: ${fc.severity}, SPN: ${fc.spn || "N/A"}, FMI: ${fc.fmi || "N/A"})\n`;
    });
    prompt += `\n`;
  } else {
    prompt += `FAULT CODES: None active\n\n`;
  }

  if (workOrders.length > 0) {
    prompt += `RECENT MAINTENANCE HISTORY:\n`;
    workOrders.slice(0, 5).forEach((wo: any) => {
      prompt += `- ${wo.workOrderNumber}: ${wo.title} (${wo.status}, ${wo.completedDate || wo.createdAt})\n`;
    });
    prompt += `\n`;
  }

  prompt += `Based on this data, identify any maintenance predictions, potential failures, or recommended preventive actions. Return as JSON with a "predictions" array.`;

  return prompt;
}

function generateFallbackPredictions(
  asset: Asset,
  telematics: TelematicsData | null,
  faultCodes: FaultCode[]
): AnalysisResult[] {
  const predictions: AnalysisResult[] = [];

  if (faultCodes.length > 0) {
    const criticalFaults = faultCodes.filter(f => f.severity === "critical");
    const highFaults = faultCodes.filter(f => f.severity === "high");

    if (criticalFaults.length > 0) {
      predictions.push({
        prediction: `Critical fault code${criticalFaults.length > 1 ? "s" : ""} detected requiring immediate attention`,
        predictionType: "fault_code_critical",
        severity: "critical",
        confidence: 0.95,
        reasoning: `${criticalFaults.length} critical fault code(s) are active on this asset`,
        dataPoints: criticalFaults.map(f => `${f.code}: ${f.description || "Unknown issue"}`),
        recommendedAction: "Schedule immediate inspection and diagnosis",
        estimatedCost: 500,
        dueDate: new Date(),
      });
    }

    if (highFaults.length > 0) {
      predictions.push({
        prediction: `High severity fault code${highFaults.length > 1 ? "s" : ""} require attention soon`,
        predictionType: "fault_code_high",
        severity: "high",
        confidence: 0.9,
        reasoning: `${highFaults.length} high severity fault code(s) detected`,
        dataPoints: highFaults.map(f => `${f.code}: ${f.description || "Unknown issue"}`),
        recommendedAction: "Schedule diagnostic inspection within 48 hours",
        estimatedCost: 350,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    }
  }

  if (telematics) {
    const batteryVoltage = parseFloat(String(telematics.batteryVoltage || "0"));
    if (batteryVoltage > 0 && batteryVoltage < 12.4) {
      predictions.push({
        prediction: "Low battery voltage detected - battery may need replacement",
        predictionType: "battery_replacement",
        severity: batteryVoltage < 12.0 ? "high" : "medium",
        confidence: 0.85,
        reasoning: `Battery voltage at ${batteryVoltage}V is below optimal range (12.6-12.8V)`,
        dataPoints: [`Battery voltage: ${batteryVoltage}V`],
        recommendedAction: "Test battery and charging system, replace if needed",
        estimatedCost: 200,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    const coolantTemp = parseFloat(String(telematics.coolantTemp || "0"));
    if (coolantTemp > 220) {
      predictions.push({
        prediction: "Engine running hot - cooling system inspection recommended",
        predictionType: "cooling_system",
        severity: coolantTemp > 240 ? "critical" : "high",
        confidence: 0.88,
        reasoning: `Coolant temperature at ${coolantTemp}°F exceeds normal operating range (195-220°F)`,
        dataPoints: [`Coolant temp: ${coolantTemp}°F`],
        recommendedAction: "Check coolant level, thermostat, and radiator",
        estimatedCost: 350,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });
    }

    const oilPressure = parseFloat(String(telematics.oilPressure || "0"));
    if (oilPressure > 0 && oilPressure < 25) {
      predictions.push({
        prediction: "Low oil pressure detected - engine damage risk",
        predictionType: "oil_system",
        severity: oilPressure < 15 ? "critical" : "high",
        confidence: 0.9,
        reasoning: `Oil pressure at ${oilPressure} PSI is below safe operating range (25-65 PSI)`,
        dataPoints: [`Oil pressure: ${oilPressure} PSI`],
        recommendedAction: "Check oil level and schedule oil change, inspect for leaks",
        estimatedCost: 150,
        dueDate: new Date(),
      });
    }

    const defLevel = parseFloat(String(telematics.defLevel || "100"));
    if (defLevel < 15) {
      predictions.push({
        prediction: "DEF level low - refill required soon",
        predictionType: "def_refill",
        severity: defLevel < 5 ? "high" : "medium",
        confidence: 0.95,
        reasoning: `DEF level at ${defLevel}% - vehicle may derate if not refilled`,
        dataPoints: [`DEF level: ${defLevel}%`],
        recommendedAction: "Refill DEF tank",
        estimatedCost: 50,
        dueDate: new Date(Date.now() + (defLevel < 5 ? 1 : 3) * 24 * 60 * 60 * 1000),
      });
    }
  }

  return predictions;
}

export async function savePredictions(assetId: number, predictions: AnalysisResult[]): Promise<void> {
  for (const pred of predictions) {
    const insertData: InsertPrediction = {
      assetId,
      predictionType: pred.predictionType,
      prediction: pred.prediction,
      confidence: String(pred.confidence),
      severity: pred.severity,
      reasoning: pred.reasoning,
      dataPoints: pred.dataPoints,
      recommendedAction: pred.recommendedAction,
      estimatedCost: pred.estimatedCost ? String(pred.estimatedCost) : undefined,
      dueDate: pred.dueDate,
    };
    await storage.createPrediction(insertData);
  }
}

export async function calculateFleetHealthScore(): Promise<{
  overallScore: number;
  assetScores: { assetId: number; assetName: string; score: number; status: string }[];
  criticalAlerts: number;
  highAlerts: number;
}> {
  const assets = await storage.getAssets();
  const predictions = await storage.getPredictions();
  const activePredictions = predictions.filter(p => !p.acknowledged && !p.dismissedAt);

  const criticalAlerts = activePredictions.filter(p => p.severity === "critical").length;
  const highAlerts = activePredictions.filter(p => p.severity === "high").length;

  const assetScores = await Promise.all(
    assets.map(async (asset) => {
      const assetPredictions = activePredictions.filter(p => p.assetId === asset.id);
      const faultCodes = await storage.getFaultCodes(asset.id);
      const activeFaults = faultCodes.filter(f => f.status === "active");

      let score = 100;
      
      assetPredictions.forEach(pred => {
        switch (pred.severity) {
          case "critical": score -= 25; break;
          case "high": score -= 15; break;
          case "medium": score -= 8; break;
          case "low": score -= 3; break;
        }
      });

      activeFaults.forEach(fault => {
        switch (fault.severity) {
          case "critical": score -= 20; break;
          case "high": score -= 12; break;
          case "medium": score -= 5; break;
          case "low": score -= 2; break;
        }
      });

      if (asset.status === "down") score -= 30;
      else if (asset.status === "in_maintenance") score -= 10;
      else if (asset.status === "pending_inspection") score -= 5;

      score = Math.max(0, Math.min(100, score));

      return {
        assetId: asset.id,
        assetName: asset.name,
        score,
        status: asset.status,
      };
    })
  );

  const operationalAssets = assetScores.filter(a => a.status !== "retired");
  const overallScore = operationalAssets.length > 0
    ? Math.round(operationalAssets.reduce((sum, a) => sum + a.score, 0) / operationalAssets.length)
    : 100;

  return {
    overallScore,
    assetScores: assetScores.sort((a, b) => a.score - b.score),
    criticalAlerts,
    highAlerts,
  };
}
