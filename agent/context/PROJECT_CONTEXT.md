# Techtango Project Context

Last updated: 2026-05-03

This is the canonical living summary for the repo. Keep it short, factual, and current.

## Repo Shape

- `client/` is the React front end.
- `server/` is the Express and Postgres backend.
- `agent/` contains the repo scanner, rule engine, and generated graph/output artifacts.
- `deploy/` contains deployment-related files.

## Stack

- Front end: React 18, React Router v6, Axios, MUI, Bootstrap, React Query, i18next.
- Back end: Express, `pg`, JWT auth, optional Sequelize wiring, WebSocket support.
- Database: PostgreSQL.

## Entry Points

- Front end boot: [client/src/index.js](../client/src/index.js)
- Front end app shell: [client/src/App.js](../client/src/App.js)
- Front end API client: [client/src/services/api.js](../client/src/services/api.js)
- Backend boot: [server/server.js](../server/server.js)
- Backend DB pool: [server/db.js](../server/db.js)
- Backend auth middleware: [server/middleware/authMiddleware.js](../server/middleware/authMiddleware.js)
- Backend subscription gate: [server/middleware/checkSubscription.js](../server/middleware/checkSubscription.js)

## Main Runtime Flows

1. Login starts in `client/src/pages/Login/Login.jsx`.
2. JWT is stored in `localStorage` and attached by `client/src/services/api.js`.
3. Protected routing is handled by `client/src/components/ProtectedRoute.js` and `client/src/components/ProtectedModuleRoute.js`.
4. Backend auth is enforced by `server/middleware/authMiddleware.js`.
5. Subscription access is enforced by `server/middleware/checkSubscription.js` and `server/routes/subscription.js`.

## Important Project Areas

- Business automation UI and routes live under `client/src/pages/businessautomation/` and `server/routes/simple_workflow*`.
- RM / physical records features live under `client/src/pages/rm/` and `server/physicalrecords/`.
- Auth, users, modules, approvals, and subscriptions are core shared concerns.
- `agent/rules/` contains static analysis and safety checks that can be reused as guardrails.
- `agent/projectissues.md` now tracks the current open project issues and should be updated as items are closed.

## Commands

- Front end dev: `cd client && npm start`
- Front end build: `cd client && npm run build`
- Front end lint: `cd client && npm run lint`
- Backend dev: `cd server && npm run dev`
- Backend start: `cd server && npm start`
- Backend lint: `cd server && npm run lint`
- Local backup: `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/backup-techtango.ps1`
- Backup task installer: `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/install-backup-task.ps1`

## Current Watchouts

- `server/routes/subscription.js` currently exposes an unauthenticated `GET /api/subscription`.
- `server/routes/users.js` currently exposes an unauthenticated `GET /api/users`.
- JWT role handling is inconsistent: `authorizeRole('admin')` expects `req.user.role`, but the login tokens do not currently set a role claim.
- `client/src/services/api.js` has duplicate Axios interceptors.
- Google OAuth deployment depends on the live backend env, not just the checked-in `.env` files; `production_deployment.md` records the current production-only and production-plus-local-dev URI rules and the `server/.env` override pitfall.
- Registration now uses SMTP env values in `server/routes/auth.js` and app-relative activation links via `appUrl()`, while `client/src/pages/Register/Register.jsx` now uses `ttlogo.png` instead of the old `logo.svg`.
- The server CORS policy now allows both the configured client origin and localhost dev origins, which fixes registration on both `http://localhost:3000` and `https://Augmis.com`.
- `client/public/index.html` still uses a generic CRA title and external Bootstrap 4 CDN.
- The public landing page at `/` now uses a polished Techtango Origin marketing layout with a product hero, detailed offerings, capability cards, security section, and login CTA.
- The public landing page has an additional polish pass with softer gradients, blurred header treatment, elevated cards, and more refined hero surface styling.
- The authenticated Home page now uses a more polished launchpad layout with a dark hero section, search field, elevated app tiles, and a cleaner add-module card.
- Home page app tiles now keep a uniform card height per breakpoint, and long descriptions clamp so the grid stays visually even.
- Home page app tiles and the All Modules modal now assign module-specific icons based on module name, rather than using a generic card icon.
- The icon mapping preserves the existing icons for Business Automation, Approvals, Dashboard, and Workflow Assignments; all other cards use distinct icons from a shared palette.
- The Dashboard module now uses a different dashboard icon variant than Business Automation, while the other preserved module icons remain unchanged.
- Home and module-modal icons now come from a shared name-based resolver so the same module, including RMS, always gets the same icon in both places.
- Core/static Sequelize migrations are currently incomplete: the repo only contains two duplicate workflow instance migrations, and the live workflow tables are still primarily defined by runtime DDL in `server/routes/workflows.js` rather than a completed migration chain.
- A new baseline migration now exists for the core workflow tables, and the older duplicate workflow-instance migrations have been reduced to no-op placeholders so they do not interfere with future migration runs.
- A second generated baseline migration now covers the remaining non-`cust_*`, non-`workflow_*` public tables from the live schema; it was created but not executed locally.
- Experience Builder now has an in-memory preview path via `?preview=1` that hides the app navbar and TechTango logo header for cleaner page viewing.
- The `View Page` navbar action opens the selected experience page in preview mode, while `Save` and `Publish Page` are still placeholders.
- Preview mode now reads from a dedicated preview snapshot and the builder flushes page state synchronously so newly configured widgets do not fall back to a blank page shell.
- `View Page` now dispatches a preview-prep event so the builder writes the latest draft to storage before the preview tab opens.
- Preview tabs no longer overwrite the saved draft on mount; storage writes are skipped while `preview=1` is active.
- Preview snapshot saving no longer depends on the query-page id matching the active page, which keeps `View Page` working even when the URL and active in-memory page drift apart.
- Preview snapshot normalization now preserves already-shaped in-memory page objects, including `widgets`, `sectionConfigs`, `canvasRows`, and shell state, instead of flattening them like backend rows.
- Experience Builder now separates draft edit URLs (`?page=`) from published URLs (`?pagepub=`); the builder only shows the published URL after a page is marked `Published`.
- Save and publish now surface inline snackbar feedback in the Experience Builder UI instead of silent fire-and-forget behavior.
- The Experience Builder page cards now use a published-state design with a right-aligned `Published` label, an `Edit` button, and an `Open Published` button for published pages.
- The Experience Builder list view now mirrors the Business Automation landing page shell: dark hero banner, centered container, 4-column blue-bordered cards, and bottom-right action button.
- The Experience Builder list view now mirrors the Dashboard Builder discovery row too: create button plus search bar on one line, 4 cards per row, `Delete` and `Manage Access` actions, and dashboard-style card metadata.
- The Experience Builder list view no longer shows the extra Edit/Published toggle controls; it now follows the dashboard builder top-bar pattern with only create and search actions in the list shell.
- Experience Builder list cards now open the edit/configure page on card click, and published pages expose a top-right open icon that launches the published page.
- Published Experience Builder pages now keep the in-page experience header visible; only the host app navbar is suppressed in published mode.
- Experience Builder edit URLs now parse query state reactively from `location.search`, and the fixed page header is rendered as a sticky top bar so `?page=` and `?pagepub=` stay visually consistent.
- Experience Builder edit pages now use a flex column shell with a fixed-height top header bar so newly created pages do not lose the header inside the builder layout.
- Experience Builder edit-mode now renders its header as a separate sticky strip under the Augmis navbar so new pages do not hide the builder header behind the host chrome.
- The sticky builder header offset was corrected back to `top: 0` so edit and published modes no longer leave a blank band above the builder content.
- The Experience Builder header is now back in normal flow under the Augmis navbar in create/edit mode, so the navbar stays visible and the builder header no longer overlays it.
- Experience Builder now has backend routes at `/api/experiencebuilder` and `/api/experiencelayouts`, mirroring the dashboard module with database-backed page and layout records.
- The live `experiencebuilder` table includes `dbtable_id`, `page_name`, `page_url`, `status`, `validations`, `access`, `details`, `create_edit`, `description`, `created_by`, `date_created`, `modified_by`, `date_modified`, `tenant_id`, and `layout`.
- The live `experience_layouts` table uses `dashboard_name` rather than `layout_name`, so the Experience Builder layout routes and client normalization now map that column explicitly.
- Home page last-login display is now server-backed through `/api/auth/last-login`, which reads the previous `login` or `google_login` audit entry for the current user.
- The Home page last-login lookup uses `audit_log.modified_by` rather than `user_id`, because the shared audit logger writes the login user id into `modified_by`.
- The protected app shell now includes a fixed 65px footer with `Copyright @Augmis 2026`.
- The protected app shell footer is now 45px tall and uses the light site theme background.
- The protected app shell footer is slightly darker now and left-aligns the copyright text.
- The protected app shell footer is fixed again, matching the navbar as persistent app chrome.
- The shared footer is rendered from `client/src/components/Layout.js`, and page-local footer duplicates were removed from the main business automation pages.
- Shared client/server URL helpers now replace active localhost links with environment-based URLs for AWS-safe deployment.
- The shared navbar is fixed at the top and the footer is fixed at the bottom, with layout spacing adjusted to keep protected content visible.
- The Home page shell now pulls its colored background up under the fixed navbar to remove the blank gap beneath the header.
- The Home route now opts out of the shared protected-page top padding in `Layout`, while the Home page keeps its own internal top offset so the fixed navbar no longer leaves a white band.
- The remaining light strip above the Home hero was caused by top padding on the Home root container; that padding has been removed so the hero now starts directly under the fixed navbar.
- The navbar is now styled as a floating fixed header with inset horizontal margins, blur, and shadow so it remains visible during scroll while reading as persistent top chrome.
- The navbar floating treatment was corrected back to full-width after the inset version introduced a rounded corner and shifted the left edge inward.
- The navbar now uses sticky in-flow positioning instead of a fixed overlay spacer, which keeps it visible on scroll without the 65px blank band on protected pages.
- The navbar was restored to `position: fixed` and the shared 65px top spacer moved back into `Layout`; the Home page now uses a negative top margin to cancel that spacer so the fixed header stays visible without showing the blank band.
- The active navbar now uses the repo-specific `app-navbar` class instead of Bootstrap's generic `.navbar`, avoiding CSS collisions that could undo fixed positioning.
- Experience Builder create/edit mode was pulling its content up under the host navbar because `ExperienceBuilder.jsx` was zeroing `.page-content` padding at runtime; that reset was removed so the Augmis navbar stays visible in `?page=` mode while `?pagepub=` remains standalone.
- The edit-mode Experience Builder canvas grid overlay was removed so the yellow background grid no longer appears in create/edit mode.
- The outer canvas frame in Experience Builder edit mode is now removed as well, but the inner rows/sections still render and remain editable.
- The edit-mode wrapper padding around the canvas was removed so the rows now occupy the space that was freed by removing the outer frame.
- The remaining canvas gaps were removed by forcing row-level padding/gap to zero in the visible section geometry and changing the inner section wrapper inset to `0`, so spacing now comes only from section padding options.
- The final top-row gap came from an empty spacer block above the canvas; that spacer was removed so the first row now starts flush at the canvas edge.
- Publishing an Experience Builder page now persists a published layout record in `experience_layouts` with `status='published'`, while the page list cards show a colored published icon instead of the old text badge.
- Save now preserves a page's existing published state instead of forcing it back to `Active`, so published pages stay published after edits.
- The publish flow now calls the existing `/api/experiencelayouts` endpoint explicitly and stores the returned `publishedLayoutId` on the experience page record so future publishes update the same layout row.
- The `?pagepub=` route now resolves and renders from `experience_layouts.layout_definition`; it prefers the linked published layout and falls back to a matching layout row by page name for older records.
- If the published layout row is missing widget/section data, the published loader now merges in the draft row as a compatibility fallback instead of rendering a blank page.
- The V2 designer UI has been upgraded into a structured MUI workspace with a gradient hero, grouped shell controls, and widget editors that bind charts/tables to real table metadata.
- `ExperienceBuilderV2.jsx` now passes `tableOptions`, `tableColumnsByTable`, and `onLoadTableColumns` into the designer panel so the widget editors can load actual column names from the selected source table.
- OpenAI environment variables for the AI designer belong in `server/.env`, which is already loaded by `server/server.js` at boot.
- Markdown files are append-only in this repo context; do not overwrite existing `*.md` files during future updates.
- The AI preview endpoint at `/api/experiencebuilder-ai/generate` now runs `verifyToken` before `checkSubscription`, so the request can see `req.user` and does not fail with `Unauthenticated` at the subscription gate.
- The landing page header now uses `ttlogo.png` at a much larger size, with the logo dimensions increased to 1120x215 in the public header.
- The landing page navbar brand lockup now uses the `ttlogo.png` image instead of the previous text-and-shape placeholder.
- The landing page header now renders `ttlogo.png` inside a fixed-size zoomed box (`backgroundSize: 400% auto`) so the logo reads larger without shifting the nav/hero layout.
- The V2 AI designer now shows the exact generated prompt bundle in the dialog so system/user prompts can be copied and tested independently.
- The V2 preview/render layer no longer prints legacy section titles, widget captions, or placeholder copy when AI-generated sections are empty.
- The V2 prompt builder now emits a natural-language design brief for OpenAI instead of embedding the raw page-spec JSON as the user-facing prompt text.
- The V2 page-spec validator now normalizes empty theme palette fields back to defaults, so preview generation does not fail on blank `neutralColor` or similar theme values.
- The V2 page-spec validator now normalizes blank section palette fields back to defaults, so empty `layout.sections[*].borderColor` / `backgroundColor` values do not fail preview generation.
- Empty form widgets in V2 now render as labeled form controls instead of blank bars, and the prompt now tells the model to generate visible form labels.
- The V2 form preview path had a small regression from an out-of-scope `widget` reference and that was corrected to use the widget config only.
- A blank `AIexperiencebuilder.js` placeholder now exists in the Experience Builder folder as the starting point for a separate AI design-planner engine.
- `AIexperiencebuilder.js` is now a real clean entry point that exports a separate renderer stack (`PageRenderer`, `SectionRenderer`, `WidgetRenderer`, `ThemeResolver`, `LayoutComposer`, `ResponsiveAdapter`, and enterprise style presets).
- The Business Automation Experience Builder tile now routes to `/aiexperiencebuilder`, which is backed by a dedicated AI page component instead of the older builder screens.
- The `/aiexperiencebuilder` page now opens a Create New modal that captures natural-language requirements plus broad layout/theme/widget controls before sending the blueprint to AI.
- A local zip backup routine now exists in `scripts/backup-techtango.ps1`; it writes to `D:\Backups\00_TechtangoRJS` and excludes `node_modules`, `.git`, and build/cache output.
- A scheduler helper now exists in `scripts/install-backup-task.ps1`; it registers the backup to run every 30 minutes.
- The local Windows scheduled task `TechtangoRJS Local Backup` has been created to run the backup script every 30 minutes.
- The backup script now writes a per-run log under `D:\Backups\00_TechtangoRJS\logs`, and the first manual run completed successfully on 2026-04-21.

## Working Rules

- Treat this file as the distilled summary.
- Put prompt-by-prompt notes in [PROMPT_LOG.md](./PROMPT_LOG.md).
- Update both files whenever the repo state or active work changes materially.
- Track unresolved issues in [projectissues.md](./projectissues.md) and mark them closed there once fixed.
- Do not store secrets, tokens, passwords, or private URLs here.
## 2026-04-30 - ExperienceBuilder V2 canvas cleanup
- V2 is being treated as the clean AI-rendered builder, not a continuation of the legacy Experience Builder chrome.
- Default AI design intent now leans canvas-first with shell chrome off unless the user explicitly enables it.
- Generated pages should not reintroduce old placeholder text blocks or rounded card framing when the AI spec leaves sections empty.
- Preview rendering was flattened to better match the AI output and reduce legacy dashboard styling.
- `AIexperiencebuilderPage.jsx` had a runtime bug in the section factory that used `list.length` from an undefined `Array.from` callback parameter; that has now been corrected.
- The AI page-design prompt now explicitly asks for stronger hierarchy, depth, and style-specific composition instead of bland default dashboard layouts.
- The clean AI renderer stack now uses richer theme surfaces, card shadows, section accents, and polished widget treatments so the preview feels more enterprise-grade.
- `AIexperiencebuilderPage.jsx` now shows the exact generated OpenAI prompt bundle in the UI, so the system/user prompt can be copied and tested independently.
- The AI page-spec schema now includes controlled design-intent fields (`compositionVariant`, `visualWeight`, `surface`, `alignment`, `emphasis`, and `designSeed`) so the model has more room to express distinct compositions without leaving the schema.
- The AI entry page now rotates the design seed on each generation so the prompt can ask for a different variation while keeping the requested widget and shell assignments intact.
- The AI entry page now uses a single freeform brief instead of the earlier control-heavy modal, so page generation is driven primarily by the user's natural-language intent.
- `aiPromptBuilder.js` now supports a freeform brief mode that avoids hidden prompt steering and lets the model decide the composition from the user prompt itself.
- The AI entry page no longer shows the prompt preview or any preset design controls; the page is driven entirely by the single brief textarea.
- Page validation now rejects AI output that turns shell chrome concepts into layout sections, keeping header/menu/navbar/footer rendering separate from the canvas.
- The OpenAI request temperature default is back to `0.8` to keep variety without making the output drift too far.
- Empty `layout.layoutPreset` values from the AI response are now normalized to `custom` during validation.
- The freeform prompt now explicitly tells the model to output a non-empty `layoutPreset`, defaulting to `custom` unless a named preset fits the brief.
- The OpenAI generation timeout is now 180 seconds so larger dashboard requests with multiple charts and tables have enough time to complete.
- The client axios timeout is also 180 seconds now, so the browser-side request layer no longer aborts at 60 seconds.
- The AI page renderer now has an explicit shell/canvas split with `AppShell` and `PageCanvas`.
- Generated page specs are normalized before validation so shell chrome is preserved as shell chrome and stripped from canvas sections.
- Sections now resolve widgets from both `section.widgetIds` and `widget.sectionId`, which prevents AI output mismatches from hiding charts and tables.
- Dashboard sections now render as responsive MUI grids so chart and table cards can sit side-by-side instead of stacking vertically.
- Shell chrome is now normalized strictly from the user brief, which stops unsolicited left/right menus from appearing on dashboard pages.
- The AI canvas uses reduced outer padding and left-aligned dashboard composition so returned JSON fills the page more naturally.
- Shell visibility normalization now preserves the AI response's own shell flags as well as brief hints, so requested header/footer/menu chrome is retained instead of being dropped.
- The AI entry page now includes a Blueprint Inspector modal to show the prompt, raw JSON, and render pipeline after generation.
- The generated-page blank state and outer canvas padding were reduced to remove unnecessary whitespace around dashboard output.
- Dashboard and content sections now avoid hero-style centering, use smaller padding, and size to content instead of filling most of the viewport.
- The dashboard spacing has been reduced again in the shell, section, and widget renderers so generated dashboards sit much tighter on the page.
- The Blueprint Inspector modal remains available after generation so the prompt, AI JSON, and renderer pipeline can be inspected directly.
- The AI generation flow is now two-stage: the first pass produces visual-only HTML, and the second pass converts that HTML into Experience Builder V2 JSON.
- The inspector now includes an HTML tab so the raw Stage 1 preview can be inspected before or after JSON conversion.
- The AI route now retries transient OpenAI `fetch failed` errors and labels failures by stage so it is easier to tell whether Stage 1 HTML preview or Stage 2 JSON conversion failed.
- Stage 1 HTML generation now classifies the brief into a page family, so a pharma/company brief produces a corporate webpage prompt instead of a dashboard-centric one.
- Stage 1 prompt text now explicitly distinguishes normal company webpages from dashboard/application pages so generic company briefs no longer default to dashboard composition.
- The AI generation flow now sends user-prompt-only instructions for both stages; system prompts are no longer sent to the model.
- The AI renderer now treats corporate/company pages as webpage content rather than dashboard cards, and text widgets render more like HTML content blocks instead of boxed dashboard widgets.

- 2026-05-01: Tightened corporate/pharma rendering to use a centered webpage layout, page-family-aware section grouping, and corporate-specific hero/products/news/contact composition so the React output matches the HTML preview more closely.
2026-05-01: AI Experience Builder corporate pages now sanitize pageMeta to the schema-safe keys only, use tighter full-width rendering, and avoid injecting unsupported pageFamily metadata into the JSON pipeline.
- The AI Experience Builder preview now includes a sandboxed iframe HTML renderer so stage 1 AI webpage output can be shown faithfully, rather than depending entirely on the stage 2 React reconstruction.
- The structured page-spec pipeline remains in place for editable pages and inspector/debugging, but the HTML preview is now the primary visual source for webpage-style generation.
- The AI Experience Builder now exposes a React/HTML preview toggle, and the React side is being shifted to a compiler that translates the generated HTML into a React element tree while preserving structure and CSS.
- The React preview should not silently fall back to the iframe; unsupported HTML/CSS should surface as an error state instead.
- The HTML-to-React compiler now rewrites root CSS selectors more faithfully and rejects unsupported external stylesheets or embedded content instead of degrading into a fallback render.
- The React preview root is now full-bleed rather than card-framed, so compiled pages behave more like a true document surface.
- The Create New Page modal now includes Plain HTML and Rich HTML with JS generation modes and a structured interaction spec form for the rich path.
- The HTML and JSON prompt builders now carry the selected mode and interaction spec so the AI can generate static or interactive page intent more explicitly.
- The main Experience Builder canvas now exposes ellipsis actions on empty section placeholders and shell chrome areas, with a shell options dialog for assigning header/footer/menu placeholder content.
- Shell placeholder choices persist in a page-level `shellChrome` object so header/footer/left/right menu content can be edited from the canvas.
- Stage 1 AI generation failures now serialize the backend error cause metadata, and the UI renders the details so intermittent network/OpenAI issues are easier to inspect.
## 2026-05-03

- The `/aiexperiencebuilder` shell-header click path now detects header-like nodes and routes them to the reusable header modal instead of the generic section modal.
- The AI header editor now accepts and renders both `logoUrl` and `logoImageUrl`, persists the edited header as visible, and keeps the React preview aligned with the uploaded logo.
- The preview paths now replace the generated top dashboard strip with a logo-only header strip and ellipsis control, instead of stacking the header above the generated content.
- The HTML preview is intentionally raw again: it does not inject a fake header/logo strip. The React preview is the spec-driven `AppShell` render, so the header options modal must update `generatedSpec.shell.header` to affect the visible header strip.
- The React header now uses `logoImageUrl` as the canonical logo source and suppresses broken-image placeholders, and dashboard widgets once again receive `onWidgetOptions` so chart/table ellipsis controls show in the React preview.
- Chart/table selection now hydrates the live widget config with fetched rows and columns so the React preview can render populated datasets instead of falling back to blank placeholders.

## 2026-05-05

- Legacy Experience Builder section cards now render with a default shadow, and the Configure Page dialog exposes a page-level shadow toggle to add or remove it.
- The Experience Builder canvas wrapper padding was removed so the card area no longer has the extra left/top gutter around the cards.
- The Experience Builder canvas badge now lives in the fixed header area, and the old draggable badge state in the canvas body has been removed.
- The Experience Builder canvas toolbar is draggable again, but its movement is bounded to the fixed header region.
- The Experience Builder canvas no longer draws the horizontal divider lines between cards, so adjacent sections read as clean stacked cards.
- The Experience Builder shell and canvas borders were removed so the cards render without the extra framed container around them.
- The Experience Builder section cards now use a sharper, lower-blur default shadow.
- The legacy Experience Builder now shows placeholder ellipsis buttons on the header, footer, left menu, and right menu shell regions in edit mode.
- The legacy Experience Builder shell regions now open reusable header/footer/menu option modals from `shellChrome` when their ellipsis buttons are clicked.
- Legacy Experience Builder table widgets now include search, row numbers, and simple paging controls in the canvas preview.
- Legacy Experience Builder table widgets now display a clear empty state when table search filters out all rows.
- Legacy Experience Builder table widgets now let the user select rows per page from the table footer.
- Legacy Experience Builder table widget search is right-aligned and capped at 20% width.
- The legacy Experience Builder save endpoint now uses `pool.query` in the update path; this fixes the `client is not defined` runtime error during save.
- The new `aiappbuilder` module is scaffolded with an AI schema generator, `cust_` table creation, and generic JSONB CRUD endpoints for one-page apps.

## 2026-05-06

- AI App Builder work has started: backend schema generation, `cust_` table creation, and a React builder shell for metadata-driven one-page CRUD apps.
- The Business Automation landing page now includes an AI App Builder tile, and the new application flow pauses at a schema review dialog so AI output can be edited before the application record and table are created.
- The AI App Builder OpenAI response schema must explicitly set `additionalProperties: false` on object schemas; this was required to satisfy the current `json_schema` validator.
- The AI App Builder `validations` schema must also list every declared property in `required`, including `field` and `compareWith`, to satisfy the strict OpenAI schema validator.
- The AI App Builder `fields[].validation` schema must also list every declared property in `required`, including `minLength`, `maxLength`, `min`, and `max`, to satisfy the strict OpenAI schema validator.
- The AI App Builder `fields` array items and root schema both need explicit full `required` lists covering all declared properties to satisfy the strict OpenAI schema validator.
- The AI App Builder backend now tolerates empty structured AI output by falling back to the heuristic schema and emits a clearer error when AI returns malformed JSON.
- The AI App Builder backend now reads the OpenAI response body as text first so an empty/non-JSON body no longer throws `Unexpected end of JSON input`.
- The generated `cust_*` table model now uses `id` as the primary key and includes `date_created`, `created_by`, `date_modified`, and `modified_by` audit columns.
- The AI App Builder table now exposes only `date_created` and `created_by`, and the create/edit modal uses a booking-style layout with native time picker support for `time` fields while backend audit fields continue to update automatically.
- AI App Builder now enforces booking conflict validation on the backend via `unique_combination` rules, and generated schemas omit automatic audit fields from user entry forms.
- The AI App Builder booking modal styling was softened and narrowed to better match the provided sample form, with subtler gradients, less intense field chrome, and a tighter 980px shell.
- The AI App Builder records table now mirrors the provided booking list sample with a lighter shell, dark navy header, right-aligned search/create controls, chip-like statuses, outlined edit/delete buttons, and a compact pagination footer.
- AI App Builder now supports schema-level `uniqueRules`, `overlapRules`, and `dependencies`, and the backend enforces required-field, date/time, uniqueness, and overlap validation before insert/update.
- The Create New Application flow now uses an advanced builder modal inspired by the provided HTML reference, letting users define fields, dependencies, validation rules, and table settings before generating the schema.

## 2026-05-09

- AI App Builder now writes `tenant_id` from `req.user.tenant_id` into both `aiappbuilder_applications` and each generated `cust_*` table, and returns the tenant column in application and record payloads.
- Added executable migration helpers under `server/scripts/` to back up tables missing `tenant_id` and then add the column with an explicit `--apply` step.
- The backup helper now snapshots all non-system public application tables before schema changes, not just tables missing `tenant_id`.

## 2026-05-10

- Compactified the AI App Builder CRUD table renderer so published CRUD apps render smaller headers, smaller actions, fixed-width ellipsis cells with hover tooltips, and a tighter table shell for a more polished view.
- Tightened the CRUD action column so the Edit/Delete buttons stay inside the table, and applied the same compact header/card treatment to the dashboard app renderer.
- Switched the CRUD row actions to icon-only buttons and removed the duplicated description line under the table header area.
- Compactified the booking chart renderer for published dashboard-style apps by shrinking the header, buttons, grid padding, slot cards, and status chips.
- Added a reusable compact `DataGrid` table component for AI App Builder CRUD apps with a column selector, charts button, default six-column visibility, and beautified status/progress cells.
- Created the applicationwide tenant isolation foundation by filling `server/middleware/tenantContext.js` with tenant context helpers and `server/security/tenant_rls.sql` with row-level security policy SQL for numeric `tenant_id` tables.
- Added the client-wide session hardening layer with `client/src/auth/sessionManager.js`, `client/src/hooks/useSessionExpiry.js`, and `client/src/components/SessionBoundary.js`, then wired `App.js`, `api.js`, and `index.js` to use the shared logout/redirect path.
- Activated tenant context at the server entrypoint by mounting `tenantContext()` in `server/server.js` after the auth gate so authenticated API requests get tenant metadata consistently.
- Matched the AI CRUD `Create New` button styling to the booking chart's primary blue action style so it uses the same compact sizing, casing, and shadow treatment.
- Tightened the AI CRUD `Create New` button height to a fixed 34px so it matches the booking page action buttons more closely and no longer stretches vertically.
- Upgraded AI App Builder to use a hybrid enterprise table contract for new `cust_*` apps with real typed relationship columns, a dedicated `aiappbuilder_relationships` metadata table, soft deletes, and version tracking alongside the JSONB payload.
- Fixed the dashboard generation contract in AI App Builder so `dashboardConfig` now preserves `cards`, `charts`, `tables`, `textBlocks`, and `sourceTables` instead of flattening dashboards to the legacy `widgets` shape.
- Fixed the OpenAI response schema for AI App Builder relationships by making nested relationship validation/metadata objects strict (`additionalProperties: false`) so dashboard generation no longer fails schema validation.
- Hardened the `aiappbuilder_relationships` migration so legacy tables missing `app_slug`, `table_name`, `source_field`, `column_name`, `relationship_name`, or `label` are backfilled before relationship metadata reads and writes.

## 2026-05-11

- Added dashboard-builder validation in AI App Builder so source tables, KPI cards, charts, and table widgets cannot be generated with blank dependency fields.
- Required dashboard source tables, card title/table/metric, chart title/table/type/X field, and table widget title/table/columns at generate time so incomplete dashboard rows are rejected before schema creation.
- Converted dashboard KPI value fields, chart X fields, and chart Y fields into dropdown selects driven by the selected table columns, and auto-filled default selections so missing user input no longer leaves them blank.
- Dashboard generation now normalizes the dashboard rows before validation so default card/chart/table-widget values are applied first and the saved schema no longer drops charts to an empty array.
- Dashboard builder specs for dashboards are now preserved even when `fields` is empty; the server no longer discards a valid dashboard-only spec just because the app is intentionally fields-free.
- Dashboard app runtime now returns records grouped by source table for dashboard apps, and the published dashboard renderer reads those keyed rows per card/chart/table widget so multi-table dashboards can display real data.
- Dashboard renderer normalization now preserves top-level source-table columns in addition to `transaction_data`, which is required for charts/cards that reference columns like `tenant_id` and `is_active`.
- The AI App Builder shell now treats dashboard `records` payloads as keyed objects instead of arrays, preventing the `records.map is not a function` crash on published dashboard routes.
- Published dashboard widgets now have inline customization controls for editing card/chart/table widget properties and style tokens directly in the live dashboard view.
- Published dashboard widgets now also support removal from the live dashboard view via header controls and the widget settings dialog.
- Published dashboard widget edits and removals now have a persistent save path that updates `aiappbuilder_applications.schema_json` from the live dashboard renderer.
- Dashboard applications also expose a `Save Changes` button beside `Publish` in the AI App Builder application list so schema updates can be persisted from the list view.
- Dashboard renderer edits are now synchronized back into the selected schema state so the list-view `Save Changes` action writes the current dashboard layout rather than a stale copy.
- The dashboard schema normalizer now preserves extra widget properties such as `style` and `size`, which keeps saved palette and layout customizations intact across refreshes.
- The dashboard header no longer shows `Save Changes`; that action now lives only beside `Publish` on the AI App Builder application cards below search applications.
- Dashboard app cards below search applications now show `Save Changes` beside `Publish` again, matching the intended app-list placement.
- The dashboard renderer now syncs its live widget state back into the parent schema so the app-card `Save Changes` action persists the edited layout instead of a stale copy.
- The EC2 client image needed a rebuild after the Experience Builder sync; nginx was not the stale layer.
- The EC2 instance had to be temporarily resized from `t3.medium` to `t3.large` so the client build could complete without OOM.
- The rebuilt client image now serves `main.e5ad7c09.js` and `main.17067683.css`.
- Host nginx, not the Docker nginx container, is the live public serving layer for `Augmis.com`; it serves `/home/ubuntu/apps/00_TechtangoRJS/client/build`.
- The rebuilt client bundle had to be copied into the host nginx document root and nginx reloaded before the public page updated.
- The API image was intentionally left unchanged because `server/routes/experiencelayouts.js` still differs on EC2 and was not part of the approved sync scope.
- `server/routes/experiencelayouts.js` was then synced to EC2 and the API container was rebuilt/recreated so the remaining Experience Builder route drift is cleared too.
