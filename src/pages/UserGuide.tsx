import { ArrowLeft, Globe, Plus, Upload, Pencil, Crosshair, Code, Download, BarChart3, CheckCircle2, ClipboardList, Zap, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Globe,
    steps: [
      {
        title: "Create Your First App",
        content:
          "From the Dashboard, click \"New App\" to register the web application you want to add guided tours to. Enter the app name, URL, and an optional description. The URL is important — it's used to validate selectors and generate embed scripts.",
      },
      {
        title: "Navigate to Your App",
        content:
          "Click \"Open\" on any app card to access the App Detail page. Here you'll manage all business processes, checklists, extensions, and analytics for that application.",
      },
    ],
  },
  {
    id: "business-processes",
    title: "Business Processes (Tours)",
    icon: Pencil,
    steps: [
      {
        title: "Create a Process Manually",
        content:
          "Click \"New Business Process\", give it a name (e.g. \"Add New Record\"), and start adding steps in the Tour Editor. Each step has a title, description, CSS selector, and tooltip placement.",
      },
      {
        title: "Upload a User Manual",
        content:
          "Click \"Upload Manual\" and select a PDF, DOCX, or TXT file. WalkThru's AI will automatically extract business processes and their steps from the document — saving you hours of manual work.",
      },
      {
        title: "Auto-Generate Steps with AI",
        content:
          "Inside a process, click the sparkle (✨) icon to let AI analyze your app's page and automatically generate step-by-step instructions with CSS selectors.",
      },
    ],
  },
  {
    id: "tour-editor",
    title: "Using the Tour Editor",
    icon: Code,
    steps: [
      {
        title: "Add & Reorder Steps",
        content:
          "In the Tour Editor, click \"Add Step\" to create new steps. Each step appears in the sidebar on the left. Click any step to edit its title, content, CSS selector, and placement.",
      },
      {
        title: "Pick Elements with the Element Picker",
        content:
          "Click \"Pick Element\" next to the CSS Selector field. This opens a dialog with a bookmarklet you can drag to your bookmarks bar, or a script you can paste into your browser console. When activated on your target app, hovering over elements highlights them in green — clicking captures the CSS selector automatically.",
      },
      {
        title: "Validate Selectors",
        content:
          "Click \"Validate Selectors\" in the editor header to check if all your CSS selectors actually exist on the target page. Each step will show a green checkmark (found) or yellow warning (not found).",
      },
      {
        title: "Preview Your Tour",
        content:
          "The right panel shows a live preview of how each tooltip will look. Switch between steps to see placement and content in real time.",
      },
    ],
  },
  {
    id: "checklists",
    title: "Checklists",
    icon: ClipboardList,
    steps: [
      {
        title: "Create a Checklist",
        content:
          "Go to the Checklists tab in your app and click \"New Checklist\". Give it a name, then open the Checklist Editor to add items. Each item links to one of your existing business processes.",
      },
      {
        title: "Link Processes to Checklist Items",
        content:
          "In the Checklist Editor, add items and assign each one to a business process. Users will see these as a step-by-step onboarding or task completion flow in your app.",
      },
    ],
  },
  {
    id: "extensions",
    title: "Extensions (Launchers)",
    icon: Zap,
    steps: [
      {
        title: "Create a Launcher",
        content:
          "Go to the Extensions tab. Click \"New Launcher\" and choose a type: Beacon (pulsing dot), Hotspot (static indicator), or Button (labeled trigger). Assign it a CSS selector where it should appear.",
      },
      {
        title: "Configure Launcher Behavior",
        content:
          "Select a launcher to configure its color, label, pulse animation, and which tour it should trigger. Toggle \"Active\" to enable or disable it without deleting.",
      },
    ],
  },
  {
    id: "deployment",
    title: "Deploying to Your App",
    icon: Download,
    steps: [
      {
        title: "Embed Script",
        content:
          "From any business process, click \"Embed\" to get a JavaScript snippet. Paste this into your app's HTML to enable the guided tour for all your users. The script handles rendering, navigation, and event tracking automatically.",
      },
      {
        title: "Chrome Extension",
        content:
          "Click \"Chrome Extension\" in the app header to download a ready-made extension ZIP. Unzip it, load it as an unpacked extension in Chrome (chrome://extensions → Developer mode → Load unpacked), and it will activate on your app's URL.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Tracking",
    icon: BarChart3,
    steps: [
      {
        title: "View the Analytics Dashboard",
        content:
          "Click \"Analytics\" in the app header to see engagement metrics. The dashboard shows total tour starts, completions, abandonment rates, and a 30-day activity chart.",
      },
      {
        title: "Step-Level Funnel",
        content:
          "Each process shows a per-step funnel so you can identify exactly where users drop off. Use this to improve confusing steps or simplify complex workflows.",
      },
      {
        title: "How Tracking Works",
        content:
          "When you deploy a tour via the embed script, it automatically tracks tour_started, step_viewed, tour_completed, and tour_abandoned events. Each visitor gets an anonymous session ID — no personal data is collected.",
      },
    ],
  },
];

const faqs = [
  {
    q: "What file formats can I upload for manual extraction?",
    a: "WalkThru supports PDF, DOCX, TXT, and Markdown (.md) files up to 10MB.",
  },
  {
    q: "Do I need an account to use WalkThru?",
    a: "Yes — you need to sign up and verify your email to access the dashboard. All registered users have equal access to create and manage apps and tours.",
  },
  {
    q: "How do CSS selectors work?",
    a: "A CSS selector targets a specific element on your web page (e.g. #submit-btn, .nav-item:nth-of-type(2)). WalkThru uses these to attach tooltips to the right elements. Use the Element Picker to capture selectors visually.",
  },
  {
    q: "Can I use WalkThru on any website?",
    a: "Yes — as long as you can add a script tag or install the Chrome extension, WalkThru works on any web application.",
  },
  {
    q: "What happens if a selector breaks?",
    a: "Use the \"Validate Selectors\" feature in the Tour Editor to check all selectors at once. Broken selectors are flagged with a warning icon so you can fix them.",
  },
];

const UserGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">User Guide</h1>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold mb-3">Welcome to WalkThru</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            WalkThru helps you create interactive guided tours for any web application. This guide covers everything from creating your first app to deploying tours and tracking engagement.
          </p>
        </div>

        {/* Quick Navigation */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="text-base">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <s.icon className="h-4 w-4 text-primary shrink-0" />
                  {s.title}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <Card key={section.id} id={section.id} className="scroll-mt-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        {i + 1}
                      </span>
                      {i < section.steps.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <Card className="mt-10" id="faq">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-10 text-center pb-8">
          <p className="text-muted-foreground mb-4">Ready to get started?</p>
          <Button asChild size="lg">
            <Link to="/">
              <Plus className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default UserGuide;
