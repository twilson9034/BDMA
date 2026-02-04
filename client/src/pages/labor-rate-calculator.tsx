import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calculator, 
  DollarSign, 
  Users, 
  Building2, 
  Wrench,
  TrendingUp,
  Info,
  RotateCcw,
  Sparkles,
  Download,
  Loader2,
  MapPin,
  Truck,
  Store
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrgMember {
  id: number;
  userId: string;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  hourlyRate: string | null;
}

type ShopType = "commercial" | "fleet";

interface CostInputs {
  technicianCount: number;
  avgHourlyWage: number;
  benefitsPercent: number;
  annualRent: number;
  annualUtilities: number;
  annualInsurance: number;
  annualEquipment: number;
  annualSupplies: number;
  annualTraining: number;
  annualSoftware: number;
  annualOther: number;
  targetProfitMargin: number;
  billableHoursPerTech: number;
  externalLaborRate: number;
}

const defaultInputs: CostInputs = {
  technicianCount: 3,
  avgHourlyWage: 25,
  benefitsPercent: 30,
  annualRent: 36000,
  annualUtilities: 6000,
  annualInsurance: 12000,
  annualEquipment: 8000,
  annualSupplies: 4000,
  annualTraining: 2000,
  annualSoftware: 3000,
  annualOther: 2000,
  targetProfitMargin: 20,
  billableHoursPerTech: 1600,
  externalLaborRate: 125,
};

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function CostInput({ 
  label, 
  value, 
  onChange, 
  prefix = "$",
  suffix,
  tooltip,
  testId
}: { 
  label: string; 
  value: number; 
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={testId}>{label}</Label>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          id={testId}
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={prefix ? "pl-7" : ""}
          data-testid={testId}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function LaborRateCalculator() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [shopType, setShopType] = useState<ShopType>("fleet");
  const [inputs, setInputs] = useState<CostInputs>(defaultInputs);
  const [shopLocation, setShopLocation] = useState("");
  const [shopSqFt, setShopSqFt] = useState("");

  const { data: members = [], isLoading: membersLoading } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations/current/members"],
    enabled: isAuthenticated,
  });

  const techsWithRates = members.filter(m => m.hourlyRate && parseFloat(m.hourlyRate) > 0);
  
  const loadTechDataFromOrg = () => {
    if (techsWithRates.length > 0) {
      const totalRate = techsWithRates.reduce((sum, t) => sum + parseFloat(t.hourlyRate!), 0);
      const avgRate = totalRate / techsWithRates.length;
      setInputs(prev => ({
        ...prev,
        technicianCount: techsWithRates.length,
        avgHourlyWage: Math.round(avgRate * 100) / 100,
      }));
      toast({
        title: "Data loaded",
        description: `Loaded ${techsWithRates.length} technician(s) with an average rate of $${avgRate.toFixed(2)}/hr.`,
      });
    } else {
      toast({
        title: "No technician data",
        description: "No technicians with hourly rates found. Set rates in Technician Management.",
        variant: "destructive",
      });
    }
  };

  const aiSuggestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/suggest-overhead-costs", {
        location: shopLocation,
        shopSqFt: shopSqFt ? parseInt(shopSqFt) : undefined,
        technicianCount: inputs.technicianCount,
        existingCosts: {
          rent: inputs.annualRent > 0 ? inputs.annualRent : undefined,
          utilities: inputs.annualUtilities > 0 ? inputs.annualUtilities : undefined,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      setInputs(prev => ({
        ...prev,
        annualRent: data.annualRent || prev.annualRent,
        annualUtilities: data.annualUtilities || prev.annualUtilities,
        annualInsurance: data.annualInsurance || prev.annualInsurance,
        annualEquipment: data.annualEquipment || prev.annualEquipment,
        annualSupplies: data.annualSupplies || prev.annualSupplies,
        annualTraining: data.annualTraining || prev.annualTraining,
        annualSoftware: data.annualSoftware || prev.annualSoftware,
        annualOther: data.annualOther || prev.annualOther,
      }));
      toast({
        title: "AI suggestions applied",
        description: data.reasoning || "Overhead costs have been estimated based on your location and shop details.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to get suggestions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInput = (key: keyof CostInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const calculations = useMemo(() => {
    const {
      technicianCount,
      avgHourlyWage,
      benefitsPercent,
      annualRent,
      annualUtilities,
      annualInsurance,
      annualEquipment,
      annualSupplies,
      annualTraining,
      annualSoftware,
      annualOther,
      targetProfitMargin,
      billableHoursPerTech,
      externalLaborRate,
    } = inputs;

    const annualHoursPerTech = 2080;
    const totalAnnualWages = technicianCount * avgHourlyWage * annualHoursPerTech;
    const totalBenefitsCost = totalAnnualWages * (benefitsPercent / 100);
    const totalLaborCost = totalAnnualWages + totalBenefitsCost;

    const totalOverhead = 
      annualRent + 
      annualUtilities + 
      annualInsurance + 
      annualEquipment + 
      annualSupplies + 
      annualTraining + 
      annualSoftware + 
      annualOther;

    const totalAnnualCosts = totalLaborCost + totalOverhead;
    const totalBillableHours = technicianCount * billableHoursPerTech;

    const costPerBillableHour = totalBillableHours > 0 
      ? totalAnnualCosts / totalBillableHours 
      : 0;

    // For commercial shops, calculate rate with profit margin
    const effectiveProfitMargin = shopType === "fleet" ? 0 : targetProfitMargin;
    const recommendedRate = costPerBillableHour / (1 - (effectiveProfitMargin / 100));
    const profitPerHour = recommendedRate - costPerBillableHour;
    const annualProfit = profitPerHour * totalBillableHours;
    const annualRevenue = recommendedRate * totalBillableHours;

    const laborEfficiency = (billableHoursPerTech / annualHoursPerTech) * 100;

    // Fleet shop: outsourcing comparison
    const externalAnnualCost = externalLaborRate * totalBillableHours;
    const annualSavings = externalAnnualCost - totalAnnualCosts;
    const savingsPerHour = externalLaborRate - costPerBillableHour;
    const savingsPercent = externalLaborRate > 0 
      ? ((externalLaborRate - costPerBillableHour) / externalLaborRate) * 100 
      : 0;

    return {
      totalAnnualWages,
      totalBenefitsCost,
      totalLaborCost,
      totalOverhead,
      totalAnnualCosts,
      totalBillableHours,
      costPerBillableHour,
      recommendedRate,
      profitPerHour,
      annualProfit,
      annualRevenue,
      laborEfficiency,
      externalAnnualCost,
      annualSavings,
      savingsPerHour,
      savingsPercent,
    };
  }, [inputs, shopType]);

  const resetToDefaults = () => {
    setInputs(defaultInputs);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            Shop Labor Rate Calculator
          </h1>
          <p className="text-muted-foreground">
            {shopType === "fleet" 
              ? "Calculate your true internal labor cost and compare against outsourcing."
              : "Calculate your optimal shop labor rate based on your actual costs and target profit margin."
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Shop Type Toggle */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Label className="text-sm font-medium">Shop Type:</Label>
            <div className="flex gap-2">
              <Button
                variant={shopType === "fleet" ? "default" : "outline"}
                size="sm"
                onClick={() => setShopType("fleet")}
                className="gap-2"
                data-testid="button-shop-type-fleet"
              >
                <Truck className="h-4 w-4" />
                Fleet / Internal
              </Button>
              <Button
                variant={shopType === "commercial" ? "default" : "outline"}
                size="sm"
                onClick={() => setShopType("commercial")}
                className="gap-2"
                data-testid="button-shop-type-commercial"
              >
                <Store className="h-4 w-4" />
                Commercial Shop
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {shopType === "fleet" 
                ? "Internal shops are cost centers - calculates true cost per hour for internal allocations and outsourcing comparison."
                : "Commercial shops charge customers - calculates rates including your target profit margin."
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Labor Costs */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Labor Costs
                  </CardTitle>
                  <CardDescription>
                    Enter your technician wages and benefits information
                  </CardDescription>
                </div>
                {isAuthenticated && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadTechDataFromOrg}
                    disabled={membersLoading}
                    data-testid="button-load-tech-data"
                  >
                    {membersLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Load from Team
                    {techsWithRates.length > 0 && (
                      <span className="ml-1 text-xs">({techsWithRates.length})</span>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <CostInput
                label="Number of Technicians"
                value={inputs.technicianCount}
                onChange={(v) => updateInput('technicianCount', v)}
                prefix=""
                tooltip="Total number of billable technicians in your shop"
                testId="input-technician-count"
              />
              <CostInput
                label="Avg Hourly Wage"
                value={inputs.avgHourlyWage}
                onChange={(v) => updateInput('avgHourlyWage', v)}
                tooltip="Average hourly wage paid to technicians"
                testId="input-hourly-wage"
              />
              <CostInput
                label="Benefits (%)"
                value={inputs.benefitsPercent}
                onChange={(v) => updateInput('benefitsPercent', v)}
                prefix=""
                suffix="%"
                tooltip="Benefits cost as a percentage of wages (health insurance, 401k, etc.)"
                testId="input-benefits-percent"
              />
            </CardContent>
          </Card>

          {/* Overhead Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Annual Overhead Costs
              </CardTitle>
              <CardDescription>
                Enter your annual facility and operating expenses, or use AI to estimate based on your location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-muted/50">
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end mt-1">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="shop-location" className="text-xs">Shop Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="shop-location"
                            value={shopLocation}
                            onChange={(e) => setShopLocation(e.target.value)}
                            placeholder="City, State"
                            className="pl-8 h-9"
                            data-testid="input-shop-location"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="shop-sqft" className="text-xs">Shop Size (sq ft)</Label>
                        <Input
                          id="shop-sqft"
                          type="number"
                          value={shopSqFt}
                          onChange={(e) => setShopSqFt(e.target.value)}
                          placeholder="e.g. 3000"
                          className="h-9"
                          data-testid="input-shop-sqft"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => aiSuggestMutation.mutate()}
                      disabled={aiSuggestMutation.isPending}
                      size="sm"
                      data-testid="button-ai-suggest"
                    >
                      {aiSuggestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Get AI Estimates
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="grid sm:grid-cols-2 gap-4">
              <CostInput
                label="Rent / Mortgage"
                value={inputs.annualRent}
                onChange={(v) => updateInput('annualRent', v)}
                tooltip="Annual cost for shop space"
                testId="input-rent"
              />
              <CostInput
                label="Utilities"
                value={inputs.annualUtilities}
                onChange={(v) => updateInput('annualUtilities', v)}
                tooltip="Electric, gas, water, internet, phone"
                testId="input-utilities"
              />
              <CostInput
                label="Insurance"
                value={inputs.annualInsurance}
                onChange={(v) => updateInput('annualInsurance', v)}
                tooltip="Business liability, property, workers comp"
                testId="input-insurance"
              />
              <CostInput
                label="Equipment & Tools"
                value={inputs.annualEquipment}
                onChange={(v) => updateInput('annualEquipment', v)}
                tooltip="Depreciation, maintenance, and replacement of shop equipment"
                testId="input-equipment"
              />
              <CostInput
                label="Shop Supplies"
                value={inputs.annualSupplies}
                onChange={(v) => updateInput('annualSupplies', v)}
                tooltip="Consumables like rags, cleaners, safety equipment"
                testId="input-supplies"
              />
              <CostInput
                label="Training & Certifications"
                value={inputs.annualTraining}
                onChange={(v) => updateInput('annualTraining', v)}
                tooltip="Ongoing technician training and certifications"
                testId="input-training"
              />
              <CostInput
                label="Software & Subscriptions"
                value={inputs.annualSoftware}
                onChange={(v) => updateInput('annualSoftware', v)}
                tooltip="CMMS, diagnostics, information systems"
                testId="input-software"
              />
              <CostInput
                label="Other Expenses"
                value={inputs.annualOther}
                onChange={(v) => updateInput('annualOther', v)}
                tooltip="Miscellaneous operating expenses"
                testId="input-other"
              />
              </div>
            </CardContent>
          </Card>

          {/* Target Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {shopType === "fleet" ? "Productivity & Comparison" : "Target Parameters"}
              </CardTitle>
              <CardDescription>
                {shopType === "fleet" 
                  ? "Set productivity expectations and enter external rates for comparison"
                  : "Set your profit goals and productivity expectations"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {shopType === "commercial" && (
                <CostInput
                  label="Target Profit Margin"
                  value={inputs.targetProfitMargin}
                  onChange={(v) => updateInput('targetProfitMargin', v)}
                  prefix=""
                  suffix="%"
                  tooltip="Desired profit margin on labor (typically 15-25%)"
                  testId="input-profit-margin"
                />
              )}
              {shopType === "fleet" && (
                <CostInput
                  label="External Shop Rate"
                  value={inputs.externalLaborRate}
                  onChange={(v) => updateInput('externalLaborRate', v)}
                  tooltip="What local shops charge per hour. Used to compare your internal cost against outsourcing."
                  testId="input-external-rate"
                />
              )}
              <CostInput
                label="Billable Hours Per Tech (Annual)"
                value={inputs.billableHoursPerTech}
                onChange={(v) => updateInput('billableHoursPerTech', v)}
                prefix=""
                tooltip="Expected billable hours per technician per year. Industry average is 1,400-1,800 hours."
                testId="input-billable-hours"
              />
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Main Rate Card - Different for Fleet vs Commercial */}
          {shopType === "fleet" ? (
            <Card className="border-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Internal Cost Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary" data-testid="text-recommended-rate">
                    {formatCurrency(calculations.costPerBillableHour)}
                  </div>
                  <p className="text-muted-foreground mt-2">true cost per hour</p>
                </div>
                <Separator className="my-6" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">External shop rate:</span>
                    <span className="font-medium">{formatCurrency(inputs.externalLaborRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Savings per hour:</span>
                    <span className={`font-medium ${calculations.savingsPerHour >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(calculations.savingsPerHour)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Savings %:</span>
                    <span className={`font-medium ${calculations.savingsPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculations.savingsPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Recommended Labor Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary" data-testid="text-recommended-rate">
                    {formatCurrency(calculations.recommendedRate)}
                  </div>
                  <p className="text-muted-foreground mt-2">per billable hour</p>
                </div>
                <Separator className="my-6" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per hour:</span>
                    <span className="font-medium">{formatCurrency(calculations.costPerBillableHour)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit per hour:</span>
                    <span className="font-medium text-green-600">{formatCurrency(calculations.profitPerHour)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Annual Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Wages:</span>
                <span>{formatCurrency(calculations.totalAnnualWages)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Benefits Cost:</span>
                <span>{formatCurrency(calculations.totalBenefitsCost)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total Labor:</span>
                <span>{formatCurrency(calculations.totalLaborCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Overhead:</span>
                <span>{formatCurrency(calculations.totalOverhead)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Annual Costs:</span>
                <span>{formatCurrency(calculations.totalAnnualCosts)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {shopType === "fleet" ? "Annual Comparison" : "Annual Projections"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Billable Hours:</span>
                <span>{calculations.totalBillableHours.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor Efficiency:</span>
                <span>{calculations.laborEfficiency.toFixed(1)}%</span>
              </div>
              <Separator />
              {shopType === "fleet" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">If outsourced:</span>
                    <span className="font-medium">{formatCurrency(calculations.externalAnnualCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your internal cost:</span>
                    <span className="font-medium">{formatCurrency(calculations.totalAnnualCosts)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Savings:</span>
                    <span className={`font-bold ${calculations.annualSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(calculations.annualSavings)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projected Revenue:</span>
                    <span className="font-medium">{formatCurrency(calculations.annualRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projected Profit:</span>
                    <span className="font-medium text-green-600">{formatCurrency(calculations.annualProfit)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Industry Benchmarks
              </h4>
              {shopType === "fleet" ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• External shops typically charge $85-$150/hour</li>
                  <li>• Internal shops often achieve 20-40% savings</li>
                  <li>• Target 75-85% labor efficiency</li>
                  <li>• Benefits usually run 25-35% of wages</li>
                  <li>• Include ALL overhead for accurate comparison</li>
                </ul>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Commercial shops typically charge $85-$150/hour</li>
                  <li>• Target 15-25% profit margin</li>
                  <li>• Target 75-85% labor efficiency</li>
                  <li>• Benefits usually run 25-35% of wages</li>
                  <li>• Overhead should be 40-60% of labor costs</li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
