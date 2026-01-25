import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  DollarSign, 
  Users, 
  Building2, 
  Wrench,
  TrendingUp,
  Info,
  RotateCcw
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [inputs, setInputs] = useState<CostInputs>(defaultInputs);

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

    const recommendedRate = costPerBillableHour / (1 - (targetProfitMargin / 100));
    const profitPerHour = recommendedRate - costPerBillableHour;
    const annualProfit = profitPerHour * totalBillableHours;
    const annualRevenue = recommendedRate * totalBillableHours;

    const laborEfficiency = (billableHoursPerTech / annualHoursPerTech) * 100;

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
    };
  }, [inputs]);

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
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            Shop Labor Rate Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate your optimal shop labor rate based on your actual costs and target profit margin.
          </p>
        </div>
        <Button variant="outline" onClick={resetToDefaults} data-testid="button-reset">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Labor Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Labor Costs
              </CardTitle>
              <CardDescription>
                Enter your technician wages and benefits information
              </CardDescription>
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
                Enter your annual facility and operating expenses
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Target Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Target Parameters
              </CardTitle>
              <CardDescription>
                Set your profit goals and productivity expectations
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <CostInput
                label="Target Profit Margin"
                value={inputs.targetProfitMargin}
                onChange={(v) => updateInput('targetProfitMargin', v)}
                prefix=""
                suffix="%"
                tooltip="Desired profit margin on labor (typically 15-25%)"
                testId="input-profit-margin"
              />
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
          {/* Recommended Rate */}
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
              <CardTitle className="text-base">Annual Projections</CardTitle>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected Revenue:</span>
                <span className="font-medium">{formatCurrency(calculations.annualRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected Profit:</span>
                <span className="font-medium text-green-600">{formatCurrency(calculations.annualProfit)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Industry Benchmarks
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fleet shops typically charge $85-$150/hour</li>
                <li>• Target 75-85% labor efficiency</li>
                <li>• Benefits usually run 25-35% of wages</li>
                <li>• Overhead should be 40-60% of labor costs</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
