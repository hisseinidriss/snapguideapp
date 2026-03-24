import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const WalkThruReport = () => {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav bar - hidden in print */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Link>
        </Button>
        <Button size="sm" onClick={handlePrint}>
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Report content */}
      <article className="max-w-4xl mx-auto px-6 py-10 prose prose-slate dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
        
        {/* Title page */}
        <div className="text-center mb-16 pb-10 border-b border-border">
          <h1 className="text-4xl font-bold mb-4 text-foreground">WalkThru Application</h1>
          <p className="text-xl text-muted-foreground mb-2">Technical & Functional Report</p>
          <p className="text-sm text-muted-foreground">Prepared: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-lg font-semibold mt-0 mb-4 text-foreground">Table of Contents</h2>
          <ol className="space-y-1 text-sm list-decimal pl-4">
            <li><a href="#introduction" className="text-primary hover:underline">Introduction</a></li>
            <li><a href="#overview" className="text-primary hover:underline">Application Overview</a></li>
            <li><a href="#tech-stack" className="text-primary hover:underline">Technology Stack</a></li>
            <li><a href="#process-flow" className="text-primary hover:underline">How It Works – Complete Process Flow</a></li>
            <li><a href="#walkthru-engine" className="text-primary hover:underline">How WalkThru & the Browser Extension Work</a></li>
            <li><a href="#analytics" className="text-primary hover:underline">Analytics & Event Tracking</a></li>
            <li><a href="#security" className="text-primary hover:underline">Security & Authentication</a></li>
            <li><a href="#deployment" className="text-primary hover:underline">Deployment Options</a></li>
          </ol>
        </div>

        {/* 1. Introduction */}
        <section id="introduction">
          <h2 className="text-2xl font-bold border-b border-border pb-2">1. Introduction</h2>
          <p>
            <strong>WalkThru</strong> is a guided business process builder and documentation platform designed to help organizations create, manage, and deploy interactive step-by-step process guides for their web applications. Unlike traditional product tour tools that focus on UI onboarding, WalkThru is purpose-built for documenting and guiding <strong>functional business workflows</strong> — such as data entry procedures, update processes, form submissions, and multi-step operational tasks — with built-in checks and balances.
          </p>
          <p>
            The platform enables non-technical users to visually build process guides by pointing and clicking on elements within their target web applications, then deploy these guides as either embeddable JavaScript widgets or downloadable browser extensions for Chrome, Microsoft Edge, and Mozilla Firefox.
          </p>
          <p>
            WalkThru addresses a critical gap in enterprise software adoption: the need for <strong>in-context, real-time process guidance</strong> that lives directly within the application being documented, rather than in separate training materials or knowledge bases.
          </p>
        </section>

        {/* 2. Overview */}
        <section id="overview">
          <h2 className="text-2xl font-bold border-b border-border pb-2">2. Application Overview</h2>
          
          <h3 className="text-xl font-semibold">2.1 Core Capabilities</h3>
          <ul>
            <li><strong>Application Management:</strong> Users register their target web applications within WalkThru, providing the application name, URL, description, and icon. Each application serves as a container for multiple business processes.</li>
            <li><strong>Business Process Builder:</strong> A visual editor where users define step-by-step process guides. Each step includes a title, description, CSS selector (to highlight the target element), placement position (top/bottom/left/right/center), and optional video content.</li>
            <li><strong>Scribe Recording:</strong> A documentation mode for capturing Standard Operating Procedures (SOPs). Users record individual steps with action types (click, type, select, navigate, scroll, hover), instructions, notes, screenshots, and element metadata. Recordings can be exported as PDF documents.</li>
            <li><strong>Launcher Configuration:</strong> Users create trigger elements (beacons, hotspots, or buttons) that appear on the target application to initiate process guides. Launchers can be associated with specific processes and customized with colors, labels, and pulse animations.</li>
            <li><strong>Checklist System:</strong> Users can group multiple business processes into checklists, allowing end-users to track completion of sequential or required workflows.</li>
            <li><strong>Analytics Dashboard:</strong> Real-time tracking of process engagement including start rates, completion rates, abandonment rates, step-level drop-off analysis, and daily trends with visual charts.</li>
            <li><strong>Multi-Browser Extension Generator:</strong> Automated generation of browser extensions for Chrome (Manifest V3), Microsoft Edge (Manifest V3), and Mozilla Firefox (Manifest V2) that inject process guides directly into target applications.</li>
            <li><strong>Embed Script Generator:</strong> A self-contained JavaScript snippet that can be pasted into any web page to display process guides without requiring a browser extension.</li>
          </ul>

          <h3 className="text-xl font-semibold">2.2 Key User Flows</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">User Action</th>
                <th className="text-left">Page/Feature</th>
                <th className="text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Register an App</td><td>Dashboard</td><td>Create a new application entry with name, URL, and icon</td></tr>
              <tr><td>Create a Process</td><td>App Detail</td><td>Add a new business process guide under an application</td></tr>
              <tr><td>Edit Process Steps</td><td>Tour Editor</td><td>Add/edit/reorder steps with live preview and element picker</td></tr>
              <tr><td>Record an SOP</td><td>Scribe Recording</td><td>Document step-by-step procedures with screenshots</td></tr>
              <tr><td>Configure Launchers</td><td>Launchers Page</td><td>Set up beacons, hotspots, or buttons to trigger guides</td></tr>
              <tr><td>Build Checklists</td><td>Checklist Editor</td><td>Group processes into trackable completion lists</td></tr>
              <tr><td>Download Extension</td><td>App Detail</td><td>Generate and download a browser extension package</td></tr>
              <tr><td>Get Embed Code</td><td>Embed Code Page</td><td>Copy a self-contained JavaScript snippet</td></tr>
              <tr><td>View Analytics</td><td>Analytics Dashboard</td><td>Monitor process engagement and completion metrics</td></tr>
            </tbody>
          </table>
        </section>

        {/* 3. Technology Stack */}
        <section id="tech-stack">
          <h2 className="text-2xl font-bold border-b border-border pb-2">3. Technology Stack</h2>

          <h3 className="text-xl font-semibold">3.1 Frontend Framework</h3>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Technology</th><th className="text-left">Version</th><th className="text-left">Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>React</strong></td><td>18.3.x</td><td>Core UI library for building the single-page application (SPA). Used for component-based architecture, state management via hooks (useState, useEffect, useCallback), and context-based dependency injection.</td></tr>
              <tr><td><strong>TypeScript</strong></td><td>5.8.x</td><td>Statically-typed superset of JavaScript providing compile-time type checking, interface definitions, and enhanced IDE support. All components, types, and utilities are fully typed.</td></tr>
              <tr><td><strong>Vite</strong></td><td>5.4.x</td><td>Next-generation build tool with near-instant Hot Module Replacement (HMR), ES module-based dev server, and optimized production builds using Rollup under the hood.</td></tr>
              <tr><td><strong>React Router DOM</strong></td><td>6.30.x</td><td>Client-side routing with nested routes, URL parameters, and protected route wrappers for authenticated access control.</td></tr>
            </tbody>
          </table>

          <h3 className="text-xl font-semibold">3.2 UI & Styling</h3>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Technology</th><th className="text-left">Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Tailwind CSS 3.4.x</strong></td><td>Utility-first CSS framework with semantic design tokens defined in index.css using CSS custom properties (HSL color system). Enables rapid, consistent styling without custom CSS classes.</td></tr>
              <tr><td><strong>shadcn/ui</strong></td><td>Headless component library built on Radix UI primitives. Provides accessible, customizable components (Dialog, Select, Tabs, Toast, etc.) with consistent design system integration via class-variance-authority (CVA).</td></tr>
              <tr><td><strong>Radix UI</strong></td><td>Low-level, accessible UI primitives powering shadcn components. Includes Dialog, Popover, Select, Accordion, Tabs, Tooltip, DropdownMenu, and 20+ additional primitives with full WAI-ARIA compliance.</td></tr>
              <tr><td><strong>Lucide React</strong></td><td>Open-source icon library providing 1000+ SVG icons as React components with consistent sizing and stroke styling.</td></tr>
              <tr><td><strong>Recharts 2.15.x</strong></td><td>Declarative charting library built on D3 for rendering analytics visualizations (line charts, bar charts) in the Analytics Dashboard.</td></tr>
              <tr><td><strong>Framer Motion / tailwindcss-animate</strong></td><td>CSS animation utilities for entrance/exit transitions, fade-ins, and micro-interactions throughout the UI.</td></tr>
            </tbody>
          </table>

          <h3 className="text-xl font-semibold">3.3 Backend & Data Layer (Azure Cloud)</h3>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Technology</th><th className="text-left">Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Lovable Cloud Database (PostgreSQL)</strong></td><td>Relational database storing all application data. Tables include: <code>apps</code>, <code>tours</code> (processes), <code>tour_steps</code>, <code>launchers</code>, <code>checklists</code>, <code>checklist_items</code>, <code>process_recordings</code>, <code>process_recording_steps</code>, <code>tour_events</code>. All tables enforce Row-Level Security (RLS) policies for data isolation.</td></tr>
              <tr><td><strong>Lovable Cloud Auth</strong></td><td>Email/password authentication with session management, password reset flows, and JWT-based authorization. Sessions persist via the Supabase client SDK.</td></tr>
              <tr><td><strong>Lovable Cloud Edge Functions (Deno)</strong></td><td>Serverless TypeScript functions running on Deno for backend logic including: event tracking (<code>track-events</code>), screenshot URL generation (<code>screenshot-url</code>), tour step generation via AI (<code>generate-tour-steps</code>), selector validation (<code>validate-selectors</code>), recording step processing (<code>save-recording-step</code>), and manual-to-tour conversion (<code>generate-tour-from-manual</code>).</td></tr>
              <tr><td><strong>Lovable Cloud Storage</strong></td><td>Object storage for user-uploaded files including application icons and SOP screenshots.</td></tr>
              <tr><td><strong>Supabase JS Client 2.98.x</strong></td><td>JavaScript SDK providing typed database queries, authentication hooks, real-time subscriptions, and storage operations from the frontend.</td></tr>
            </tbody>
          </table>

          <h3 className="text-xl font-semibold">3.4 State Management & Data Fetching</h3>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Technology</th><th className="text-left">Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>TanStack React Query 5.83.x</strong></td><td>Server-state management library for caching, background refetching, and optimistic updates of database queries. Wraps all Supabase queries with automatic cache invalidation.</td></tr>
              <tr><td><strong>React Context API</strong></td><td>Used for global authentication state (<code>AuthContext</code>) providing session, user, and signOut across all components without prop drilling.</td></tr>
              <tr><td><strong>React Hook Form 7.61.x + Zod 3.25.x</strong></td><td>Form state management with schema-based validation using Zod for type-safe input validation and error handling.</td></tr>
            </tbody>
          </table>

          <h3 className="text-xl font-semibold">3.5 Utilities & Libraries</h3>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Library</th><th className="text-left">Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>JSZip 3.10.x</strong></td><td>Client-side ZIP file generation for packaging browser extensions (manifest, scripts, icons, data) into downloadable archives.</td></tr>
              <tr><td><strong>FileSaver.js 2.0.x</strong></td><td>Triggers browser download dialogs for generated ZIP files and exported documents.</td></tr>
              <tr><td><strong>jsPDF 4.2.x</strong></td><td>Client-side PDF generation for exporting Scribe recordings as formatted Standard Operating Procedure documents with headers, step numbering, notes, and embedded screenshots.</td></tr>
              <tr><td><strong>Mammoth 1.12.x</strong></td><td>Converts uploaded Word documents (.docx) into HTML for manual-to-process conversion workflows.</td></tr>
              <tr><td><strong>@dnd-kit/core + @dnd-kit/sortable</strong></td><td>Accessible drag-and-drop toolkit for reordering process steps, checklist items, and tour sequences via pointer and keyboard interactions.</td></tr>
              <tr><td><strong>date-fns 3.6.x</strong></td><td>Lightweight date utility library for formatting timestamps in analytics and activity feeds.</td></tr>
              <tr><td><strong>Sonner 1.7.x</strong></td><td>Toast notification system for success/error/info messages with stacking, auto-dismiss, and action buttons.</td></tr>
            </tbody>
          </table>

          <h3 className="text-xl font-semibold">3.6 Testing & Quality</h3>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Tool</th><th className="text-left">Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Vitest 3.2.x</strong></td><td>Unit and integration test runner compatible with Vite's build pipeline. Runs in jsdom environment for DOM testing.</td></tr>
              <tr><td><strong>@testing-library/react 16.x</strong></td><td>React component testing utilities emphasizing user-centric interactions over implementation details.</td></tr>
              <tr><td><strong>ESLint 9.x + TypeScript-ESLint</strong></td><td>Static analysis for code quality, unused variables, React hook rules, and TypeScript-specific best practices.</td></tr>
            </tbody>
          </table>
        </section>

        {/* 4. Process Flow */}
        <section id="process-flow">
          <h2 className="text-2xl font-bold border-b border-border pb-2">4. How It Works – Complete Process Flow</h2>

          <h3 className="text-xl font-semibold">4.1 User Authentication</h3>
          <ol>
            <li>User navigates to <code>/auth</code> and registers with email/password or logs in with existing credentials.</li>
            <li>The <code>AuthContext</code> provider listens for authentication state changes via <code>supabase.auth.onAuthStateChange()</code>.</li>
            <li>Upon successful authentication, a JWT session is established and stored in the browser. The user is redirected to the Dashboard.</li>
            <li>All subsequent API requests include the JWT token automatically via the Supabase client SDK.</li>
            <li>The <code>ProtectedRoute</code> component wraps all authenticated pages, redirecting unauthenticated users to <code>/auth</code>.</li>
          </ol>

          <h3 className="text-xl font-semibold">4.2 Application Registration</h3>
          <ol>
            <li>From the Dashboard (<code>/</code>), the user clicks "New Application" to open a creation dialog.</li>
            <li>The user enters the application name, URL, description, and optionally uploads an icon image.</li>
            <li>If an icon is uploaded, it is stored in Lovable Cloud Storage and its public URL is saved with the app record.</li>
            <li>A new row is inserted into the <code>apps</code> table with the user's data and auto-generated UUID.</li>
            <li>The dashboard refreshes to display the new application card with its icon, name, and description.</li>
          </ol>

          <h3 className="text-xl font-semibold">4.3 Process Creation & Step Editing</h3>
          <ol>
            <li>The user navigates to an application's detail page (<code>/app/:appId</code>) and clicks "New Process."</li>
            <li>A new <code>tours</code> record is created with a default name and the application's ID.</li>
            <li>The user enters the Tour Editor (<code>/app/:appId/tour/:tourId</code>) which features a split-panel layout:
              <ul>
                <li><strong>Left Panel:</strong> Step list with drag-and-drop reordering, step selection, and validation indicators.</li>
                <li><strong>Right Panel:</strong> Live preview iframe showing the target application with element highlighting.</li>
              </ul>
            </li>
            <li>For each step, the user configures:
              <ul>
                <li><strong>Title:</strong> The step heading displayed in the tooltip.</li>
                <li><strong>Content:</strong> Descriptive text explaining what the user should do.</li>
                <li><strong>CSS Selector:</strong> A DOM selector pointing to the target element (entered manually or via the Element Picker).</li>
                <li><strong>Placement:</strong> Tooltip position relative to the target element (top, bottom, left, right, or center).</li>
                <li><strong>Target URL:</strong> Optional URL for navigation-based steps (multi-page processes).</li>
                <li><strong>Click Selector:</strong> Optional selector for an element that should be auto-clicked during the step.</li>
                <li><strong>Step Type:</strong> Standard (text tooltip) or Video (embedded video player).</li>
                <li><strong>Video URL:</strong> YouTube, OneDrive, or SharePoint embed URL for video steps.</li>
              </ul>
            </li>
            <li>The <strong>Element Picker</strong> dialog allows users to visually select elements from the target application by entering a URL and clicking on page elements. The picker generates CSS selectors automatically.</li>
            <li>Steps are persisted to the <code>tour_steps</code> table with sort_order for sequencing.</li>
            <li>A <strong>Selector Validation</strong> feature checks whether CSS selectors are valid and resolvable on the target page via a backend Edge Function.</li>
          </ol>

          <h3 className="text-xl font-semibold">4.4 Scribe Recording (SOP Documentation)</h3>
          <ol>
            <li>From the App Detail page, the user creates a new recording under the "Recordings" tab.</li>
            <li>The Scribe Recording page (<code>/app/:appId/recording/:recordingId</code>) provides a manual step-by-step documentation interface.</li>
            <li>For each step, the user specifies:
              <ul>
                <li><strong>Action Type:</strong> Click, Type, Select, Navigate, Scroll, or Hover.</li>
                <li><strong>Instruction:</strong> Human-readable description of the action (auto-generated via AI or manually entered).</li>
                <li><strong>Notes:</strong> Additional context or warnings.</li>
                <li><strong>Screenshot:</strong> Uploaded image showing the UI state at that step.</li>
                <li><strong>Element Metadata:</strong> CSS selector, element tag, element text, and input value.</li>
              </ul>
            </li>
            <li>Steps are stored in the <code>process_recording_steps</code> table.</li>
            <li>The recording can be exported as a <strong>PDF document</strong> using jsPDF, generating a branded SOP with step numbers, instructions, notes, and embedded screenshots.</li>
            <li>Recordings can also be <strong>converted to interactive process guides</strong> (tours) via an AI-powered Edge Function that transforms documented steps into guided tooltip sequences.</li>
          </ol>

          <h3 className="text-xl font-semibold">4.5 Launcher Configuration</h3>
          <ol>
            <li>From the App Detail page, the user navigates to the Launchers section.</li>
            <li>Launchers are UI triggers that appear on the target application to initiate process guides. Three types are available:
              <ul>
                <li><strong>Beacon:</strong> A small pulsing dot (16×16px circle) that draws attention to a specific element.</li>
                <li><strong>Hotspot:</strong> A static indicator placed on an element to signal available guidance.</li>
                <li><strong>Button:</strong> A labeled, styled button (e.g., "Help") that users click to start a process.</li>
              </ul>
            </li>
            <li>Each launcher is configured with a CSS selector (where it appears), color, label text, pulse animation toggle, and an optional linked process.</li>
            <li>Launchers are stored in the <code>launchers</code> table and included in both embed scripts and browser extensions.</li>
          </ol>

          <h3 className="text-xl font-semibold">4.6 Deployment</h3>
          <p>WalkThru offers two deployment methods:</p>
          
          <h4 className="text-lg font-semibold">Option A: Embed Script</h4>
          <ol>
            <li>The user navigates to the Embed Code page (<code>/app/:appId/tour/:tourId/embed</code>).</li>
            <li>A self-contained <code>&lt;script&gt;</code> tag is generated containing all process steps, launchers, and tracking configuration as inline JSON.</li>
            <li>The script creates an overlay, tooltip engine, and positioning logic — all in vanilla JavaScript with zero dependencies.</li>
            <li>The user copies the script and pastes it into their target application's HTML.</li>
          </ol>

          <h4 className="text-lg font-semibold">Option B: Browser Extension</h4>
          <ol>
            <li>The user clicks "Download Extension" from the App Detail page and selects the target browser (Chrome, Edge, or Firefox).</li>
            <li>The extension generator fetches all processes, steps, and launchers from the database.</li>
            <li>A ZIP archive is generated client-side containing: <code>manifest.json</code>, <code>content.js</code>, <code>content.css</code>, <code>popup.html</code>, <code>popup.js</code>, <code>data.json</code>, and icon files.</li>
            <li>The user installs the extension in their browser (Chrome: <code>chrome://extensions</code> → Developer Mode → Load Unpacked; Edge: <code>edge://extensions</code>; Firefox: <code>about:debugging</code> → Load Temporary Add-on).</li>
          </ol>
        </section>

        {/* 5. WalkThru & Extension Technical Deep Dive */}
        <section id="walkthru-engine">
          <h2 className="text-2xl font-bold border-b border-border pb-2">5. How WalkThru & the Browser Extension Work</h2>

          <h3 className="text-xl font-semibold">5.1 Non-Technical Explanation</h3>
          <p>
            Think of WalkThru as a GPS for web applications. Just as a GPS overlays turn-by-turn directions on top of a map, WalkThru overlays step-by-step instructions on top of a live web application. The user sees their normal application with highlighted elements and tooltip bubbles explaining exactly what to do at each step.
          </p>
          <p>
            The <strong>browser extension</strong> acts like a transparent layer placed on top of the target application. When the user opens the target website and activates a process guide, the extension:
          </p>
          <ol>
            <li>Dims the background with a semi-transparent overlay (like putting the rest of the screen behind tinted glass).</li>
            <li>Highlights the specific element the user needs to interact with (e.g., a text field, button, or dropdown).</li>
            <li>Shows a tooltip next to the highlighted element with the step title, instructions, and navigation buttons (Back / Next / Done).</li>
            <li>When the user clicks "Next," it moves to the next step — potentially on a different page of the application.</li>
            <li>Tracks progress so the user can see which processes they've completed.</li>
          </ol>
          <p>
            The extension popup (the small window that appears when clicking the extension icon) shows a list of all available processes, search functionality, and completion status with checkmarks.
          </p>

          <h3 className="text-xl font-semibold">5.2 Technical Architecture – Browser Extension</h3>
          
          <h4 className="text-lg font-semibold">5.2.1 File Structure</h4>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto"><code>{`extension.zip/
├── manifest.json      # Extension metadata & permissions
├── content.js         # Injected script (tooltip engine)
├── content.css        # Injected styles (overlay, tooltips)
├── popup.html         # Extension popup UI
├── popup.js           # Popup interaction logic
├── data.json          # Process definitions & configuration
├── icon16.png         # 16×16 toolbar icon
├── icon48.png         # 48×48 extension page icon
└── icon128.png        # 128×128 web store icon`}</code></pre>

          <h4 className="text-lg font-semibold">5.2.2 Manifest Configuration</h4>
          <p>The extension uses <strong>Manifest V3</strong> for Chrome and Edge, and <strong>Manifest V2</strong> for Firefox compatibility:</p>
          <ul>
            <li><strong>Permissions:</strong> <code>activeTab</code> (access current tab DOM), <code>storage</code> (persist completion state), <code>tabs</code> (URL detection), <code>scripting</code> (programmatic injection for Manifest V3).</li>
            <li><strong>Content Scripts:</strong> Automatically injected into pages matching the target application's URL pattern (e.g., <code>https://careers.isdb.org/*</code>).</li>
            <li><strong>Content Security Policy:</strong> Allows embedding YouTube, OneDrive, and SharePoint iframes for video steps.</li>
            <li><strong>Web Accessible Resources:</strong> Exposes <code>data.json</code> to the content script context for reading process definitions.</li>
          </ul>

          <h4 className="text-lg font-semibold">5.2.3 Content Script Engine (<code>content.js</code>)</h4>
          <p>The content script is the core runtime that drives the guided experience. It performs the following:</p>

          <p><strong>Initialization:</strong></p>
          <ol>
            <li>On page load, the content script fetches <code>data.json</code> via <code>chrome.runtime.getURL()</code> to load process definitions.</li>
            <li>It checks <code>chrome.storage.local</code> for any in-progress process (auto-resume after page navigation).</li>
            <li>It registers a message listener for commands from the popup (start, stop, navigate).</li>
          </ol>

          <p><strong>Element Resolution:</strong></p>
          <p>When a step specifies a CSS selector, the engine uses a multi-tier resolution strategy:</p>
          <ol>
            <li><strong>Direct Match:</strong> <code>document.querySelector(selector)</code> — the fastest path when the selector matches exactly.</li>
            <li><strong>Container + Leaf Split:</strong> If the full selector fails, it splits it into a parent container and leaf selector (e.g., <code>#search-wrapper</code> + <code>input:nth-of-type(2)</code>) and attempts each independently.</li>
            <li><strong>Loose ID Matching:</strong> For ID-based selectors, it normalizes the ID string and searches for elements with partially matching IDs, accommodating dynamic ID prefixes/suffixes.</li>
            <li><strong>Semantic Fallback:</strong> Extracts keywords from the step title/content (e.g., "social", "footer") and searches for DOM elements with matching IDs, classes, or text content.</li>
            <li><strong>Attribute-Based Fallback:</strong> Searches for elements by tag name combined with attributes like <code>name</code>, <code>placeholder</code>, <code>aria-label</code>, or <code>type</code>.</li>
            <li><strong>Candidate Scoring:</strong> When multiple candidates are found, each is scored based on visibility, viewport position, semantic relevance, and selector specificity. The highest-scoring candidate is selected.</li>
          </ol>

          <p><strong>Tooltip Rendering:</strong></p>
          <ol>
            <li>A semi-transparent overlay (<code>rgba(0,0,0,0.5)</code>) is created covering the entire viewport at <code>z-index: 99998</code>.</li>
            <li>The target element is highlighted with a glowing border and elevated z-index (<code>99999</code>) to "cut through" the overlay.</li>
            <li>A tooltip div is positioned adjacent to the target element using a placement algorithm:
              <ul>
                <li>Attempts the preferred placement (top/bottom/left/right) first.</li>
                <li>Falls back to alternative placements if the tooltip would overflow the viewport.</li>
                <li>Applies boundary clamping to ensure the tooltip is always visible with minimum 8px margin.</li>
              </ul>
            </li>
            <li>The tooltip includes: step title, description, step counter ("2 of 8"), Back button, and Next/Done button.</li>
            <li>For <strong>video steps</strong>, an iframe is embedded with YouTube/OneDrive URL transformation, fullscreen support, and a "Skip Video" button.</li>
          </ol>

          <p><strong>Navigation Handling (Multi-Page Processes):</strong></p>
          <ol>
            <li>When a step includes a <code>target_url</code>, the extension detects that navigation is required.</li>
            <li>Before navigating, the current process state (process ID, step index) is persisted to <code>chrome.storage.local</code>.</li>
            <li>The page navigates to the target URL.</li>
            <li>On the new page, the content script's initialization routine detects the persisted state and automatically resumes the process at the correct step.</li>
            <li>URL comparison uses path normalization (stripping trailing slashes, query parameters) for reliable matching.</li>
          </ol>

          <p><strong>Event Tracking:</strong></p>
          <ol>
            <li>Each significant action (process started, step viewed, process completed, process abandoned, video started/skipped) generates a tracking event.</li>
            <li>Events are batched in a queue and flushed every 1000ms to minimize network requests.</li>
            <li>Events are sent via <code>fetch()</code> POST to the Lovable Cloud Edge Function (<code>track-events</code>) with the anon API key for authentication.</li>
            <li>On page unload, remaining events are flushed synchronously via <code>beforeunload</code> event listener.</li>
          </ol>

          <h4 className="text-lg font-semibold">5.2.4 Popup Interface (<code>popup.html</code> + <code>popup.js</code>)</h4>
          <ul>
            <li>Displays a branded header with the application name and WalkThru logo.</li>
            <li>Lists all available processes with step counts and completion indicators (✓ checkmarks).</li>
            <li>Provides a search bar to filter processes by name.</li>
            <li>When a process is selected, it sends a message to the content script via <code>chrome.tabs.sendMessage()</code> to initiate the guided experience.</li>
            <li>Completion state is tracked per-process in <code>chrome.storage.local</code> and persists across browser sessions.</li>
            <li>Controls include: Restart (reset all completion), Back (return to list), and Finish (mark current process complete).</li>
          </ul>

          <h4 className="text-lg font-semibold">5.2.5 Communication Architecture</h4>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto"><code>{`┌─────────────┐    chrome.tabs.sendMessage()    ┌───────────────┐
│  Popup.js   │ ──────────────────────────────► │  Content.js   │
│  (popup UI) │                                 │ (page context) │
│             │ ◄────────────────────────────── │               │
└─────────────┘    chrome.runtime.sendMessage() └───────┬───────┘
                                                        │
                   chrome.storage.local                 │  fetch()
                   (completion state,                   │
                    auto-resume state)                  ▼
                                                ┌───────────────┐
                                                │ Edge Function  │
                                                │ (track-events) │
                                                └───────────────┘`}</code></pre>

          <h3 className="text-xl font-semibold">5.3 Technical Architecture – Embed Script</h3>
          <p>
            The embed script is a self-contained IIFE (Immediately Invoked Function Expression) that runs in the host page's context. It includes:
          </p>
          <ul>
            <li>All process steps and launcher definitions as inline JSON (no external data fetching required).</li>
            <li>A complete tooltip engine with overlay management, positioning, and step navigation.</li>
            <li>Video embedding support with YouTube and OneDrive URL transformation.</li>
            <li>Launcher creation logic that attaches beacons, hotspots, or buttons to specified DOM elements.</li>
            <li>Event tracking with the same batched queue approach as the extension.</li>
            <li>Auto-start behavior when no launchers are configured.</li>
          </ul>
          <p>
            The embed script is approximately 2-4KB minified and has <strong>zero external dependencies</strong>. It uses only vanilla JavaScript and inline styles, making it compatible with any web application regardless of its technology stack.
          </p>
        </section>

        {/* 6. Analytics */}
        <section id="analytics">
          <h2 className="text-2xl font-bold border-b border-border pb-2">6. Analytics & Event Tracking</h2>
          <p>WalkThru captures the following events for each process guide interaction:</p>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Event Type</th><th className="text-left">Trigger</th><th className="text-left">Data Captured</th></tr>
            </thead>
            <tbody>
              <tr><td><code>tour_started</code></td><td>User initiates a process guide</td><td>Process ID, App ID, Session ID</td></tr>
              <tr><td><code>step_viewed</code></td><td>Each step is displayed</td><td>Process ID, Step Index, Session ID</td></tr>
              <tr><td><code>tour_completed</code></td><td>User reaches the final step and clicks Done</td><td>Process ID, Session ID</td></tr>
              <tr><td><code>tour_abandoned</code></td><td>User clicks the overlay to dismiss</td><td>Process ID, Last Step Index, Session ID</td></tr>
              <tr><td><code>video_started</code></td><td>Video step is displayed</td><td>Process ID, Step Index, Session ID</td></tr>
              <tr><td><code>video_skipped</code></td><td>User clicks "Skip Video"</td><td>Process ID, Step Index, Session ID</td></tr>
            </tbody>
          </table>
          <p>
            Events are stored in the <code>tour_events</code> table with timestamps and processed on the Analytics Dashboard into metrics including: total starts, completion rates, abandonment rates, step-level drop-off analysis, unique sessions, and daily trend charts.
          </p>
        </section>

        {/* 7. Security */}
        <section id="security">
          <h2 className="text-2xl font-bold border-b border-border pb-2">7. Security & Authentication</h2>
          <ul>
            <li><strong>Authentication:</strong> Email/password authentication via Lovable Cloud Auth with JWT session tokens. No anonymous sign-ups permitted.</li>
            <li><strong>Row-Level Security (RLS):</strong> All database tables enforce RLS policies ensuring users can only access their own data. Policies are evaluated server-side by the PostgreSQL engine.</li>
            <li><strong>Edge Function Authorization:</strong> Backend functions use the service role key (never exposed to clients) for database operations. Client requests are validated against the anon key.</li>
            <li><strong>Content Security Policy:</strong> Browser extensions restrict script execution to <code>'self'</code> and iframe sources to whitelisted video platforms only.</li>
            <li><strong>Protected Routes:</strong> All application routes (except <code>/auth</code> and <code>/reset-password</code>) are wrapped in <code>ProtectedRoute</code> components that verify active sessions before rendering.</li>
            <li><strong>No Client-Side Role Checks:</strong> Authorization is enforced entirely through server-side RLS policies, preventing client-side privilege escalation.</li>
          </ul>
        </section>

        {/* 8. Deployment */}
        <section id="deployment">
          <h2 className="text-2xl font-bold border-b border-border pb-2">8. Deployment Options</h2>
          <table className="w-full">
            <thead>
              <tr><th className="text-left">Method</th><th className="text-left">Best For</th><th className="text-left">Requires</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Embed Script</strong></td><td>Single-page apps, quick integration, testing</td><td>Access to target app's HTML (paste a <code>&lt;script&gt;</code> tag)</td></tr>
              <tr><td><strong>Chrome Extension</strong></td><td>Enterprise deployment, Chrome/Chromium users</td><td>Developer Mode or Chrome Web Store publishing</td></tr>
              <tr><td><strong>Edge Extension</strong></td><td>Microsoft ecosystem, enterprise environments</td><td>Developer Mode or Edge Add-ons publishing</td></tr>
              <tr><td><strong>Firefox Extension</strong></td><td>Firefox users, cross-browser coverage</td><td>Temporary loading via about:debugging or AMO publishing</td></tr>
            </tbody>
          </table>
          <p>
            All deployment methods use the same underlying process definitions and deliver identical user experiences. The choice depends on the organization's browser environment and deployment capabilities.
          </p>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>WalkThru Application Report — Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="mt-1">Confidential — For Internal Use Only</p>
        </div>
      </article>
    </div>
  );
};

export default WalkThruReport;
