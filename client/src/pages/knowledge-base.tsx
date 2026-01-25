import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  BookOpen, 
  Search, 
  Truck, 
  Wrench, 
  Package, 
  FileText, 
  BarChart3,
  Shield,
  Clock,
  Brain,
  Settings,
  Upload,
  Users,
  Bell,
  MessageSquare,
  Scan,
  DollarSign,
  Code,
  Link,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  content: string;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  icon: typeof BookOpen;
  description: string;
}

const categories: Category[] = [
  { id: "getting-started", name: "Getting Started", icon: BookOpen, description: "Learn the basics of BDMA" },
  { id: "assets", name: "Asset Management", icon: Truck, description: "Track and manage your fleet assets" },
  { id: "work-orders", name: "Work Orders", icon: Wrench, description: "Create and manage maintenance work orders" },
  { id: "inventory", name: "Inventory & Parts", icon: Package, description: "Manage your parts inventory" },
  { id: "procurement", name: "Procurement", icon: FileText, description: "Requisitions, POs, and receiving" },
  { id: "pm", name: "Preventive Maintenance", icon: Clock, description: "Schedule and track PM tasks" },
  { id: "dvir", name: "DVIRs & Inspections", icon: Shield, description: "Driver vehicle inspection reports" },
  { id: "predictions", name: "AI & Predictions", icon: Brain, description: "Predictive maintenance insights" },
  { id: "reports", name: "Reports & Analytics", icon: BarChart3, description: "Dashboards and reporting" },
  { id: "api", name: "API & Integrations", icon: Code, description: "Connect external systems" },
  { id: "settings", name: "Settings & Admin", icon: Settings, description: "Configure your organization" },
];

const articles: Article[] = [
  {
    id: "gs-1",
    title: "Welcome to BDMA",
    category: "getting-started",
    content: `BDMA (Best Damn Maintenance App) is a comprehensive Computerized Maintenance Management System (CMMS) designed for fleet and asset management.

**Key Features:**
- Asset tracking with GPS and telematics integration
- Work order management with VMRS standardization
- Preventive maintenance scheduling
- AI-powered predictive maintenance
- Inventory management with barcode support
- Complete procurement workflow
- DVIR and compliance tracking
- Advanced analytics and reporting

**Getting Started:**
1. Set up your organization profile in Settings
2. Add your fleet assets
3. Configure your PM schedules
4. Start creating work orders`,
    tags: ["introduction", "overview", "basics"],
  },
  {
    id: "gs-2",
    title: "Setting Up Your Organization",
    category: "getting-started",
    content: `Configure your organization settings to customize BDMA for your fleet.

**Organization Settings:**
1. Go to Settings from the sidebar
2. Update your organization name and slug
3. Configure estimate approval workflows
4. Enable/disable barcode system for parts
5. Set up team member roles

**User Roles:**
- **Owner**: Full access, can manage billing and delete organization
- **Admin**: Full access except billing
- **Manager**: Can manage work orders, assets, and inventory
- **Technician**: Can view and update assigned work orders
- **Viewer**: Read-only access`,
    tags: ["setup", "organization", "roles", "permissions"],
  },
  {
    id: "assets-1",
    title: "Adding and Managing Assets",
    category: "assets",
    content: `Track all your vehicles, equipment, and facilities in one place.

**Adding an Asset:**
1. Navigate to Assets page
2. Click "New Asset" button
3. Fill in required fields (Name, Asset Number)
4. Add optional details (Make, Model, Year, VIN)
5. Upload photos and documents
6. Save the asset

**Asset Fields:**
- **Basic Info**: Name, number, type, status
- **Specifications**: Make, model, year, VIN, license plate
- **Location**: GPS coordinates, current location
- **Meters**: Odometer, engine hours
- **Custom Fields**: Add your own fields as needed

**Asset Statuses:**
- Operational: Ready for use
- In Maintenance: Currently being serviced
- Down: Out of service
- Disposed/Sold: No longer in fleet`,
    tags: ["assets", "vehicles", "equipment", "tracking"],
  },
  {
    id: "assets-2",
    title: "Batch Meter Updates",
    category: "assets",
    content: `Update meters for multiple assets at once.

**Steps:**
1. Go to Assets page
2. Select assets using checkboxes
3. Click "Batch Update Meters" button
4. Enter new meter readings for each asset
5. Click Save to update all at once

**Tips:**
- Use this for end-of-day odometer updates
- Meter history is tracked for PM scheduling
- Invalid readings are highlighted in red`,
    tags: ["meters", "odometer", "batch", "updates"],
  },
  {
    id: "wo-1",
    title: "Creating Work Orders",
    category: "work-orders",
    content: `Work orders track all maintenance activities on your assets.

**Creating a Work Order:**
1. Navigate to Work Orders page
2. Click "New Work Order"
3. Select the asset to be serviced
4. Choose work order type (Repair, PM, Inspection)
5. Add description and priority
6. Assign technicians
7. Save the work order

**Work Order Statuses:**
- Open: Awaiting work
- In Progress: Being worked on
- Pending Parts: Waiting for parts
- Ready for Review: Work complete, awaiting approval
- Completed: Approved and closed`,
    tags: ["work orders", "maintenance", "repair"],
  },
  {
    id: "wo-2",
    title: "Work Order Line Items",
    category: "work-orders",
    content: `Break down work orders into detailed line items for accurate tracking.

**Adding Line Items:**
1. Open the work order detail page
2. Click "Add Line Item"
3. Enter VMRS code or description
4. Select line type (Labor, Parts, Other)
5. Track time and parts consumption

**Line Item Features:**
- VMRS code classification
- Labor time tracking with timer
- Parts consumption from inventory
- Technician assignment per line
- Status tracking (Open, In Progress, Complete, Deferred)
- Notes and signature capture`,
    tags: ["line items", "labor", "parts", "VMRS"],
  },
  {
    id: "wo-3",
    title: "Signature Capture",
    category: "work-orders",
    content: `Capture digital signatures for work order verification.

**How to Capture Signatures:**
1. Open the work order in detail view
2. Scroll to the signature section
3. Have the technician sign on the signature pad
4. Have the customer/approver sign
5. Signatures are saved with timestamp

**Benefits:**
- Digital record of work completion
- Customer acknowledgment
- Compliance documentation
- Eliminates paper forms`,
    tags: ["signatures", "verification", "compliance"],
  },
  {
    id: "inv-1",
    title: "Managing Parts Inventory",
    category: "inventory",
    content: `Track parts, set reorder points, and manage stock levels.

**Adding Parts:**
1. Go to Inventory page
2. Click "New Part"
3. Enter part number, name, description
4. Set quantities (on-hand, min, max)
5. Configure reorder point
6. Assign storage location
7. Save the part

**Key Features:**
- Automatic barcode generation
- ABC classification for cycle counting
- Reorder alerts when stock is low
- Transaction history
- Multiple storage locations`,
    tags: ["inventory", "parts", "stock", "reorder"],
  },
  {
    id: "inv-2",
    title: "Barcode System",
    category: "inventory",
    content: `Use barcodes for quick part lookup and tracking.

**Enabling Barcodes:**
1. Go to Settings
2. Enable "Barcode System" toggle
3. Parts will automatically get P-prefixed barcodes

**Printing Labels:**
1. After receiving parts, print prompt appears
2. Select label size (Small, Medium, Large)
3. Click Print to generate labels
4. Labels use Code 39 format

**Scanning:**
- Use the barcode scanner button in the header
- Scan any part barcode to jump to that part
- Works with assets and work orders too`,
    tags: ["barcodes", "scanning", "labels", "QR codes"],
  },
  {
    id: "inv-3",
    title: "Part Kits",
    category: "inventory",
    content: `Bundle commonly used parts for routine maintenance.

**Creating a Part Kit:**
1. Go to Part Kits page
2. Click "New Kit"
3. Name your kit (e.g., "Oil Change Kit")
4. Add parts and quantities
5. Save the kit

**Using Kits:**
- When adding parts to a work order, select the kit
- All parts in the kit are consumed at once
- Inventory updates automatically
- Great for standardized PM tasks`,
    tags: ["kits", "bundles", "PM", "consumables"],
  },
  {
    id: "proc-1",
    title: "Procurement Workflow",
    category: "procurement",
    content: `Complete workflow from requisition to receiving.

**Workflow Steps:**
1. **Requisition**: Request parts or services
2. **Approval**: Manager approves requisition
3. **Purchase Order**: Create PO from approved requisition
4. **Send to Vendor**: Submit PO to vendor
5. **Receive**: Record items received
6. **Invoice**: Match to vendor invoice

**Creating a Requisition:**
1. Go to Requisitions page
2. Click "New Requisition"
3. Add line items with quantities
4. Submit for approval`,
    tags: ["procurement", "purchasing", "requisitions", "POs"],
  },
  {
    id: "proc-2",
    title: "Receiving Parts",
    category: "procurement",
    content: `Record received items and update inventory.

**Receiving Steps:**
1. Go to Receiving page
2. Select the Purchase Order
3. Click "Receive" on each line
4. Enter quantity received
5. Inventory updates automatically
6. Print barcode labels if enabled

**Creating Parts from PO Lines:**
If a PO line doesn't have a linked part:
1. Click "Create Part" button on the line
2. Fill in part details (pre-filled from PO)
3. Part is automatically linked
4. Proceed with receiving`,
    tags: ["receiving", "goods receipt", "inventory"],
  },
  {
    id: "pm-1",
    title: "Creating PM Schedules",
    category: "pm",
    content: `Set up preventive maintenance schedules for your assets.

**Creating a PM Schedule:**
1. Go to PM Schedules page
2. Click "New PM Schedule"
3. Select target assets (individual or by make/model)
4. Set trigger type (Time, Meter, or Both)
5. Configure intervals (e.g., every 90 days or 5000 miles)
6. Attach checklist template
7. Save the schedule

**Trigger Types:**
- **Time-based**: Every X days/weeks/months
- **Meter-based**: Every X miles/hours
- **Dual trigger**: Whichever comes first`,
    tags: ["PM", "preventive maintenance", "schedules"],
  },
  {
    id: "pm-2",
    title: "PM Dues and Batch Work Orders",
    category: "pm",
    content: `Track upcoming PMs and create work orders in batch.

**Viewing PM Dues:**
1. Go to PM Dues page
2. See all PMs due within selected timeframe
3. Filter by asset, schedule, or date range

**Batch Work Order Creation:**
1. Select multiple PM instances
2. Click "Create Work Orders"
3. Work orders are generated for each
4. Checklists auto-attached from templates`,
    tags: ["PM dues", "batch", "work orders"],
  },
  {
    id: "dvir-1",
    title: "Driver Vehicle Inspection Reports",
    category: "dvir",
    content: `Capture pre-trip and post-trip inspections.

**Creating a DVIR:**
1. Go to DVIRs page (or use QR code)
2. Select the asset
3. Complete inspection checklist
4. Note any defects found
5. Sign and submit

**Defect Workflow:**
- Major defects require mechanic sign-off
- Work orders auto-generated for defects
- Track defect resolution status

**QR Codes:**
- Print QR codes for each asset
- Drivers scan to start DVIR
- Bulk print available from Assets page`,
    tags: ["DVIR", "inspections", "pre-trip", "defects"],
  },
  {
    id: "pred-1",
    title: "AI Predictions",
    category: "predictions",
    content: `Leverage AI for predictive maintenance insights.

**How It Works:**
- Analyzes telematics data and fault codes
- Reviews maintenance history patterns
- Compares with similar assets in fleet
- Generates failure probability predictions

**Viewing Predictions:**
1. Go to Predictions page
2. See ranked list of predicted failures
3. Click to view details and reasoning
4. Create work order directly from prediction

**Providing Feedback:**
- Mark predictions as helpful or not
- AI learns from your feedback
- Improves accuracy over time`,
    tags: ["AI", "predictions", "telematics", "fault codes"],
  },
  {
    id: "reports-1",
    title: "Dashboard and Analytics",
    category: "reports",
    content: `Customize your dashboard with key metrics.

**Dashboard Widgets:**
- Fleet Status overview
- Open Work Orders count
- PM Compliance percentage
- MTTR and MTBF metrics
- Parts usage analytics
- Tire health status
- Procurement overview

**Customizing Dashboard:**
1. Click "Customize" button
2. Drag widgets to rearrange
3. Add or remove widgets
4. Save your layout`,
    tags: ["dashboard", "KPIs", "analytics", "metrics"],
  },
  {
    id: "api-1",
    title: "API Overview",
    category: "api",
    content: `BDMA provides RESTful APIs for integration with external systems.

**Base URL:** \`/api\`

**Authentication:**
All API requests require authentication via session cookie or API key.

**Common Endpoints:**
- \`GET /api/assets\` - List all assets
- \`GET /api/work-orders\` - List work orders
- \`GET /api/parts\` - List inventory parts
- \`POST /api/work-orders\` - Create work order

**Response Format:**
All responses are JSON with standard structure:
\`\`\`json
{
  "data": [...],
  "success": true
}
\`\`\``,
    tags: ["API", "REST", "integration", "endpoints"],
  },
  {
    id: "api-2",
    title: "Telematics Integration",
    category: "api",
    content: `Connect telematics providers to BDMA.

**Supported Integrations:**
- Geotab
- Samsara
- Verizon Connect
- KeepTruckin
- Custom providers

**Setup Steps:**
1. Get API credentials from your telematics provider
2. Go to Settings > Integrations
3. Select your provider
4. Enter API key and account ID
5. Configure sync settings
6. Test connection

**Data Synced:**
- GPS location
- Odometer/engine hours
- Fault codes
- Fuel consumption
- Driver behavior`,
    tags: ["telematics", "GPS", "Geotab", "Samsara"],
  },
  {
    id: "api-3",
    title: "Webhook Events",
    category: "api",
    content: `Receive real-time notifications for events.

**Available Events:**
- \`work_order.created\`
- \`work_order.completed\`
- \`asset.status_changed\`
- \`dvir.submitted\`
- \`prediction.generated\`
- \`reorder_alert.triggered\`

**Setting Up Webhooks:**
1. Go to Settings > Integrations > Webhooks
2. Add your endpoint URL
3. Select events to subscribe
4. Save and test

**Payload Format:**
\`\`\`json
{
  "event": "work_order.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": { ... }
}
\`\`\``,
    tags: ["webhooks", "events", "notifications", "real-time"],
  },
  {
    id: "settings-1",
    title: "Team Member Management",
    category: "settings",
    content: `Invite and manage your team.

**Inviting Team Members:**
1. Go to Settings
2. Scroll to Team Members section
3. Members with Replit accounts can be added

**Changing Roles:**
1. Find the team member
2. Select new role from dropdown
3. Changes take effect immediately

**Role Capabilities:**
| Role | View | Edit | Delete | Admin |
|------|------|------|--------|-------|
| Viewer | Yes | No | No | No |
| Technician | Yes | Own | No | No |
| Manager | Yes | Yes | Some | No |
| Admin | Yes | Yes | Yes | Yes |
| Owner | Yes | Yes | Yes | Yes |`,
    tags: ["team", "users", "roles", "permissions"],
  },
  {
    id: "inv-4",
    title: "Tire Management",
    category: "inventory",
    content: `Tires are managed through the inventory system with specialized tracking fields.

**Adding Tire Parts:**
1. Go to Inventory and click "New Part"
2. Select "Tires" as the category
3. Fill in tire-specific fields that appear:
   - Brand and Model
   - Size (e.g., 295/75R22.5)
   - Type (New, Retread, Used)
   - DOT Code (manufacturing date)
   - PSI Rating, Load Index, Speed Rating
   - New Tread Depth (in 32nds)

**Tire Position Tracking on Work Orders:**
When adding work order lines with tire VMRS codes (17-xxx), additional fields appear:
- Position: LF, RF, LR-O, LR-I, RR-O, RR-I, Spare
- Serial Installed: Serial number of new tire
- Serial Removed: Serial number of replaced tire
- Tread Depth Measured: Current tread reading

**Viewing Tire Inventory:**
- Navigate to the Tires page for a dedicated view
- Filter by tire type (New, Retread, Used)
- See stock levels and low stock alerts
- Track tread depth across your tire inventory`,
    tags: ["tires", "inventory", "VMRS", "position tracking"],
  },
  {
    id: "dvir-2",
    title: "OOS Standards & Compliance",
    category: "dvir",
    content: `BDMA includes an Out-of-Service (OOS) compliance engine based on CVSA standards.

**What is OOS?**
Out-of-Service standards define safety violations that require immediate action. When a vehicle fails an OOS check, it cannot operate until repaired.

**OOS Rules:**
- Navigate to OOS Standards page
- View rules organized by system (Brakes, Tires, Lamps, etc.)
- Each rule has conditions that define violations
- Conditions use operators: equals, greater than, contains, etc.

**Rule Evaluation:**
Rules evaluate data against conditions. For example:
- Tire tread depth < 2/32" = OOS violation
- Brake fluid leak detected = OOS violation
- Driver license expired = OOS violation

**Inspections:**
- OOS inspections are linked to assets
- Findings record which rules triggered violations
- Status: PASS, FAIL, OOS, or PENDING

**Starter Rules Included:**
- Brake leak detection
- Tire tread depth minimums
- Lamp functionality
- Driver license/medical certification`,
    tags: ["OOS", "CVSA", "compliance", "safety", "inspections"],
  },
  {
    id: "wo-4",
    title: "VMRS Auto-Assign",
    category: "work-orders",
    content: `VMRS Auto-Assign suggests the right VMRS codes for work order descriptions.

**How It Works:**
1. The system analyzes work order descriptions
2. Keywords are matched against a dictionary
3. Matching VMRS codes are suggested with confidence scores
4. Technicians can approve or reject suggestions

**Confidence Scoring:**
- High (0.8-1.0): Strong match, likely correct
- Medium (0.5-0.8): Probable match, verify
- Low (0.0-0.5): Possible match, review carefully

**Learning from Feedback:**
When technicians approve or reject suggestions, the system learns:
- Approved suggestions strengthen that mapping
- Rejected suggestions reduce future false positives
- Over time, accuracy improves for your organization

**Managing VMRS Auto-Assign:**
1. Go to VMRS Auto-Assign page
2. View stats: total suggestions, approval rate
3. Run bulk suggestions on pending work orders
4. Review and approve/reject suggestions`,
    tags: ["VMRS", "auto-assign", "suggestions", "machine learning"],
  },
  {
    id: "inv-5",
    title: "SMART Inventory Classification",
    category: "inventory",
    content: `SMART classification helps prioritize inventory management efforts.

**Class System:**
- **S (Safety/Compliance)**: Critical safety parts that must always be stocked
- **A (High Priority)**: High-value, high-impact parts
- **B (Medium Priority)**: Moderate importance parts
- **C (Low Priority)**: Low-value consumables

**Volatility (X/Y/Z):**
- **X**: Steady, predictable demand
- **Y**: Moderate fluctuation
- **Z**: Sporadic, unpredictable demand

**Classification Scoring:**
Combines three factors:
- Cost percentile (35%)
- Roadcall impact (35%)
- Safety factors (30%)

**Using SMART Classification:**
1. Go to SMART Classification page
2. View class breakdown statistics
3. Filter parts by class
4. Override classifications with reason tracking
5. Lock parts to prevent auto-reclassification`,
    tags: ["SMART", "classification", "ABC", "inventory", "safety"],
  },
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = searchQuery === "" || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const selectedCategoryInfo = categories.find(c => c.id === selectedCategory);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Learn how to use BDMA features and connect to APIs</p>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles, guides, and documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
          data-testid="input-search"
        />
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-2">
                <Button
                  variant={selectedCategory === null ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="button-all-categories"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  All Articles
                  <Badge variant="outline" className="ml-auto">{articles.length}</Badge>
                </Button>
                {categories.map((category) => {
                  const count = articles.filter(a => a.category === category.id).length;
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                      data-testid={`button-category-${category.id}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {category.name}
                      <Badge variant="outline" className="ml-auto">{count}</Badge>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Articles */}
        <div className="lg:col-span-3">
          {selectedCategoryInfo && (
            <Card className="mb-6 bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <selectedCategoryInfo.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{selectedCategoryInfo.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedCategoryInfo.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No articles found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or selecting a different category.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {filteredArticles.map((article) => (
                <AccordionItem 
                  key={article.id} 
                  value={article.id}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-start gap-3 text-left">
                      <div>
                        <h3 className="font-medium">{article.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {categories.find(c => c.id === article.category)?.name}
                          </Badge>
                          {article.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs text-muted-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <Separator className="mb-4" />
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {article.content.split('\n').map((paragraph, i) => {
                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return <h4 key={i} className="font-semibold mt-4 mb-2">{paragraph.replace(/\*\*/g, '')}</h4>;
                        }
                        if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
                          return <p key={i} className="ml-4">{paragraph}</p>;
                        }
                        if (paragraph.startsWith('```')) {
                          return null;
                        }
                        if (paragraph.includes('```')) {
                          const code = paragraph.replace(/```json?/g, '').replace(/```/g, '');
                          return (
                            <pre key={i} className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                              <code>{code}</code>
                            </pre>
                          );
                        }
                        if (paragraph.startsWith('|')) {
                          return <p key={i} className="font-mono text-xs">{paragraph}</p>;
                        }
                        return paragraph ? <p key={i} className="mb-2">{paragraph}</p> : null;
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
