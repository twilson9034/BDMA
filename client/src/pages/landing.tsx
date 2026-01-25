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
  Users,
  Bell,
  MapPin,
  MessageSquare,
  PenTool,
  CircleDollarSign,
  Layers,
  Settings,
  RotateCcw,
  TrendingUp,
  Target,
  Zap,
  Award,
  Calculator,
  UserCog,
  HelpCircle
} from "lucide-react";

import heroFleetImage from "@assets/images/hero-fleet.jpg";
import technicianImage from "@assets/images/technician-work.jpg";
import inventoryImage from "@assets/images/inventory-warehouse.jpg";

const features = [
  {
    icon: Truck,
    title: "Asset & Fleet Management",
    description: "Track vehicles, equipment, and facilities with GPS location, lifecycle management, custom fields, and intelligent status automation.",
  },
  {
    icon: Wrench,
    title: "Work Order Excellence",
    description: "Complete work order management with VMRS codes, line items, multi-technician labor tracking, signature capture, and deferred line tracking.",
  },
  {
    icon: Clock,
    title: "Preventive Maintenance",
    description: "Smart PM scheduling with meter and time-based triggers, AI-generated checklists, batch work order creation, and PM compliance tracking.",
  },
  {
    icon: Brain,
    title: "AI-Powered Predictions",
    description: "Predictive maintenance analyzing telematics, fault codes, and service history for accurate failure prediction and fleet-wide pattern analysis.",
  },
  {
    icon: Sparkles,
    title: "Smart Part Suggestions",
    description: "AI recommends parts based on VMRS codes, vehicle history, manufacturer specs, and historical usage patterns.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Parts tracking with barcoding, ABC classification, cycle counting, reorder alerts, and automated stock management.",
  },
  {
    icon: CircleDollarSign,
    title: "Procurement Workflow",
    description: "Complete requisition-to-receipt flow with vendor management, purchase orders, receiving, and part creation from PO lines.",
  },
  {
    icon: FileText,
    title: "Estimates & Approvals",
    description: "Create detailed maintenance estimates with line items, approval workflows, and seamless conversion to work orders.",
  },
  {
    icon: Shield,
    title: "DVIR & Compliance",
    description: "Driver Vehicle Inspection Reports with defect tracking, bulk QR code printing, and automatic work order generation.",
  },
  {
    icon: Layers,
    title: "Part Kits",
    description: "Bundle common parts for routine maintenance tasks with automatic consumption and inventory updates.",
  },
  {
    icon: MapPin,
    title: "GPS & Location Tracking",
    description: "Real-time GPS location capture with coordinates, speed, heading, and telematics provider integration.",
  },
  {
    icon: Users,
    title: "Multi-User Labor Tracking",
    description: "Timer-based labor tracking per technician with hourly rates, start/pause/stop, and calculated labor costs.",
  },
  {
    icon: MessageSquare,
    title: "Messaging System",
    description: "In-app direct messages and group conversations with entity tagging, priority levels, and conversation threading.",
  },
  {
    icon: Bell,
    title: "Notification Center",
    description: "Real-time in-app notifications with priority levels, entity linking, and unread count badges.",
  },
  {
    icon: PenTool,
    title: "Signature Capture",
    description: "Digital signature collection for technicians and customers on completed work orders for compliance and verification.",
  },
  {
    icon: Scan,
    title: "Barcode & QR Scanning",
    description: "Instant asset and part lookup with integrated scanning, auto-generated part barcodes, and printable labels.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Customizable dashboards with MTTR, MTBF, uptime %, PM compliance, parts usage analytics, and tire health widgets.",
  },
  {
    icon: BookOpen,
    title: "Manual Integration",
    description: "AI reads service manuals to generate accurate maintenance tasks, part recommendations, and checklist templates.",
  },
  {
    icon: Upload,
    title: "Bulk Data Import",
    description: "CSV import for assets, parts, work history, and PO records with field mapping and detailed error reporting.",
  },
  {
    icon: RotateCcw,
    title: "Transaction Reversals",
    description: "Atomic reversal of inventory and labor transactions with full audit trail and accountability.",
  },
  {
    icon: Calculator,
    title: "Labor Rate Calculator",
    description: "Calculate optimal shop labor rates with AI-assisted overhead estimates and real technician wage data integration.",
  },
  {
    icon: UserCog,
    title: "Technician Management",
    description: "Manage technician hourly rates with role-based access. Rates flow into labor cost calculations across work orders.",
  },
  {
    icon: HelpCircle,
    title: "Knowledge Base",
    description: "Comprehensive help documentation with 20+ articles covering features, API integrations, workflows, and troubleshooting.",
  },
];

const tireFeature = {
  title: "Tire Management",
  description: "Complete tire inventory with specifications (make, model, DOT code), condition tracking, lifecycle management, and TPMS-ready monitoring.",
};

const workflowSteps = [
  {
    step: 1,
    title: "Inspect",
    description: "DVIRs and inspections identify issues before they become failures",
    icon: Shield,
  },
  {
    step: 2,
    title: "Predict",
    description: "AI analyzes patterns to forecast maintenance needs",
    icon: Brain,
  },
  {
    step: 3,
    title: "Schedule",
    description: "PM schedules and work orders keep your fleet maintained",
    icon: Clock,
  },
  {
    step: 4,
    title: "Execute",
    description: "Technicians complete work with parts, labor, and signatures",
    icon: Wrench,
  },
  {
    step: 5,
    title: "Analyze",
    description: "Dashboards and reports drive continuous improvement",
    icon: BarChart3,
  },
];

const industryBenchmarks = [
  {
    stat: "Up to 50%",
    label: "Reduction in Unplanned Downtime",
    description: "Organizations following CMMS best practices and preventive maintenance programs",
  },
  {
    stat: "Up to 25%",
    label: "Lower Maintenance Costs",
    description: "Through predictive insights, optimized inventory, and reduced emergency repairs",
  },
  {
    stat: "Up to 70%",
    label: "Fewer Stockouts",
    description: "With proper inventory management, reorder points, and ABC classification",
  },
  {
    stat: "Up to 20%",
    label: "Extended Asset Life",
    description: "By adhering to PM schedules and addressing issues before they escalate",
  },
];

const benefits = [
  "Built on industry-standard VMRS codes for maintenance classification",
  "AI-powered predictions based on telematics and fault code analysis",
  "Complete procurement workflow from requisition to receipt",
  "Multi-tenant architecture for organizations of all sizes",
  "Real-time GPS and telematics integration ready",
  "Mobile-first design for field technicians",
  "Service manual knowledge integrated into AI recommendations",
  "Comprehensive audit trail and compliance documentation",
  "Tire management with lifecycle tracking and TPMS support",
  "ABC classification for optimized inventory investment",
  "Shop labor rate calculator with AI-assisted overhead estimates",
  "Technician wage management for accurate labor costing",
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
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Benefits
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild data-testid="button-login">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Stock Image */}
      <section className="relative pt-16 min-h-[90vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroFleetImage} 
            alt="Fleet of commercial vehicles" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary">
                <Zap className="h-4 w-4" />
                Enterprise-Grade CMMS
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                The{" "}
                <span className="gradient-text">Best Damn</span>
                <br />
                Maintenance App
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Complete fleet maintenance management with AI-powered predictions, 
                smart inventory control, and everything you need to maximize uptime 
                and minimize costs. Built on industry best practices.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="gap-2" data-testid="button-get-started">
                <a href="/api/login">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#workflow">See How It Works</a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Full feature access
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Setup in minutes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Benchmarks Section */}
      <section className="py-20 px-4 bg-primary/5 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Best Practices Achieve</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Organizations utilizing CMMS best practices and preventive maintenance programs 
              consistently see these industry-recognized improvements. BDMA is built to help you achieve them.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industryBenchmarks.map((benchmark) => (
              <Card key={benchmark.label} className="text-center">
                <CardContent className="pt-6 space-y-2">
                  <div className="text-4xl font-bold text-primary">{benchmark.stat}</div>
                  <div className="font-semibold">{benchmark.label}</div>
                  <p className="text-sm text-muted-foreground">{benchmark.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-4">
              <Award className="h-4 w-4" />
              Complete Feature Set
            </div>
            <h2 className="text-3xl font-bold mb-4">Everything Your Fleet Needs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive maintenance management platform with 20+ integrated modules. 
              Every feature works together to optimize your fleet operations.
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
            {/* Tire Management with different icon */}
            <Card className="hover-elevate transition-all duration-200">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{tireFeature.title}</h3>
                <p className="text-sm text-muted-foreground">{tireFeature.description}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works - Workflow Section */}
      <section id="workflow" className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">The BDMA Maintenance Cycle</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A proven workflow that transforms reactive maintenance into proactive fleet management. 
              Every step is connected and automated.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {workflowSteps.map((step, index) => (
              <div key={step.step} className="relative">
                <Card className="h-full">
                  <CardContent className="pt-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-sm font-medium text-primary mb-2">Step {step.step}</div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technician Image + Benefits Section */}
      <section id="benefits" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-2xl overflow-hidden">
              <img 
                src={technicianImage} 
                alt="Professional technician performing maintenance" 
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <Card className="bg-background/95 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Built for Real Technicians</p>
                        <p className="text-sm text-muted-foreground">Mobile-first design for the shop floor</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-4">Why Choose BDMA?</h2>
                <p className="text-muted-foreground">
                  Built by maintenance professionals who understand fleet operations. 
                  Every feature is designed to solve real problems and deliver measurable results.
                </p>
              </div>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild data-testid="button-start-today">
                <a href="/api/login">Start Your Free Trial</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Image Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <h2 className="text-3xl font-bold">Complete Inventory Control</h2>
              <p className="text-muted-foreground">
                From receiving to consumption, BDMA tracks every part with precision. 
                Barcoding, ABC classification, cycle counting, and automated reordering 
                ensure you always have the right parts when you need them.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Scan className="h-5 w-5 text-primary" />
                    <span className="font-medium">Auto-Generated Barcodes</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-medium">ABC Classification</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    <span className="font-medium">Cycle Counting</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <span className="font-medium">Reorder Alerts</span>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative rounded-2xl overflow-hidden">
              <img 
                src={inventoryImage} 
                alt="Organized parts warehouse inventory" 
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every plan includes full access to all features. Choose based on your fleet size. 
              No hidden fees, no feature gates, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden hover-elevate transition-all duration-200">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-xl">Starter</h3>
                  <p className="text-sm text-muted-foreground">For small fleets getting started</p>
                </div>
                <div>
                  <span className="text-4xl font-bold">$80</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Up to 10 assets
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    All features included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Unlimited users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Email support
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/login">Get Started</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-primary hover-elevate transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl">Professional</h3>
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>
                  </div>
                  <p className="text-sm text-muted-foreground">For growing fleets</p>
                </div>
                <div>
                  <span className="text-4xl font-bold">$300</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Up to 50 assets
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    All features included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Unlimited users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Priority support
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <a href="/api/login">Get Started</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden hover-elevate transition-all duration-200">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-xl">Enterprise</h3>
                  <p className="text-sm text-muted-foreground">For large fleet operations</p>
                </div>
                <div>
                  <span className="text-4xl font-bold">$750+</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    150+ assets
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    All features included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Unlimited users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Dedicated support
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/login">Contact Sales</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need a custom plan for 500+ assets? <a href="/api/login" className="text-primary hover:underline">Contact us</a> for enterprise pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Data Migration Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Switching Systems? We Make It Easy.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Our bulk import tools let you bring your entire maintenance history with you. 
            Assets, parts, work orders, purchase orders - import it all and hit the ground running.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-full text-sm">
              <Upload className="h-4 w-4 text-primary" />
              <span>Asset Import</span>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-full text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span>Parts Inventory</span>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-full text-sm">
              <Wrench className="h-4 w-4 text-primary" />
              <span>Work Order History</span>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-full text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span>PO Records</span>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-full text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Usage History</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold">Ready for the Best Damn Maintenance Experience?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join fleet operators who are maximizing uptime, reducing costs, and taking control 
            of their maintenance operations with BDMA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2" data-testid="button-final-cta">
              <a href="/api/login">
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Explore All Features</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required. Full access for 14 days.
          </p>
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
