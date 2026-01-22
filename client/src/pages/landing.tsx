import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wrench, 
  Truck, 
  BarChart3, 
  Shield, 
  Clock, 
  Brain,
  ArrowRight,
  CheckCircle2,
  Upload,
  Sparkles,
  BookOpen,
  Scan,
  Package,
  FileText,
  DollarSign
} from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Asset Management",
    description: "Track and manage all your vehicles, equipment, and facilities with intelligent status automation and telematics monitoring.",
  },
  {
    icon: Wrench,
    title: "Work Order Lifecycle",
    description: "Complete work order management with VMRS standardization, task assignment, time tracking, and smart part suggestions.",
  },
  {
    icon: Clock,
    title: "Preventive Maintenance",
    description: "Smart PM scheduling with AI-generated checklists, interval-based triggers, and reusable templates.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Predictive maintenance analyzing telematics, fault codes, and service manuals for accurate failure prediction.",
  },
  {
    icon: Sparkles,
    title: "Smart Part Suggestions",
    description: "AI recommends the right parts based on VMRS codes, vehicle history, and manufacturer specifications.",
  },
  {
    icon: Upload,
    title: "Seamless Data Migration",
    description: "Bulk import your existing data - assets, parts, work history, PO records - for effortless system transition.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time dashboards with KPI tracking, cost analysis, fleet health scores, and maintenance metrics.",
  },
  {
    icon: Shield,
    title: "DVIR & Compliance",
    description: "Driver Vehicle Inspection Reports with defect tracking and automatic work order generation.",
  },
  {
    icon: Scan,
    title: "Barcode & QR Scanning",
    description: "Instant asset and part lookup with integrated barcode scanner for quick field access.",
  },
  {
    icon: Package,
    title: "Inventory & Procurement",
    description: "Parts management with auto-reordering, vendor tracking, requisitions, and purchase order workflows.",
  },
  {
    icon: BookOpen,
    title: "Manual Integration",
    description: "AI reads your service manuals to generate accurate maintenance tasks and part recommendations.",
  },
  {
    icon: FileText,
    title: "Checklist Templates",
    description: "Reusable maintenance checklists with bulk assignment by make/model for fleet-wide consistency.",
  },
];

const benefits = [
  "Reduce equipment downtime by up to 45%",
  "Cut maintenance costs with predictive insights",
  "Seamlessly migrate from any existing system",
  "AI-powered part suggestions save technician time",
  "Real-time visibility into fleet health",
  "Mobile-first design for field technicians",
  "Service manual knowledge built into AI",
  "Comprehensive audit trail and compliance",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                B
              </div>
              <span className="font-bold text-xl tracking-tight">BDMA</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Benefits
              </a>
              <Button asChild data-testid="button-login">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  The{" "}
                  <span className="gradient-text">Best Damn</span>
                  <br />
                  Maintenance App
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg">
                  Enterprise-grade CMMS with AI-powered predictive maintenance, smart part suggestions, 
                  and seamless data migration. Predictable tiered pricing for fleets of all sizes.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="gap-2" data-testid="button-get-started">
                  <a href="/api/login">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">Learn More</a>
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Full access included
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No hidden fees
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Fleet Status</p>
                      <p className="text-3xl font-bold">94%</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-2xl font-semibold text-green-500">47</p>
                      <p className="text-xs text-muted-foreground">Operational</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-yellow-500">2</p>
                      <p className="text-xs text-muted-foreground">In Maintenance</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-red-500">1</p>
                      <p className="text-xs text-muted-foreground">Down</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need, Nothing You Don't</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete maintenance management solution with AI-powered intelligence. 
              One subscription unlocks all features - no tiers, no add-ons, no surprises.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One flat rate. Full access to every feature. No nickel-and-diming, no feature gates, 
              no surprise charges. Everything included from day one.
            </p>
          </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Starter", max: "10 Assets", price: "$80" },
                { name: "Growing", max: "50 Assets", price: "$300" },
                { name: "Fleet", max: "150 Assets", price: "$750" },
                { name: "Enterprise", max: "500 Assets", price: "$2,000" },
              ].map((tier) => (
                <Card key={tier.name} className="relative overflow-hidden hover-elevate transition-all duration-200">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-xl">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">Up to {tier.max}</p>
                    </div>
                    <div className="py-4">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground ml-1">/mo</span>
                    </div>
                    <Button variant={tier.name === "Fleet" ? "default" : "outline"} className="w-full" asChild>
                      <a href="/api/login">Select Plan</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">Need more than 500 assets? Contact us for custom enterprise pricing.</p>
              <Button variant="ghost" asChild>
                <a href="/api/login">Contact Sales</a>
              </Button>
            </div>
        </div>
      </section>

      <section id="benefits" className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-4">Why Choose BDMA?</h2>
                <p className="text-muted-foreground">
                  Built by maintenance professionals for maintenance professionals. 
                  We understand your challenges and designed solutions that actually work.
                </p>
              </div>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild data-testid="button-start-today">
                <a href="/api/login">Start Today</a>
              </Button>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="text-3xl font-bold text-primary">45%</div>
                  <p className="text-sm text-muted-foreground">Reduced Downtime</p>
                </Card>
                <Card className="p-4">
                  <div className="text-3xl font-bold text-primary">30%</div>
                  <p className="text-sm text-muted-foreground">Cost Savings</p>
                </Card>
                <Card className="p-4">
                  <div className="text-3xl font-bold text-primary">2x</div>
                  <p className="text-sm text-muted-foreground">Faster Work Orders</p>
                </Card>
                <Card className="p-4">
                  <div className="text-3xl font-bold text-primary">99%</div>
                  <p className="text-sm text-muted-foreground">User Satisfaction</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Switching Systems? We Make It Easy.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Our bulk import tools let you bring your entire maintenance history with you. 
            Assets, parts, work orders, purchase orders - import it all and hit the ground running.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm">
              <Upload className="h-4 w-4 text-primary" />
              <span>Asset Import</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span>Parts Inventory</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm">
              <Wrench className="h-4 w-4 text-primary" />
              <span>Work Order History</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span>PO Records</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Usage History</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                B
              </div>
              <span className="font-semibold">BDMA</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Best Damn Maintenance App. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
