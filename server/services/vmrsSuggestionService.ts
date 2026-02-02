import { db } from "../db";
import { parts, vmrsDictionary, vmrsMappingFeedback, vmrsTextFeedback } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { Part, VmrsDictionary, InsertVmrsMappingFeedback } from "@shared/schema";

export interface VmrsSuggestion {
  systemCode: string;
  assemblyCode?: string;
  componentCode?: string;
  safetySystem: string;
  confidence: number;
  explanation: string;
  matchedKeywords: string[];
  dictionaryEntryId?: number;
}

interface SuggestionResult {
  partId: number;
  partNumber: string;
  partName: string;
  suggestions: VmrsSuggestion[];
  topSuggestion?: VmrsSuggestion;
}

const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  "brk": "brake",
  "chmbr": "chamber",
  "adj": "adjuster",
  "svc": "service",
  "rr": "rear",
  "fr": "front",
  "lh": "left",
  "rh": "right",
  "assy": "assembly",
  "sys": "system",
  "mtr": "motor",
  "pmp": "pump",
  "vlv": "valve",
  "hd": "head",
  "cyl": "cylinder",
  "eng": "engine",
  "trans": "transmission",
  "elec": "electrical",
  "hyd": "hydraulic",
  "pneu": "pneumatic",
  "a/c": "air conditioning",
  "ac": "air conditioning",
  "ps": "power steering",
  "abs": "abs",
  "dpf": "diesel particulate filter",
  "scr": "selective catalytic reduction",
  "doc": "diesel oxidation catalyst",
  "cac": "charge air cooler",
  "ctis": "central tire inflation system",
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "with", "by", "is", "are",
  "as", "be", "it", "this", "that", "from", "has", "have", "had", "was", "were", "will",
]);

type SafetySystem = "BRAKES" | "STEERING" | "TIRES_WHEELS" | "SUSPENSION" | "ELECTRICAL" | "HVAC" | "OTHER";

const SYSTEM_SAFETY_MAP: Record<string, SafetySystem> = {
  "001": "HVAC",
  "002": "OTHER",
  "003": "OTHER",
  "011": "OTHER",
  "012": "OTHER",
  "013": "BRAKES",
  "014": "OTHER",
  "015": "STEERING",
  "016": "SUSPENSION",
  "017": "TIRES_WHEELS",
  "018": "TIRES_WHEELS",
  "031": "ELECTRICAL",
  "032": "ELECTRICAL",
  "034": "ELECTRICAL",
  "041": "OTHER",
  "042": "OTHER",
  "043": "OTHER",
  "044": "OTHER",
  "045": "OTHER",
  "048": "OTHER",
};

const STARTER_SYSTEM_RULES: Array<{
  systemCode: string;
  title: string;
  keywords: string[];
  baseConfidence: number;
}> = [
  { systemCode: "001", title: "HVAC", keywords: ["hvac", "a/c", "ac", "air conditioning", "heater core", "blower motor", "vent", "compressor hvac", "evaporator", "condenser", "defroster", "climate"], baseConfidence: 0.85 },
  { systemCode: "002", title: "Cab/Body Sheet Metal", keywords: ["body panel", "sheet metal", "windshield frame", "cowl", "mirror bracket", "hood latch", "compartment door skin"], baseConfidence: 0.80 },
  { systemCode: "003", title: "Instruments/Gauges", keywords: ["gauge", "speedometer", "tach", "instrument cluster", "warning lamp", "indicator", "sensor gauge"], baseConfidence: 0.80 },
  { systemCode: "011", title: "Front Axle (Non-Driven)", keywords: ["front axle beam", "spindle", "knuckle", "front axle non-driven"], baseConfidence: 0.75 },
  { systemCode: "012", title: "Rear Axle (Non-Driven)", keywords: ["tag axle", "pusher axle", "rear non-driven axle", "dead axle"], baseConfidence: 0.75 },
  { systemCode: "013", title: "Brakes", keywords: ["brake", "brakes", "slack adjuster", "brake chamber", "s-cam", "caliper", "rotor", "drum", "shoe", "lining", "abs modulator", "abs sensor", "gladhand service", "air brake", "service brake", "spring brake"], baseConfidence: 0.90 },
  { systemCode: "014", title: "Frame", keywords: ["frame rail", "crossmember", "outrigger", "body mount", "subframe", "crack repair frame"], baseConfidence: 0.80 },
  { systemCode: "015", title: "Steering", keywords: ["steering", "tie rod", "drag link", "pitman arm", "idler arm", "steering gear", "steering box", "king pin", "power steering pump", "column", "steer axle alignment"], baseConfidence: 0.90 },
  { systemCode: "016", title: "Suspension", keywords: ["air spring", "air bag", "shock", "suspension", "u-bolt", "torque rod", "radius rod", "tracking bar", "height control valve", "leveling valve", "bushing", "spring hanger"], baseConfidence: 0.85 },
  { systemCode: "017", title: "Tires", keywords: ["tire", "tyre", "tread", "sidewall", "dual", "valve stem", "tire inflation", "ctis", "atis", "flat repair"], baseConfidence: 0.90 },
  { systemCode: "018", title: "Wheels/Rims/Hubs/Bearings", keywords: ["wheel", "rim", "hub", "bearing", "seal", "lug nut", "stud", "wheel end", "brake hub"], baseConfidence: 0.85 },
  { systemCode: "031", title: "Charging System", keywords: ["alternator", "voltage regulator", "charge", "charging", "battery isolator"], baseConfidence: 0.85 },
  { systemCode: "032", title: "Cranking System", keywords: ["starter", "cranking", "starter solenoid", "ignition start", "no crank"], baseConfidence: 0.85 },
  { systemCode: "034", title: "Lighting System", keywords: ["headlamp", "taillight", "marker light", "turn signal", "strobe", "clearance light", "lamp", "bulb", "lighting harness", "fog light"], baseConfidence: 0.85 },
  { systemCode: "041", title: "Air Intake", keywords: ["air filter", "intake", "charge air", "cac", "intercooler", "boost leak", "intake manifold"], baseConfidence: 0.80 },
  { systemCode: "042", title: "Cooling System", keywords: ["radiator", "water pump", "thermostat", "coolant hose", "surge tank", "fan clutch", "coolant"], baseConfidence: 0.85 },
  { systemCode: "043", title: "Exhaust System", keywords: ["exhaust", "muffler", "pipe", "aftertreatment", "dpf", "scr", "doc", "exhaust brake"], baseConfidence: 0.85 },
  { systemCode: "044", title: "Fuel System", keywords: ["fuel filter", "injector", "fuel pump", "lift pump", "rail", "diesel", "fuel line"], baseConfidence: 0.85 },
  { systemCode: "045", title: "Power Plant", keywords: ["engine", "long block", "short block", "cylinder head", "oil pan", "valvetrain"], baseConfidence: 0.80 },
  { systemCode: "048", title: "Powertrain Electric/Hybrid", keywords: ["inverter", "dc-dc", "battery pack", "traction motor", "hybrid", "regen", "hv cable", "bms", "e-axle"], baseConfidence: 0.80 },
];

const AMBIGUOUS_TERMS = new Set(["valve", "seal", "gasket", "filter", "pump", "sensor", "switch", "hose", "line", "cable"]);

function normalizeText(text: string): string[] {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/[^\w\s/-]/g, " ");
  
  Object.entries(ABBREVIATION_EXPANSIONS).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, "gi");
    normalized = normalized.replace(regex, full);
  });
  
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.filter(t => !STOP_WORDS.has(t) && t.length > 1);
}

function getSafetySystem(systemCode: string): string {
  return SYSTEM_SAFETY_MAP[systemCode] || "OTHER";
}

function calculateConfidence(
  matchedKeywords: string[],
  totalKeywords: number,
  baseConfidence: number,
  allTokens: string[]
): number {
  let confidence = baseConfidence;
  
  const matchRatio = matchedKeywords.length / Math.max(totalKeywords, 3);
  confidence += matchRatio * 0.15;
  
  if (matchedKeywords.length >= 2) {
    confidence += 0.05;
  }
  if (matchedKeywords.length >= 3) {
    confidence += 0.03;
  }
  
  const ambiguousMatches = matchedKeywords.filter(k => AMBIGUOUS_TERMS.has(k)).length;
  if (ambiguousMatches > 0 && matchedKeywords.length === ambiguousMatches) {
    confidence -= 0.15;
  }
  
  return Math.min(1.0, Math.max(0.0, confidence));
}

async function getDictionaryEntries(orgId: number): Promise<VmrsDictionary[]> {
  const entries = await db.select().from(vmrsDictionary)
    .where(and(
      eq(vmrsDictionary.isActive, true),
      eq(vmrsDictionary.orgId, orgId)
    ));
  
  const globalEntries = await db.select().from(vmrsDictionary)
    .where(and(
      eq(vmrsDictionary.isActive, true),
      isNull(vmrsDictionary.orgId)
    ));
  
  return [...entries, ...globalEntries];
}

export async function suggestVmrsForPart(
  partId: number,
  orgId: number
): Promise<SuggestionResult> {
  const [part] = await db.select().from(parts).where(eq(parts.id, partId));
  if (!part) {
    throw new Error(`Part ${partId} not found`);
  }
  
  const searchText = [part.name, part.description || "", part.partNumber].join(" ");
  const tokens = normalizeText(searchText);
  
  const suggestions: VmrsSuggestion[] = [];
  
  const dictionaryEntries = await getDictionaryEntries(orgId);
  
  for (const entry of dictionaryEntries) {
    const keywords = (entry.keywordsJson || []) as string[];
    const titleTokens = normalizeText(entry.title);
    const allKeywords = Array.from(new Set([...keywords.map(k => k.toLowerCase()), ...titleTokens]));
    
    const matchedKeywords: string[] = [];
    for (const keyword of allKeywords) {
      const keywordTokens = keyword.split(/\s+/);
      if (keywordTokens.length === 1) {
        if (tokens.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      } else {
        const searchStr = tokens.join(" ");
        if (searchStr.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }
    
    if (matchedKeywords.length > 0) {
      const confidence = calculateConfidence(matchedKeywords, allKeywords.length, 0.75, tokens);
      suggestions.push({
        systemCode: entry.systemCode,
        assemblyCode: entry.assemblyCode || undefined,
        componentCode: entry.componentCode || undefined,
        safetySystem: getSafetySystem(entry.systemCode),
        confidence,
        explanation: `Matched dictionary entry "${entry.title}" via keywords: ${matchedKeywords.join(", ")}`,
        matchedKeywords,
        dictionaryEntryId: entry.id,
      });
    }
  }
  
  for (const rule of STARTER_SYSTEM_RULES) {
    const matchedKeywords: string[] = [];
    for (const keyword of rule.keywords) {
      const keywordTokens = keyword.split(/\s+/);
      if (keywordTokens.length === 1) {
        if (tokens.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      } else {
        const searchStr = tokens.join(" ");
        if (searchStr.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }
    
    if (matchedKeywords.length > 0) {
      const existingSystemSuggestion = suggestions.find(s => s.systemCode === rule.systemCode && !s.assemblyCode);
      if (!existingSystemSuggestion) {
        const confidence = calculateConfidence(matchedKeywords, rule.keywords.length, rule.baseConfidence, tokens);
        suggestions.push({
          systemCode: rule.systemCode,
          safetySystem: getSafetySystem(rule.systemCode),
          confidence,
          explanation: `Matched system rule "${rule.title}" via keywords: ${matchedKeywords.join(", ")}`,
          matchedKeywords,
        });
      }
    }
  }
  
  suggestions.sort((a, b) => b.confidence - a.confidence);
  const topSuggestions = suggestions.slice(0, 3);
  
  if (topSuggestions.length > 0) {
    await db.update(parts).set({
      vmrsSuggestionLast: topSuggestions[0] as any,
      vmrsConfidenceLast: topSuggestions[0].confidence.toFixed(2),
      vmrsLastSuggestedAt: new Date(),
    }).where(eq(parts.id, partId));
  }
  
  return {
    partId: part.id,
    partNumber: part.partNumber,
    partName: part.name,
    suggestions: topSuggestions,
    topSuggestion: topSuggestions[0],
  };
}

export async function suggestVmrsForPartsWithoutCodes(
  orgId: number,
  limit: number = 100
): Promise<SuggestionResult[]> {
  const partsWithoutVmrs = await db.select().from(parts)
    .where(and(
      eq(parts.orgId, orgId),
      isNull(parts.vmrsCode)
    ))
    .limit(limit);
  
  const results: SuggestionResult[] = [];
  for (const part of partsWithoutVmrs) {
    try {
      const result = await suggestVmrsForPart(part.id, orgId);
      results.push(result);
    } catch (error) {
      console.error(`Error suggesting VMRS for part ${part.id}:`, error);
    }
  }
  
  return results;
}

export async function acceptVmrsSuggestion(
  partId: number,
  orgId: number,
  userId: string,
  suggestion: VmrsSuggestion,
  acceptedSystemCode?: string,
  acceptedAssemblyCode?: string,
  acceptedComponentCode?: string,
  acceptedSafetySystem?: string,
  notes?: string
): Promise<void> {
  const finalSystemCode = acceptedSystemCode || suggestion.systemCode;
  const finalAssemblyCode = acceptedAssemblyCode || suggestion.assemblyCode;
  const finalComponentCode = acceptedComponentCode || suggestion.componentCode;
  const finalSafetySystem = acceptedSafetySystem || suggestion.safetySystem;
  
  await db.update(parts).set({
    vmrsCode: finalSystemCode,
    interVmrs: finalSystemCode,
    majorVmrs: finalAssemblyCode,
    minorVmrs: finalComponentCode,
    safetySystem: finalSafetySystem as any,
    updatedAt: new Date(),
  }).where(eq(parts.id, partId));
  
  const feedback: InsertVmrsMappingFeedback = {
    orgId,
    partId,
    suggestedSystemCode: suggestion.systemCode,
    suggestedAssemblyCode: suggestion.assemblyCode,
    suggestedComponentCode: suggestion.componentCode,
    suggestedSafetySystem: suggestion.safetySystem as any,
    confidence: suggestion.confidence.toFixed(2),
    accepted: true,
    acceptedSystemCode: finalSystemCode,
    acceptedAssemblyCode: finalAssemblyCode,
    acceptedComponentCode: finalComponentCode,
    acceptedSafetySystem: finalSafetySystem as any,
    acceptedByUserId: userId,
    acceptedAt: new Date(),
    notes,
    explanation: suggestion.explanation,
  };
  
  await db.insert(vmrsMappingFeedback).values([feedback as any]);
}

export async function rejectVmrsSuggestion(
  partId: number,
  orgId: number,
  userId: string,
  suggestion: VmrsSuggestion,
  notes?: string
): Promise<void> {
  const feedback: InsertVmrsMappingFeedback = {
    orgId,
    partId,
    suggestedSystemCode: suggestion.systemCode,
    suggestedAssemblyCode: suggestion.assemblyCode,
    suggestedComponentCode: suggestion.componentCode,
    suggestedSafetySystem: suggestion.safetySystem as any,
    confidence: suggestion.confidence.toFixed(2),
    accepted: false,
    acceptedByUserId: userId,
    acceptedAt: new Date(),
    notes,
    explanation: suggestion.explanation,
  };
  
  await db.insert(vmrsMappingFeedback).values([feedback as any]);
}

export interface TextVmrsSuggestion {
  systemCode: string;
  assemblyCode?: string;
  title: string;
  confidence: number;
  explanation: string;
  matchedKeywords: string[];
  aiEnhanced?: boolean;
}

export interface TextSuggestionResult {
  text: string;
  notes?: string;
  suggestions: TextVmrsSuggestion[];
  topSuggestion?: TextVmrsSuggestion;
  needsUserConfirmation: boolean;
}

export async function suggestVmrsForText(
  text: string,
  notes?: string,
  orgId?: number
): Promise<TextSuggestionResult> {
  const searchText = [text, notes || ""].join(" ");
  const tokens = normalizeText(searchText);
  
  const suggestions: TextVmrsSuggestion[] = [];
  
  if (orgId) {
    const dictionaryEntries = await getDictionaryEntries(orgId);
    
    for (const entry of dictionaryEntries) {
      const keywords = (entry.keywordsJson || []) as string[];
      const titleTokens = normalizeText(entry.title);
      const allKeywords = Array.from(new Set([...keywords.map(k => k.toLowerCase()), ...titleTokens]));
      
      const matchedKeywords: string[] = [];
      for (const keyword of allKeywords) {
        const keywordTokens = keyword.split(/\s+/);
        if (keywordTokens.length === 1) {
          if (tokens.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        } else {
          const searchStr = tokens.join(" ");
          if (searchStr.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      }
      
      if (matchedKeywords.length > 0) {
        const confidence = calculateConfidence(matchedKeywords, allKeywords.length, 0.75, tokens);
        suggestions.push({
          systemCode: entry.systemCode,
          assemblyCode: entry.assemblyCode || undefined,
          title: entry.title,
          confidence,
          explanation: `Matched dictionary entry "${entry.title}" via keywords: ${matchedKeywords.join(", ")}`,
          matchedKeywords,
        });
      }
    }
  }
  
  for (const rule of STARTER_SYSTEM_RULES) {
    const matchedKeywords: string[] = [];
    for (const keyword of rule.keywords) {
      const keywordTokens = keyword.split(/\s+/);
      if (keywordTokens.length === 1) {
        if (tokens.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      } else {
        const searchStr = tokens.join(" ");
        if (searchStr.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }
    
    if (matchedKeywords.length > 0) {
      const existingSystemSuggestion = suggestions.find(s => s.systemCode === rule.systemCode && !s.assemblyCode);
      if (!existingSystemSuggestion) {
        const confidence = calculateConfidence(matchedKeywords, rule.keywords.length, rule.baseConfidence, tokens);
        suggestions.push({
          systemCode: rule.systemCode,
          title: rule.title,
          confidence,
          explanation: `Matched system rule "${rule.title}" via keywords: ${matchedKeywords.join(", ")}`,
          matchedKeywords,
        });
      }
    }
  }
  
  suggestions.sort((a, b) => b.confidence - a.confidence);
  const topSuggestions = suggestions.slice(0, 5);
  
  const topSuggestion = topSuggestions[0];
  const needsUserConfirmation = !topSuggestion || topSuggestion.confidence < 0.80;
  
  return {
    text,
    notes,
    suggestions: topSuggestions,
    topSuggestion,
    needsUserConfirmation,
  };
}

export async function suggestVmrsWithAI(
  text: string,
  notes?: string,
  orgId?: number
): Promise<TextSuggestionResult> {
  const keywordResult = await suggestVmrsForText(text, notes, orgId);
  
  if (keywordResult.topSuggestion && keywordResult.topSuggestion.confidence >= 0.85) {
    return keywordResult;
  }
  
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    
    const systemPrompt = `You are a fleet maintenance expert. Given a maintenance inspection item or complaint, identify the most appropriate VMRS (Vehicle Maintenance Reporting Standards) system code.

Available VMRS System Codes:
${STARTER_SYSTEM_RULES.map(r => `- ${r.systemCode}: ${r.title} (keywords: ${r.keywords.slice(0, 5).join(", ")})`).join("\n")}

Respond with a JSON object containing:
{
  "systemCode": "the 3-digit VMRS system code",
  "title": "the system title",
  "confidence": 0.0-1.0 indicating your confidence,
  "explanation": "why you chose this code"
}

If no clear match, use systemCode "000" with low confidence.`;

    const userPrompt = `Inspection/Complaint: "${text}"${notes ? `\nNotes: "${notes}"` : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed.systemCode && parsed.systemCode !== "000") {
        const aiSuggestion: TextVmrsSuggestion = {
          systemCode: parsed.systemCode,
          title: parsed.title || STARTER_SYSTEM_RULES.find(r => r.systemCode === parsed.systemCode)?.title || "Unknown",
          confidence: Math.min(parsed.confidence || 0.75, 0.95),
          explanation: parsed.explanation || "AI-suggested based on text analysis",
          matchedKeywords: [],
          aiEnhanced: true,
        };
        
        const existingIndex = keywordResult.suggestions.findIndex(s => s.systemCode === aiSuggestion.systemCode);
        if (existingIndex >= 0) {
          keywordResult.suggestions[existingIndex].confidence = Math.max(
            keywordResult.suggestions[existingIndex].confidence,
            aiSuggestion.confidence
          );
          keywordResult.suggestions[existingIndex].aiEnhanced = true;
          keywordResult.suggestions[existingIndex].explanation += ` (AI confirmed: ${aiSuggestion.explanation})`;
        } else {
          keywordResult.suggestions.unshift(aiSuggestion);
        }
        
        keywordResult.suggestions.sort((a, b) => b.confidence - a.confidence);
        keywordResult.topSuggestion = keywordResult.suggestions[0];
        keywordResult.needsUserConfirmation = !keywordResult.topSuggestion || keywordResult.topSuggestion.confidence < 0.80;
      }
    }
  } catch (error) {
    console.error("Error getting AI VMRS suggestion:", error);
  }
  
  return keywordResult;
}

export async function seedVmrsDictionary(orgId: number | null = null): Promise<number> {
  let insertedCount = 0;
  
  for (const rule of STARTER_SYSTEM_RULES) {
    const existing = await db.select().from(vmrsDictionary)
      .where(and(
        eq(vmrsDictionary.systemCode, rule.systemCode),
        orgId ? eq(vmrsDictionary.orgId, orgId) : isNull(vmrsDictionary.orgId),
        isNull(vmrsDictionary.assemblyCode),
        isNull(vmrsDictionary.componentCode)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(vmrsDictionary).values({
        orgId,
        systemCode: rule.systemCode,
        title: rule.title,
        keywordsJson: rule.keywords,
        source: "starter",
        isActive: true,
      });
      insertedCount++;
    }
  }
  
  return insertedCount;
}

export async function saveTextVmrsFeedback(
  sourceText: string,
  sourceNotes: string | undefined,
  suggestedSystemCode: string | undefined,
  suggestedTitle: string | undefined,
  suggestedConfidence: number | undefined,
  selectedSystemCode: string | undefined,
  selectedTitle: string | undefined,
  wasAutoApplied: boolean,
  wasSkipped: boolean,
  userId: string,
  orgId?: number
): Promise<void> {
  try {
    await db.insert(vmrsTextFeedback).values({
      orgId: orgId || null,
      sourceText,
      sourceNotes: sourceNotes || null,
      sourceType: "checklist_item",
      suggestedSystemCode: suggestedSystemCode || null,
      suggestedTitle: suggestedTitle || null,
      suggestedConfidence: suggestedConfidence != null ? suggestedConfidence.toFixed(2) : null,
      selectedSystemCode: selectedSystemCode || null,
      selectedTitle: selectedTitle || null,
      wasAutoApplied,
      wasSkipped,
      selectedByUserId: userId,
    });
    console.log(`[VMRS Feedback] Saved feedback for text: "${sourceText.substring(0, 50)}..." selected: ${selectedSystemCode || 'skipped'}`);
  } catch (error) {
    console.error("Error saving VMRS text feedback:", error);
  }
}

export { STARTER_SYSTEM_RULES, SYSTEM_SAFETY_MAP };
