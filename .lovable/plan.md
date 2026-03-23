

# WalkThru Enhancement Roadmap
## Objective: End User Training & On-Screen Help for Applications

---

## Current State

WalkThru today provides interactive step-by-step walkthroughs, video steps, checklists, launchers, analytics, and a browser extension. This is a solid foundation — but there's significant room to grow toward a complete training and on-screen help platform.

---

## Recommended Enhancements

### 1. Contextual Help Widget (Always-On Help Panel)

Instead of only guided tours, embed a searchable help sidebar that users can open anytime from any page. It would show:
- Relevant walkthroughs for the current page (matched by URL)
- Searchable FAQ/knowledge base articles
- A "What can I do here?" prompt

**Why**: Users don't always need a full tour — sometimes they just need a quick answer while working.

---

### 2. In-App Tooltips & Field-Level Help

Allow authors to attach persistent tooltip hints to specific form fields or UI elements — not as part of a tour, but as always-visible "?" icons that show help text on hover/click.

**Why**: Reduces support tickets for confusing fields (e.g., "What format should I use for this date?"). This is classic on-screen help.

---

### 3. Multi-Language / Localization Support

Add the ability to create tour steps in multiple languages. The extension detects the user's browser language and serves the correct version.

**Why**: IsDB operates across many countries. Training content in Arabic, French, and English would dramatically increase adoption.

---

### 4. User Progress Tracking & Certification

Track which users have completed which tours. Add:
- A personal training dashboard ("You've completed 7 of 12 processes")
- Completion certificates (auto-generated PDF)
- Manager view showing team completion rates

**Why**: Turns WalkThru from a help tool into a measurable training platform. Directors can report on adoption.

---

### 5. Knowledge Check / Quiz Steps

Add a new step type: quiz. After a walkthrough, present 2-3 multiple choice questions to verify comprehension. Track pass/fail rates in analytics.

**Why**: Proves training effectiveness. Moves beyond "they viewed it" to "they understood it."

---

### 6. Announcement / What's New Banners

Allow admins to push one-time announcements or "What's New" modals when an application is updated. These appear once per user and link to relevant tours.

**Why**: When IT deploys a new feature, users need to know about it. This bridges the gap between release and training.

---

### 7. Smart Tour Suggestions (AI-Powered)

Use analytics data to detect when users are struggling (e.g., repeated clicks on wrong elements, abandoned workflows) and proactively suggest relevant tours.

**Why**: Reactive help catches users who won't seek help themselves — the ones who need it most.

---

### 8. Offline / PDF Export of Tours

Auto-generate printable PDF guides from any tour — with screenshots, step numbers, and instructions. Useful for:
- Environments without browser extension access
- Compliance documentation
- Sharing with external stakeholders

**Why**: Not every user can install an extension. PDF guides ensure universal access.

---

### 9. Role-Based Tour Assignment

Tag tours by user role (e.g., "HR Staff", "Finance Approver", "New Hire"). Users only see tours relevant to their role. Integrates with Active Directory groups.

**Why**: A finance user shouldn't see HR tours. Targeted content increases relevance and completion rates.

---

### 10. Feedback & Rating on Tours

After completing a tour, prompt users: "Was this helpful?" with a thumbs up/down and optional comment. Surface this in the analytics dashboard.

**Why**: Closes the feedback loop. Authors know which tours need improvement without guessing.

---

## Impact Summary

```text
┌─────────────────────────┬──────────────┬───────────────────────┐
│ Enhancement             │ Effort       │ Impact                │
├─────────────────────────┼──────────────┼───────────────────────┤
│ Contextual Help Widget  │ Medium       │ High - always-on help │
│ Field-Level Tooltips    │ Low-Medium   │ High - reduces tickets│
│ Multi-Language          │ Medium       │ High - org-wide reach │
│ Progress & Certificates │ Medium       │ High - measurable ROI │
│ Quiz Steps              │ Low-Medium   │ Medium - proves learn │
│ What's New Banners      │ Low          │ Medium - change mgmt  │
│ Smart Suggestions (AI)  │ High         │ High - proactive help │
│ PDF Export              │ Low          │ Medium - universal    │
│ Role-Based Assignment   │ Medium       │ High - targeted       │
│ Feedback & Ratings      │ Low          │ Medium - improvement  │
└─────────────────────────┴──────────────┴───────────────────────┘
```

## Recommended Priority Order

1. **Feedback & Ratings** — quick win, immediate insight
2. **PDF Export** — already partially built (Scribe PDF exists), extend it
3. **What's New Banners** — low effort, high visibility for leadership
4. **Progress Tracking** — makes training measurable (directors love dashboards)
5. **Field-Level Tooltips** — core on-screen help capability
6. **Quiz Steps** — proves training effectiveness
7. **Role-Based Assignment** — scales with org growth
8. **Multi-Language** — unlocks org-wide adoption
9. **Contextual Help Widget** — transforms WalkThru into a help desk alternative
10. **Smart AI Suggestions** — the "wow factor" for future phases

