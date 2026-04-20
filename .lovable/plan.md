
## Investigate bundle/repo size

I can't run shell commands in plan mode, so I need to switch to default mode to actually measure folder sizes. Here's what I'll do once approved:

### Steps
1. Run `du -sh */ .[!.]*/ 2>/dev/null | sort -h` at repo root to rank top-level folders by size.
2. Drill into the largest ones (likely `node_modules`, `azure-functions`, `extension`, `public`, `dist` if present) with `du -sh */ | sort -h`.
3. List the 20 largest individual files: `find . -type f -not -path './node_modules/*' -not -path './.git/*' -printf '%s %p\n' | sort -n | tail -20`.
4. Run a production build (`npm run build`) and report the `dist/` size + per-chunk breakdown from Vite's output (this is what actually gets uploaded to Azure SWA — the 250 MB limit applies to `dist/`, not the repo).
5. Summarize: which folders are biggest, which files dominate `dist/`, and concrete fixes (lazy-load `pdfjs-dist` ~10 MB, `konva` ~1.5 MB, `docx` ~1 MB; ensure `azure-functions/` and `extension/` aren't in the SWA upload).

### Deliverable
A short report with:
- Top 5 folders by size
- Top 10 largest files
- `dist/` total + chunk breakdown
- Specific recommendations ranked by impact

No code changes in this step — purely diagnostic.
