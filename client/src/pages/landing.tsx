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
  CheckCircle2
} from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Asset Management",
    description: "Track and manage all your vehicles, equipment, and facilities with intelligent status automation.",
  },
  {
    icon: Wrench,
    title: "Work Order Lifecycle",
    description: "Complete work order management with task assignment, time tracking, and parts consumption.",
  },
  {
    icon: Clock,
    title: "Preventive Maintenance",
    description: "Smart PM scheduling with interval-based triggers and predictive rescheduling.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Predictive maintenance using AI for failure prediction and root cause analysis.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time dashboards with KPI tracking, cost analysis, and maintenance metrics.",
  },
  {
    icon: Shield,
    title: "DVIR & Compliance",
    description: "Driver Vehicle Inspection Reports with defect tracking and automatic work order generation.",
  },
];

const benefits = [
  "Reduce equipment downtime by up to 45%",
  "Cut maintenance costs with predictive insights",
  "Streamline procurement and inventory management",
  "Real-time visibility into fleet health",
  "Mobile-first design for field technicians",
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
                  Enterprise-grade CMMS that goes beyond the competition. Intelligent asset management, 
                  predictive maintenance, and unmatched efficiency for modern maintenance teams.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="gap-2" data-testid="button-get-started">
                  <a href="/api/login">
                    Get Started Free
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
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Free forever plan
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
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete maintenance management solution designed for organizations that demand excellence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <section id="benefits" className="py-20 px-4">
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
              <Button size="lg" asChild data-testid="button-start-free">
                <a href="/api/login">Start Free Today</a>
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
