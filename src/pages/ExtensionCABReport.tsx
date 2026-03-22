import { ArrowLeft, Download, Shield, Database, Globe, Cpu, FileCode, Lock, CheckCircle, AlertTriangle, Server, MonitorSmartphone, Puzzle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ExtensionCABReport = () => {
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

      <article className="max-w-4xl mx-auto px-6 py-10 prose prose-slate dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">

        {/* Title */}
        <div className="text-center mb-16 pb-10 border-b border-border">
          <h1 className="text-4xl font-bold mb-4 text-foreground">WalkThru Browser Extension</h1>
          <p className="text-xl text-muted-foreground mb-2">Change Advisory Board (CAB) Technical Review</p>
          <p className="text-sm text-muted-foreground">Prepared: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <Shield className="h-3 w-3" /> No Backend Connection
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
              <Lock className="h-3 w-3" /> Read-Only
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
              <Globe className="h-3 w-3" /> Fully Offline
            </span>
          </div>
        </div>

        {/* TOC */}
        <div className="mb-12 p-6 bg-muted/50 rounded-lg not-prose">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Table of Contents</h2>
          <ol className="space-y-1 text-sm list-decimal pl-4 text-muted-foreground">
            <li><a href="#exec-summary" className="text-primary hover:underline">Executive Summary (Non-Technical)</a></li>
            <li><a href="#what-it-does" className="text-primary hover:underline">What the Extension Does</a></li>
            <li><a href="#what-it-doesnt" className="text-primary hover:underline">What the Extension Does NOT Do</a></li>
            <li><a href="#how-it-works" className="text-primary hover:underline">How It Works — Technical Deep Dive</a></li>
            <li><a href="#database" className="text-primary hover:underline">Database Relationship</a></li>
            <li><a href="#security" className="text-primary hover:underline">Security Assessment</a></li>
            <li><a href="#standalone" className="text-primary hover:underline">Standalone Operation</a></li>
            <li><a href="#permissions" className="text-primary hover:underline">Browser Permissions Explained</a></li>
            <li><a href="#file-inventory" className="text-primary hover:underline">File Inventory & Code Review</a></li>
            <li><a href="#risk-assessment" className="text-primary hover:underline">Risk Assessment</a></li>
            <li><a href="#faq" className="text-primary hover:underline">Frequently Asked Questions</a></li>
          </ol>
        </div>

        {/* 1. Executive Summary */}
        <section id="exec-summary">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-primary" /> 1. Executive Summary
          </h2>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 my-4 not-prose">
            <p className="text-sm text-foreground font-medium mb-3">For non-technical reviewers:</p>
            <p className="text-sm text-muted-foreground mb-3">
              The WalkThru browser extension is like a <strong className="text-foreground">digital instructor that sits inside your web application</strong>. 
              When an employee opens an application (e.g., the Employee Self-Service portal), the extension highlights exactly which buttons to click, 
              which fields to fill, and in what order — guiding them through business processes step by step.
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Think of it as <strong className="text-foreground">GPS navigation for software</strong>. Just as GPS shows you turn-by-turn directions on real roads, 
              WalkThru shows you click-by-click instructions on real screens.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">100% Offline</span>
                </div>
                <p className="text-xs text-muted-foreground">Works without internet after installation. No server connection required.</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">No Data Collected</span>
                </div>
                <p className="text-xs text-muted-foreground">Does not read, store, or transmit any user data or credentials.</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">Read-Only</span>
                </div>
                <p className="text-xs text-muted-foreground">Cannot modify application data. Only adds visual overlays on the screen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. What It Does */}
        <section id="what-it-does">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" /> 2. What the Extension Does
          </h2>
          <p>
            When a user starts a business process guide, the extension performs these actions on the page:
          </p>
          <ol>
            <li><strong>Highlights elements</strong> — draws a red spotlight border around the target button, field, or link to show the user where to look.</li>
            <li><strong>Shows a tooltip</strong> — displays a small instruction card next to the highlighted element with the step title, description, and navigation buttons (Back / Next / Finish).</li>
            <li><strong>Dims the background</strong> — creates a semi-transparent dark overlay around the highlighted element so the user's focus is drawn to the right area.</li>
            <li><strong>Tracks progress</strong> — remembers which step the user is on (using browser local storage) so they can navigate between pages and continue where they left off.</li>
            <li><strong>Auto-navigates</strong> — if a step requires a different page (e.g., moving from the home page to a form), the extension navigates there automatically.</li>
          </ol>
          <p>
            All instructions are <strong>pre-loaded as static data</strong> inside the extension package — they are baked into a file called <code>data.json</code> at the time of download.
          </p>
        </section>

        {/* 3. What It Does NOT Do */}
        <section id="what-it-doesnt">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> 3. What the Extension Does NOT Do
          </h2>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-5 my-4 not-prose">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">The extension does NOT:</p>
            <ul className="space-y-2 text-sm text-red-600 dark:text-red-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Connect to any database, server, or external API at runtime</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Read, capture, or transmit user passwords, credentials, or form data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Modify any application data (it cannot submit forms, click buttons on behalf of the user, or change database records)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Access cookies, session tokens, or authentication headers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Communicate with any external server (no phone-home, no telemetry, no updates)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Access other browser tabs, bookmarks, history, or extensions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">❌</span>
                <span>Run on pages outside the configured application URL</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 4. How It Works - Technical */}
        <section id="how-it-works">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" /> 4. How It Works — Technical Deep Dive
          </h2>

          <h3>4.1 Architecture Overview</h3>
          <p>The extension follows the standard browser extension architecture with three isolated components:</p>
          
          <div className="not-prose my-6">
            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-sm text-foreground mb-2">📄 popup.html / popup.js</h4>
                  <p className="text-xs text-muted-foreground">The small panel that appears when you click the extension icon. Lists available business processes. Sends a message to the content script to start a selected process.</p>
                </div>
                <div className="bg-background rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-sm text-foreground mb-2">📜 content.js / content.css</h4>
                  <p className="text-xs text-muted-foreground">Injected into the target web page. Reads the static data.json, finds elements using CSS selectors, and renders tooltip overlays. This is the core engine.</p>
                </div>
                <div className="bg-background rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-sm text-foreground mb-2">📋 data.json</h4>
                  <p className="text-xs text-muted-foreground">Static JSON file containing all process definitions, step instructions, CSS selectors, and fallback selectors. No live data — snapshot at download time.</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground italic">All files are bundled inside the extension package (.zip) — nothing is fetched at runtime</p>
              </div>
            </div>
          </div>

          <h3>4.2 Content Script Lifecycle</h3>
          <p>When a user navigates to the configured application URL, the browser automatically injects <code>content.js</code>. Here's what happens:</p>
          <ol>
            <li><strong>Guard check</strong> — prevents duplicate injection if the script has already loaded (<code>if (window.__bpg_guard) return</code>).</li>
            <li><strong>Load data</strong> — reads <code>data.json</code> from the extension package using <code>chrome.runtime.getURL('data.json')</code>. This is a local file read, not a network request.</li>
            <li><strong>Resume check</strong> — checks <code>chrome.storage.local</code> for any in-progress tour (handles multi-page navigation).</li>
            <li><strong>Setup launchers</strong> — if configured, places beacon dots or buttons on the page as entry points.</li>
            <li><strong>Wait for user</strong> — does nothing until the user starts a process from the popup or clicks a launcher.</li>
          </ol>

          <h3>4.3 Self-Healing Element Resolution</h3>
          <p>
            The most sophisticated part of the extension is how it finds elements on the page. Web applications frequently change their HTML structure 
            (class names, IDs, nesting), which can break static CSS selectors. The extension uses a <strong>multi-strategy self-healing resolver</strong>:
          </p>

          <div className="not-prose my-6">
            <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
              {[
                { num: "1", title: "Primary Selector", desc: "Try the exact CSS selector captured during authoring (e.g., #search-wrapper input.keywordsearch-q)" },
                { num: "2", title: "Iframe Search", desc: "If not found in main document, search inside same-origin iframes" },
                { num: "3", title: "Container-Anchored Recovery", desc: "Split the selector into parent + child. Find the parent first, then search for the child within it" },
                { num: "3a", title: "Stored Fallback Selectors", desc: "Try alternative selectors captured by the Element Picker at authoring time (e.g., aria-label, name, placeholder-based)" },
                { num: "3b", title: "Metadata-Based Recovery", desc: "Use stored element metadata (aria-label, name, placeholder) to construct and try new selectors" },
                { num: "4", title: "Dynamic Fallback Generation", desc: "Generate fallback selectors by stripping positional pseudo-selectors, extracting stable classes, and relaxing attribute matches" },
                { num: "5", title: "Semantic Discovery", desc: "Use keywords from step title/content to find relevant UI regions (e.g., 'footer', 'social')" },
                { num: "6", title: "Text Matching", desc: "Search interactive elements (buttons, links, inputs) by their visible text content" },
                { num: "7", title: "Retry Loop", desc: "If not found, retry every 450ms for up to 10 seconds (handles async-loaded content)" },
                { num: "8", title: "Graceful Fallback", desc: "If all strategies fail, show the step as a centered modal instead of breaking the flow" },
              ].map((strategy) => (
                <div key={strategy.num} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{strategy.num}</span>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{strategy.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{strategy.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3>4.4 Tooltip Rendering</h3>
          <p>
            When an element is found, the extension creates DOM elements (divs) that are appended to the page's <code>&lt;body&gt;</code>. 
            These are purely visual overlays — they do not interact with or modify the application's own DOM elements. The overlay consists of:
          </p>
          <ul>
            <li><strong>4 overlay boxes</strong> — semi-transparent dark panels positioned around the target element to create a spotlight effect</li>
            <li><strong>1 spotlight ring</strong> — a red border around the target element</li>
            <li><strong>1 tooltip card</strong> — the instruction panel with title, content, and navigation buttons</li>
          </ul>
          <p>All these elements use CSS class names prefixed with <code>bpg-</code> to avoid conflicts with the host application's styles.</p>
        </section>

        {/* 5. Database Relationship */}
        <section id="database">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> 5. Database Relationship
          </h2>
          
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-5 my-4 not-prose">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Key Point:</p>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              The extension has <strong>ZERO runtime connection to any database</strong>. The relationship is strictly at build/download time only.
            </p>
          </div>

          <h3>5.1 Build-Time Data Flow</h3>
          <p>Here's how data flows from the database to the extension — this only happens once, when an administrator downloads the extension:</p>
          
          <div className="not-prose my-6">
            <div className="bg-muted/50 rounded-lg p-5 border border-border">
              <div className="flex flex-col gap-3">
                {[
                  { icon: "🗄️", label: "Database", desc: "Stores business process definitions, step instructions, CSS selectors, fallback selectors, and element metadata" },
                  { icon: "⬇️", label: "API Call", desc: "WalkThru admin panel fetches tour data via REST API (GET /api/tours, GET /api/tour-steps)" },
                  { icon: "📦", label: "ZIP Generator", desc: "Client-side JavaScript packages the data into a static data.json file inside a ZIP archive" },
                  { icon: "💾", label: "Download", desc: "Administrator downloads the .zip file to their computer" },
                  { icon: "🔌", label: "Installation", desc: "Administrator loads the extension into the browser (chrome://extensions)" },
                  { icon: "🚀", label: "Runtime", desc: "Extension reads the local data.json file — no further database contact" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg">{step.icon}</span>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{step.label}</span>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3>5.2 Data Contained in data.json</h3>
          <p>The <code>data.json</code> file contains only instructional data:</p>
          <ul>
            <li><strong>Process names</strong> — e.g., "Remote Work Request", "Digital Business Card"</li>
            <li><strong>Step instructions</strong> — title, description text, CSS selector, placement direction</li>
            <li><strong>Fallback selectors</strong> — alternative CSS selectors for self-healing</li>
            <li><strong>Element metadata</strong> — aria-label, role, placeholder, tag name (for element recovery)</li>
            <li><strong>Launcher configs</strong> — beacon/button positions and colors</li>
            <li><strong>Application name and URL</strong> — used to match the correct website</li>
          </ul>
          <p>
            It does <strong>NOT</strong> contain: user credentials, API keys, database connection strings, session tokens, 
            personal data, or any secrets.
          </p>

          <h3>5.3 Optional Analytics (Disabled by Default)</h3>
          <p>
            The extension has an <strong>optional</strong> analytics feature that can track anonymous usage events 
            (e.g., "tour started", "tour completed"). This feature is <strong>only active if explicitly configured</strong> with a tracking URL 
            during extension generation. When disabled (the default), no network requests are made at any time.
          </p>
          <p>
            Even when enabled, analytics only sends: tour ID, event type (started/completed/step_viewed), step index, 
            and an anonymous session ID. No personal information, form data, or application content is ever transmitted.
          </p>
        </section>

        {/* 6. Security Assessment */}
        <section id="security">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> 6. Security Assessment
          </h2>

          <h3>6.1 Threat Model</h3>
          <div className="not-prose my-4">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">Threat Vector</th>
                  <th className="text-left p-3 font-semibold text-foreground">Risk Level</th>
                  <th className="text-left p-3 font-semibold text-foreground">Mitigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { threat: "Data exfiltration", risk: "None", color: "emerald", mitigation: "Extension makes no outbound network requests (unless analytics explicitly enabled)" },
                  { threat: "Credential theft", risk: "None", color: "emerald", mitigation: "Extension never reads form field values, passwords, or cookies" },
                  { threat: "Code injection", risk: "None", color: "emerald", mitigation: "Extension only creates visual overlay DOM elements with hardcoded classes. No eval(), no dynamic script loading" },
                  { threat: "Cross-site access", risk: "None", color: "emerald", mitigation: "manifest.json restricts execution to the specific configured application URL only" },
                  { threat: "Supply chain", risk: "Low", color: "amber", mitigation: "Extension is generated internally from your own data. No third-party dependencies at runtime" },
                  { threat: "Data staleness", risk: "Low", color: "amber", mitigation: "Extension uses a snapshot of data at download time. Re-download to get updated processes" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="p-3 text-muted-foreground">{row.threat}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>{row.risk}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{row.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>6.2 Content Security Policy</h3>
          <p>The extension's manifest enforces a strict Content Security Policy:</p>
          <pre className="text-xs"><code>{`script-src 'self'; object-src 'self'; 
frame-src https://www.youtube.com https://youtube.com 
         https://onedrive.live.com https://*.sharepoint.com 
         https://*.1drv.ms`}</code></pre>
          <p>
            This means only scripts from the extension package itself can execute (<code>'self'</code>). 
            No external scripts can be loaded or run. The <code>frame-src</code> allows embedded YouTube and OneDrive 
            videos in video-type steps only.
          </p>

          <h3>6.3 DOM Isolation</h3>
          <p>
            The extension's CSS uses unique class prefixes (<code>bpg-</code>) and all DOM elements are created dynamically 
            by the content script. The extension does not modify existing DOM elements — it only <em>reads</em> their position 
            and dimensions to position the spotlight and tooltip. The <code>bpg-highlight</code> class (which adds a z-index) 
            is the only class applied to existing elements, and it's removed when the step changes.
          </p>
        </section>

        {/* 7. Standalone Operation */}
        <section id="standalone">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> 7. Standalone Operation
          </h2>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-5 my-4 not-prose">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Yes — the extension works 100% on its own.</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              Once downloaded and installed, the extension is completely self-contained. You could disconnect from the internet, 
              uninstall the WalkThru admin platform, and even delete the database — the extension would continue to work exactly as before.
            </p>
          </div>
          <p>This is because:</p>
          <ul>
            <li>All process data is embedded in the static <code>data.json</code> file inside the extension package</li>
            <li>All styling is in the bundled <code>content.css</code> file</li>
            <li>All logic is in the bundled <code>content.js</code> and <code>popup.js</code> files</li>
            <li>Step progress is stored in <code>chrome.storage.local</code> (browser-local, no sync)</li>
            <li>The <strong>only</strong> network activity is analytics tracking — the extension sends lightweight usage events 
              (e.g., <code>tour_started</code>, <code>step_viewed</code>, <code>tour_completed</code>, <code>tour_abandoned</code>) to the <code>/api/track-events</code> endpoint. 
              This is how the Analytics Dashboard generates extension activity reports. No user data, credentials, or page content is ever transmitted — only the event type, tour ID, step index, and a random session ID.</li>
          </ul>
          <p>
            <strong>Trade-off:</strong> Since the extension is a point-in-time snapshot, any changes made to business processes 
            in the WalkThru admin panel require re-downloading and re-installing the extension to take effect.
          </p>
        </section>

        {/* 8. Permissions */}
        <section id="permissions">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" /> 8. Browser Permissions Explained
          </h2>
          <div className="not-prose my-4">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">Permission</th>
                  <th className="text-left p-3 font-semibold text-foreground">Why It's Needed</th>
                  <th className="text-left p-3 font-semibold text-foreground">What It Allows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-mono text-xs text-foreground">activeTab</td>
                  <td className="p-3 text-muted-foreground">To interact with the current tab when the user clicks the extension icon</td>
                  <td className="p-3 text-muted-foreground">Access to the currently active tab only, only when the user explicitly activates the extension</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs text-foreground">storage</td>
                  <td className="p-3 text-muted-foreground">To remember which step the user is on during multi-page navigation</td>
                  <td className="p-3 text-muted-foreground">Local key-value storage within the extension's sandbox — not cookies or application storage</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs text-foreground">tabs</td>
                  <td className="p-3 text-muted-foreground">To detect when the user navigates to a new page (for multi-page processes)</td>
                  <td className="p-3 text-muted-foreground">Read the URL of the current tab to check if the user has reached the correct page for the next step</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs text-foreground">scripting</td>
                  <td className="p-3 text-muted-foreground">To inject the content script into the target page (Manifest V3 only)</td>
                  <td className="p-3 text-muted-foreground">Run the extension's own content.js on pages matching the configured URL pattern — not arbitrary code</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Important:</strong> The extension uses <code>content_scripts</code> with a specific URL match pattern 
            (e.g., <code>https://extranet.isdb.org/*</code>). This means the content script <strong>only runs on the configured 
            application URL</strong> — it is not injected into other websites, email, banking sites, or any other tabs.
          </p>
        </section>

        {/* 9. File Inventory */}
        <section id="file-inventory">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <FileCode className="h-6 w-6 text-primary" /> 9. File Inventory & Code Review
          </h2>
          <p>Every extension package contains exactly these files — no more, no less:</p>
          <div className="not-prose my-4">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">File</th>
                  <th className="text-left p-3 font-semibold text-foreground">Size (approx)</th>
                  <th className="text-left p-3 font-semibold text-foreground">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { file: "manifest.json", size: "~1 KB", purpose: "Extension metadata, permissions, and URL patterns" },
                  { file: "data.json", size: "2–20 KB", purpose: "Static process definitions (varies by number of processes)" },
                  { file: "content.js", size: "~25 KB", purpose: "Core engine: element finder, tooltip renderer, self-healing resolver" },
                  { file: "content.css", size: "~3 KB", purpose: "Visual styles for tooltips, overlays, and spotlights" },
                  { file: "popup.html", size: "~5 KB", purpose: "Extension popup UI: process list, search, and start buttons" },
                  { file: "popup.js", size: "~8 KB", purpose: "Popup logic: filtering, process selection, messaging" },
                  { file: "icon16/48/128.png", size: "~5 KB total", purpose: "Extension icons for the toolbar and extension management page" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="p-3 font-mono text-xs text-foreground">{row.file}</td>
                    <td className="p-3 text-muted-foreground">{row.size}</td>
                    <td className="p-3 text-muted-foreground">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>Total package size:</strong> approximately 50–70 KB. The entire extension code is generated client-side 
            in the administrator's browser — it is never sent to any server. The ZIP file is created in-memory using JSZip 
            and downloaded directly via the browser's File API.
          </p>
        </section>

        {/* 10. Risk Assessment */}
        <section id="risk-assessment">
          <h2 className="text-2xl font-bold border-b border-border pb-2 flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" /> 10. Risk Assessment
          </h2>

          <div className="not-prose my-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 mb-2">✅ Low Risk Factors</h4>
                <ul className="space-y-1.5 text-xs text-emerald-600 dark:text-emerald-300">
                  <li>• Minimal network activity (anonymous analytics events only)</li>
                  <li>• No user data collection or transmission</li>
                  <li>• No access to credentials or sensitive data</li>
                  <li>• Read-only interaction with the host page</li>
                  <li>• Scoped to a single application URL</li>
                  <li>• No third-party dependencies</li>
                  <li>• No auto-update mechanism</li>
                  <li>• Complete source code transparency (readable JS)</li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-2">⚠️ Considerations</h4>
                <ul className="space-y-1.5 text-xs text-amber-600 dark:text-amber-300">
                  <li>• Extension must be manually updated (re-downloaded) when processes change</li>
                  <li>• Content script runs in the same context as the target page (standard for all extensions)</li>
                  <li>• Requires administrator/IT to load as an unpacked extension (not published to browser stores)</li>
                  <li>• Self-healing may highlight wrong element if multiple similar elements exist (graceful degradation)</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>Overall Risk Rating</h3>
          <div className="not-prose my-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-5 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">LOW RISK</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              The extension is a self-contained, read-only, offline UI overlay with no data access, no network activity, 
              and no ability to modify application state. It is comparable in risk profile to a browser bookmark or a static PDF document.
            </p>
          </div>
        </section>

        {/* 11. FAQ */}
        <section id="faq">
          <h2 className="text-2xl font-bold border-b border-border pb-2">11. Frequently Asked Questions</h2>

          <h3>Can the extension access my SAP/Neptune data?</h3>
          <p>
            No. The extension can only <em>see</em> what's already visible on the screen (DOM elements). It cannot make API calls, 
            access backend services, read database records, or intercept network requests. It's like someone pointing at your screen 
            saying "click here" — they can see the screen but can't interact with the system behind it.
          </p>

          <h3>What happens if the target application's UI changes?</h3>
          <p>
            The self-healing resolver will attempt to find the element using up to 8 different strategies (fallback selectors, 
            metadata matching, text matching, etc.). If it cannot find the element after 10 seconds of retries, it gracefully 
            falls back to showing the step instruction as a centered modal, so the user still sees the instruction even if the 
            spotlight can't be positioned.
          </p>

          <h3>Can we deploy this via Group Policy / SCCM / Intune?</h3>
          <p>
            Yes. Since the extension is a standard Manifest V3 Chrome extension (or V2 for Firefox), it can be deployed through 
            enterprise browser management tools. For Chrome/Edge, use the <code>ExtensionInstallForcelist</code> policy. 
            The extension package can be hosted on a shared network drive or internal web server.
          </p>

          <h3>Does the extension auto-update?</h3>
          <p>
            No. The extension is a static package with no update mechanism. When business processes are modified in the WalkThru 
            admin panel, an administrator must re-download and re-distribute the extension. This is by design — it ensures no 
            unauthorized changes can be pushed to end users.
          </p>

          <h3>Can different users see different processes?</h3>
          <p>
            The current version includes all processes for an application in a single extension. All users who install the extension 
            see the same set of processes. Role-based filtering would require a future enhancement.
          </p>

          <h3>What browsers are supported?</h3>
          <p>
            The extension supports <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> (both using Manifest V3), 
            and <strong>Mozilla Firefox</strong> (using Manifest V2). Each browser has its own download option in the admin panel.
          </p>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center not-prose">
          <p className="text-xs text-muted-foreground">
            This document was generated by the WalkThru platform for CAB review purposes. 
            For technical questions, contact the Digital Transformation team.
          </p>
        </div>

      </article>
    </div>
  );
};

export default ExtensionCABReport;
