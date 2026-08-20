# Prompt Log

Append one entry per prompt or meaningful work session. Keep entries short and concrete.

## 2026-04-20

- Read the repo docs and source tree to establish the project shape.
- Confirmed the app is a React front end plus Express/Postgres backend with an `agent/` scanner and rule system.
- Identified two unauthenticated data-exposure routes and an admin-role mismatch as the main security watchouts.
- Created the living context harness in `agent/context/`.

## 2026-04-21

- Added a create-and-configure experience page action bar in the navbar with `View Page`, `Save`, and `Publish Page` placeholder buttons.
- Wired `View Page` to open the active experience page in preview mode using `?preview=1`.
- Hid the global navbar and TechTango logo/header in preview mode so the page renders as a cleaner in-memory preview.
- Kept `Save` and `Publish Page` as placeholders for later persistence and publishing logic.
- Hardened preview loading so it prefers a dedicated snapshot and flushes page state synchronously, preventing preview from opening as an empty shell when the live draft is still settling.
- Added a local PowerShell backup routine at `scripts/backup-techtango.ps1` that stages the repo, excludes `node_modules` and build/cache folders, and writes timestamped zip archives to `D:\Backups\00_TechtangoRJS`.
- Updated the backup routine to retain only the 10 newest zip archives and added `scripts/install-backup-task.ps1` to register a 30-minute Task Scheduler job.
- Registered the local Windows scheduled task `TechtangoRJS Local Backup` so the repo backup runs every 30 minutes.
- Added per-run log files under `D:\Backups\00_TechtangoRJS\logs` and completed the first manual backup run, which generated the initial zip archive and log.
- Added a synchronous preview-prep event between the Experience Builder navbar and page state so `View Page` can flush the latest draft before opening preview.
- Fixed preview mount behavior so the `preview=1` tab no longer writes its empty initial state back into storage and overwrites the draft.
- Added backend Experience Builder routes for `experiencebuilder` and `experiencelayouts`, and updated the Experience Builder UI to load pages/layouts from the API instead of localStorage as the primary source.
- Investigated the Experience Builder create failure and confirmed the live schema: `users` uses `tenant_id`, `experience_layouts` uses `dashboard_name`, and `experiencebuilder` already has the broader dashboard-like column set.
- Fixed the Experience Builder create path to read `tenant_id` from the authenticated user and to align the layout route/client mapping with `dashboard_name`.
- Validated the corrected insert shapes directly against Postgres for both `experiencebuilder` and `experience_layouts`.
- Fixed a preview regression by removing the stale query-page guard from the preview snapshot save path and making preview prefer the saved in-memory snapshot when it exists.
- Fixed a second preview regression by teaching the page normalizer to preserve in-memory page objects so preview snapshots keep widgets and section configs instead of flattening them into empty shells.
- Added inline snackbar feedback for Experience Builder save/publish actions.
- Split Experience Builder URLs into draft edit mode (`?page=`) and published mode (`?pagepub=`), and stopped showing a URL on the page card until the page is actually published.
- Kept published-page access behind the authenticated app route and only render published content when the DB record is marked `Published`.
- Updated the created-page card layout so published pages show a right-aligned `Published` label with `Edit` and `Open Published` actions, while draft pages keep the configure/open flow.
- Reworked the Experience Builder list view to match the Business Automation landing page shell and card styling, including the hero banner, 4-column grid, blue borders, shadows, and bottom-right outlined action button.
- Reworked the Experience Builder list view again to mirror the Dashboard Builder discovery layout with a create button, search bar, 4-up cards, dashboard-style metadata, and delete/manage-access actions.
- Removed the stray Edit/Published toggle controls from the Experience Builder list shell and aligned the outer margins/container spacing to the dashboard builder pattern.
- Changed Experience Builder cards so clicking the card opens the edit page, while a separate icon on published cards opens the published page.
- Fixed published Experience Builder pages so they keep the experience header visible instead of suppressing it like preview mode.
- Replaced the public landing page with a polished marketing layout that explains the platform offerings, capabilities, security model, and login path.
- Refined the public landing page with a more polished visual treatment: softer background accents, glassier hero surfaces, premium card shadows, and tighter header/button styling.
- Reworked the authenticated Home page into a polished launchpad with a dark hero banner, search bar, elevated module cards, quick-access stats, and cleaner empty/add states.
- Tightened the Home page cards so module tiles keep a uniform height per breakpoint and long descriptions clamp instead of stretching the card height.
- Added module-specific icons to the Home app tiles and the All Modules modal cards so both views have a consistent visual language.
- Updated the Home and All Modules modal icon mapping so every card gets a distinct icon, while Business Automation, Approvals, Dashboard, and Workflow Assignments keep their existing icons.
- Changed the Dashboard icon to a different variant in both the Home grid and the All Modules modal, while leaving the other preserved module icons unchanged.
- Replaced the order-based module icon assignment with a shared name-based resolver so cards like RMS resolve to the same icon in the Home grid and the All Modules modal.
- Audited the core/static migration story: the repo only has two duplicate workflow instance migrations, there is no Sequelize migration history table in Postgres, and the live workflow tables are still being managed primarily by runtime DDL rather than migrations.
- Created a baseline Sequelize migration for the core workflow tables and neutralized the two older workflow-instance migration files so they are harmless no-ops for future AWS migration runs.
- Generated a baseline migration for the remaining non-`cust_*`, non-`workflow_*` public tables directly from the live schema, without executing it locally.
- Added a server-backed Home page last-login lookup at `/api/auth/last-login`, driven from the latest `login` or `google_login` audit entry for the current user.
- Corrected the Home page last-login query to read `audit_log.modified_by`, matching the shared audit logger output, so the card can show the actual last login timestamp instead of `No login recorded`.
- User clarified that the Home page should show the previous login, not the current session.
- Updated `/auth/last-login` to skip the newest audit row and return the prior login entry when one exists.
- Added a shared protected-layout bottom bar with `Copyright @Augmis 2026`.
- Adjusted the Experience Builder protected-shell viewport height to account for the fixed footer.
- Removed page-local footer rendering from the main business automation pages so the bottom bar stays common and not duplicated.
- Reduced the shared footer height to 45px and switched it to the light site theme background.
- Darkened the shared footer slightly and left-aligned the copyright text.
- Restored the shared navbar as fixed at the top and kept the footer fixed at the bottom, with layout spacing adjusted for both bars.
- Added shared client/server URL helpers and replaced active localhost API and email links with environment-based URLs for AWS deployment.
- Restored the shared navbar and footer as fixed app chrome and adjusted layout spacing for both bars.
- Increased the landing page header logo size for `ttlogo.png` to 1120x215, which is a 400% increase over the previous landing-page dimensions.
- Replaced the landing page header’s text-based brand block with the `ttlogo.png` image from the navbar folder.
- Reworked the landing page header logo again so it renders `ttlogo.png` in a fixed 180x48 box with `backgroundSize: 400% auto`, preserving the header/nav alignment while making the logo visually larger.
- Anchored the landing page logo box to the left with `backgroundPosition: left center` to remove the visible left padding while keeping the same header layout.
- Reduced the landing page header logo box back to `backgroundSize: 100% auto` while keeping the left alignment.
- Moved the landing page header onto a full-width flex row with `10px` horizontal padding so the logo sits near the page edge without disturbing the rest of the layout.
- Added `dashboardpic.jpg` as a low-opacity background layer behind the landing-page hero preview cards for Experience Builder and Enterprise Automation Suite.
- Removed the floating Experience Builder and Enterprise Automation Suite hero cards, leaving the dashboard image as the visual in that hero area.
- Made the landing-page `dashboardpic.jpg` fully opaque and removed the softening filter so the hero image appears brighter.
- Switched the landing-page hero visual to `dashboard2.jpg` from the same public folder.
- Replaced the login page logo SVG with `dashboard2.jpg` and widened the login logo display area so the new image fits the card cleanly.
- Corrected the login page logo to use `ttlogo.png` from the navbar folder instead of `dashboard2.jpg`.

## 2026-04-25

- Removed the white gap under the fixed protected header on the Home page by pulling the home shell background up under the navbar.
- Added `agent/projectissues.md` to park the current open issues with explicit `[open]` status markers and a note to close them once resolved.
- Refined the Home/layout shell so `/home` opts out of the shared 65px protected-page top padding while the Home page itself keeps its own content offset under the fixed navbar.

## 2026-06-20

- Investigated the Experience Builder modal mismatch between localhost and `Augmis.com` on AWS.
- Confirmed the deployed client bundle was already in sync with local, so the old modal was not caused by nginx or a stale build artifact.
- Found the real root cause in prod data: `experience_layouts` was empty on AWS while localhost had the `Experience Page 2` layout row.
- Seeded the prod Postgres `experience_layouts` table from local using the existing row definition and verified the insert on EC2.
- Confirmed the live AWS modal now has the same layout source as localhost after the data sync.
- Removed the remaining blank strip above the Home hero by dropping the Home root container's top padding so the hero starts directly under the fixed navbar.
- Converted the navbar into a persistent floating header style with inset edges, blur, and shadow while keeping `position: fixed` so it stays visible during page scroll.
- Reverted the navbar inset after it shifted the left edge inward; it now stays full-width and fixed with blur/shadow only.
- Switched the navbar from fixed overlay spacing to sticky in-flow positioning so it stays visible on scroll without creating the top gap on any page.
- Restored the navbar to `position: fixed` and moved the shared top spacing back into `Layout`, while Home now uses a negative top margin to neutralize the spacer without reintroducing the visible band.
- Renamed the live navbar root off Bootstrap's generic `.navbar` class to `app-navbar` so Bootstrap cannot override the fixed positioning or layout.

## 2026-04-26

- Saved a production deployment checklist in `production_deployment.md` covering the Google OAuth auth-code flow, Docker env precedence, and the production-only versus production-plus-local-dev URI sets.
- Added a harness note to consult `production_deployment.md` before any future production deployment starts.
- Recorded the deployment issues we hit on EC2: host nginx could not reach the API until the container was published on `127.0.0.1:5000`, the live client build was stale until the fresh build was synced from source, and Google login required the live backend env plus matching Google Cloud URIs.
- Documented the deployment fixes used to resolve those issues: publish the API to host loopback, rebuild the client from current source, reload host nginx, and keep the Google OAuth env values aligned with the runtime container.
- Updated registration to use SMTP env values and app-relative activation links instead of the Google OAuth redirect variable.
- Switched the register page logo from the old `logo.svg` to `ttlogo.png` so it matches the rest of the app branding.
- Updated the server CORS policy to allow both production and localhost origins, and changed the register page to use the shared Axios API client instead of a raw fetch call.
- Rebuilt and redeployed the client bundle and API on EC2, then verified `POST /api/auth/register` on `Augmis.com` returns `201 Registration successful`.

## 2026-04-27

- Investigated the Experience Builder edit/published header mismatch reported for `?page=` versus `?pagepub=`.
- Made the Experience Builder query parsing reactive to `location.search` so mode changes do not get stuck on stale query state.
- Restored the page-shell wrapper structure and kept the builder header styled as a sticky top bar so the edit view can render the fixed header consistently.
- Ran a focused ESLint pass on `client/src/pages/businessautomation/experiencebuilder/ExperienceBuilder.jsx`; it now parses cleanly with only pre-existing warnings.
- Followed up on the page-edit header issue for new Experience Builder pages and changed the page shell to a flex column layout so the edit header renders as a fixed-height top bar instead of depending on sticky positioning.
- Moved the edit-mode Experience Builder header out of the shell body and into its own sticky strip under the Augmis navbar so the header no longer hides behind the host chrome on new pages.
- Corrected the edit/published header offset after the sticky-strip change by moving the builder header back to the top of the page content instead of offsetting it by the navbar height.
- Reverted the Experience Builder header back to normal in-flow layout so create/edit mode keeps the Augmis navbar visible and the builder header sits directly below it instead of covering it.

## 2026-04-28

- Rechecked the Experience Builder create/edit versus published page behavior after the navbar/header regressions.
- Found that create/edit mode was being pulled up by a runtime `.page-content` padding reset inside `ExperienceBuilder.jsx`, which made the Augmis navbar disappear again.
- Removed that edit-mode padding wipe and kept the host navbar manipulation limited to the standalone published/preview cases.
- Removed the edit-mode canvas grid overlay from `ExperienceBuilder.jsx` so the background grid no longer shows in create/edit mode.
- Removed the outer edit-mode canvas frame from `ExperienceBuilder.jsx` while keeping the inner rows/sections intact.
- Removed the edit-mode wrapper padding around the canvas so the rows expand into the space freed by the outer frame removal.
- Removed the remaining fixed canvas insets by disabling row-level padding/gap in the canvas geometry and clearing the hardcoded inner section inset, so spacing now comes only from section padding options.
- Removed the empty spacer block above the canvas that still added top margin, so the first row can sit flush against the top edge.
- Fixed publish persistence so Save no longer demotes published pages, and publishing now writes a row into `experience_layouts` with `status='published'`.
- Replaced the published text badge on the Experience Builder page cards with a colored published icon and only show the open button when a published URL is actually stored.
- Wired the publish flow to call the existing `/api/experiencelayouts` API explicitly and persist the returned `publishedLayoutId` back on the experience page record.
- Changed `?pagepub=` loading so the rendered page comes from `experience_layouts.layout_definition` instead of the draft `experiencebuilder` row.
- Made the published loader prefer the linked published layout, but fall back to a matching `experience_layouts` row by page name for older published pages that were not yet backfilled.
- Made the published loader merge missing layout fields from the draft row only when the published layout row is incomplete, so `?pagepub=` no longer renders blank for older layouts.

## 2026-04-29

- Reworked the V2 AI designer panel to feel like a structured workspace instead of a flat placeholder form.
- Added a gradient hero, grouped shell controls, and richer widget editors for chart/table/image/icon/text widgets.
- Wired the designer panel to the V2 page's real table metadata so chart and table widgets can select actual tables and columns.
- Passed `tableOptions`, `tableColumnsByTable`, and `onLoadTableColumns` from `ExperienceBuilderV2.jsx` into the designer panel.
- Confirmed the OpenAI environment variables belong in `server/.env`, which is already loaded at server boot.
- Documentation updates are now treated as append-only; markdown files should not be overwritten, only extended with new entries.
- Fixed the AI preview route mount so `verifyToken` runs before `checkSubscription`, which prevents the preview request from failing with `Unauthenticated`.
## 2026-04-30 - ExperienceBuilder V2 canvas cleanup
- Removed legacy shell defaults from AI-generated V2 pages so generated layouts no longer inherit the old Experience Builder chrome by default.
- Changed the AI prompt to prefer a clean canvas-first layout unless the designer explicitly enables navbar/header/footer/sidebar chrome.
- Flattened the preview card chrome so sections render closer to the AI output instead of rounded dashboard panels.
- Removed empty-widget fallbacks that were rendering fake text blocks and placeholders on generated pages.
- Added a visible generated-prompt viewer to the V2 designer so the exact system and user prompts can be copied and tested independently.
- Removed remaining section headers, widget captions, and placeholder text from the V2 preview/render layer so the page reads closer to the AI output instead of the old builder scaffolding.
- Switched the V2 prompt builder to a natural-language brief format while keeping the JSON schema as the output contract for the model.
- Normalized the AI page-spec theme palette on validation so empty theme strings, including `neutralColor`, fall back to defaults instead of breaking preview generation.
- Normalized AI-generated section palette fields on validation so blank `borderColor` and `backgroundColor` values fall back to defaults instead of failing preview generation.
- Updated form widget previews so empty form blocks render as labeled form controls instead of anonymous blank bars.
- Added a prompt instruction telling the AI to generate visible labels and meaningful field names for forms.
- Fixed a V2 form preview regression caused by referencing an unavailable outer `widget` variable in the render path.
- Created a blank `AIexperiencebuilder.js` placeholder to start a separate AI page-design engine path in the Experience Builder folder.
- Built the first clean `AIexperiencebuilder.js` entry point and supporting renderer modules for presets, theme resolution, layout composition, responsive adaptation, sections, and widgets.
- Added a dedicated `/aiexperiencebuilder` page and pointed the Business Automation Experience Builder tile at it.
- Replaced the placeholder AI entry page with a Create New modal flow that captures broad requirements, shell intent, widget JSON, theme, section count, columns, and rows before generating an AI blueprint.
- Fixed a runtime crash in `AIexperiencebuilderPage.jsx` caused by using an invalid `Array.from` callback signature and reading `list.length` from an undefined callback parameter.
- Strengthened the AI page-design prompt to explicitly avoid bland default dashboards and to vary composition, surface treatment, and hierarchy by style and intent.
- Upgraded the clean AI renderer stack to use richer theme surfaces, section accents, shadows, and more polished widget treatments for charts, tables, forms, and KPI blocks.
- Raised the OpenAI generation temperature slightly to encourage more varied layouts instead of repeatedly producing the same safe composition.
- Added a visible prompt preview panel to `AIexperiencebuilderPage.jsx` so the exact system and user prompt bundle can be inspected and copied before or after generation.
- Added controlled design-intent fields to the AI blueprint flow: `compositionVariant`, `visualWeight`, `surface`, `alignment`, `emphasis`, and a per-generation `designSeed`.
- Relaxed the AI prompt wording so `compositionMode` acts as intent rather than a rigid grid, and the model can vary hierarchy, surface treatment, and section emphasis.
- Wired the new design-intent fields into the clean renderer stack so the preview can show stronger layout personality instead of a flat generic dashboard.
- Simplified the AI entry page down to a single natural-language requirement brief so page generation is driven by the user's prompt instead of preset controls.
- Added a freeform prompt mode in `aiPromptBuilder.js` so the system and user prompts focus on the brief and do not steer the model with hidden layout presets.
- Removed the remaining prompt preview and preset-style controls from the AI entry page so page generation is driven only by the user's brief.
- Added a shell-chrome guard in page validation so header, menus, navbar, footer, and bottom bar cannot be emitted as canvas sections.
- Updated the OpenAI generation temperature default to `0.8` for slightly more varied but still controlled output.
- Normalized empty `layout.layoutPreset` values during validation so freeform AI responses can safely fall back to `custom` instead of failing preview generation.
- Tightened the freeform prompt to require a non-empty `layoutPreset` value, using `custom` unless the brief maps cleanly to a named preset.
- Increased the AI generation timeout from 60 seconds to 180 seconds because dashboard-style briefs with many widgets were timing out before the OpenAI response completed.
- Added a page-spec normalizer that syncs shell visibility, strips shell sections from the canvas, and removes orphan widget references before validation/rendering.
- Split the AI renderer into `AppShell` and `PageCanvas` so header/footer/menus render only as shell chrome and never as layout sections.
- Upgraded dashboard widget rendering so charts, tables, icons, KPIs, forms, and text blocks render as enterprise cards instead of blank placeholder shells.
- Increased the client axios timeout to 180 seconds so the browser no longer aborts long-running AI generations at 60 seconds.
- Repaired widget resolution so sections now collect widgets from both `section.widgetIds` and `widget.sectionId`, preventing dashboard cards from disappearing when the AI returns mismatched section links.
- Added explicit dashboard grid rendering and polished chart/table widget cards so 6 charts and 2 tables can render in a responsive enterprise layout.
- Added dev-mode warnings when a section has no rendered widgets, making it easier to see whether the AI returned JSON but with missing widget mappings.
- Tightened shell visibility normalization so shell chrome is brief-driven; left/right menus no longer leak into dashboard pages unless explicitly requested.
- Reduced outer canvas padding and aligned dashboard sections to the top-left so AI-rendered dashboards do not sit inside an oversized padded frame.
- Restored AI shell visibility during normalization by preserving AI-returned shell flags and brief-driven hints, so header/footer/menu chrome is not dropped during post-processing.
- Added a post-generation Blueprint Inspector modal that exposes the exact natural-language prompt, returned JSON, and renderer pipeline used for the generated page.
- Reduced the empty-state frame and outer canvas padding so the AI-rendered dashboard has less built-in whitespace around it.
- Dashboard/content sections now use hero-free layout rules: smaller padding, auto height, top-left alignment, and a dashboard grid that starts at the top instead of centering within oversized cards.
- Reduced the dashboard spacing again across AppShell, PageCanvas, SectionRenderer, and WidgetRenderer so the generated page sits much tighter on all sides.
- Kept the inspector modal in place so the generated prompt, JSON, and render pipeline remain visible for debugging the AI output.
- Added a two-stage AI generation flow: Stage 1 produces a static HTML dashboard preview, and Stage 2 converts that HTML into the strict Experience Builder V2 JSON schema.
- Added a new inspector HTML tab so the raw Stage 1 HTML preview can be reviewed alongside the prompt bundle, returned JSON, and renderer pipeline.
- Added retry and stage-aware error handling to the AI generation route so transient `fetch failed` errors can retry and failures are labeled as Stage 1 HTML preview or Stage 2 JSON conversion.
- Stage 1 HTML prompt is now page-family aware, so pharma/company briefs bias toward corporate webpages instead of dashboard layouts.
- Replaced the Stage 1 system and user prompt text with the company-vs-dashboard split supplied by the user so generic company briefs produce marketing/business webpages instead of dashboards.
- Removed the system prompt from the AI generation flow so both stages now send user-prompt-only instructions while keeping the inspector modal visible.
- Updated the renderer so corporate/company pages no longer default to dashboard card styling; text widgets now render as webpage content blocks and the shell centers non-dashboard content when appropriate.

- 2026-05-01: Tightened corporate/pharma rendering to use a centered webpage layout, page-family-aware section grouping, and corporate-specific hero/products/news/contact composition so the React output matches the HTML preview more closely.
2026-05-01: Removed the unsupported pageMeta.pageFamily field from normalized AI output, tightened corporate page spacing, dropped the shell content inset, and widened the builder preview container so corporate/pharma pages render closer to the HTML preview.

- Added a sandboxed HTML iframe preview path for `/aiexperiencebuilder` so the AI-produced stage 1 HTML renders faithfully instead of relying only on the lossy React reconstruction.
- Kept the structured JSON/React renderer for the builder, but made the HTML preview the primary source of truth when the model returns a webpage-style result.
- Added a React/HTML preview toggle so the builder can switch between faithful HTML rendering and the compiled React representation.
- Began replacing the old React reconstruction with a real HTML-to-React compiler path so the final React page can preserve the HTML structure and CSS instead of falling back to a generic builder approximation.
- Hardened the HTML-to-React compiler to rewrite root selectors more faithfully, reject unsupported external stylesheets/scripts/embedded frames, and keep React preview strict without iframe fallback.
- The React preview root now behaves like a full-bleed page surface instead of a centered card, which reduces the inset look on compiled pages.
- The Create New Page modal now exposes Plain HTML and Rich HTML with JS modes, and rich mode captures a structured interaction spec for buttons, tabs, forms, charts, and dynamic behavior.
- The stage 1 and stage 2 prompt builders now receive the selected content mode and interaction spec, so the AI can generate React-friendly output from the richer brief.
- The main Experience Builder page now shows ellipsis affordances on empty section placeholders and on header/footer/left/right shell chrome so users can assign objects directly from the canvas.
- Shell chrome edits now persist a lightweight shellChrome config on the page record, with a dedicated shell options dialog for header/footer/menu placeholder content.
- Stage 1 AI generation errors now return serialized backend details, including stage, status, statusText, code, syscall, address, port, and nested cause information when available.
- The AI Experience Builder alert now renders the backend error details with line breaks so intermittent `fetch failed` cases can be diagnosed from the UI.

## 2026-05-03

- Fixed the `/aiexperiencebuilder` shell-header path so header-like clicks open the reusable header modal instead of generic section options.
- Normalized AI header logo handling across `logoUrl` and `logoImageUrl`, and forced edited headers visible so uploaded logos render in the React preview.
- Replaced the generated top dashboard strip in both preview modes with a logo-only header strip and ellipsis control so the selected header does not stack above the AI content.
- Corrected the preview wiring after rolling back the overlay approach: HTML preview now stays raw and does not inject a dummy header/logo strip, while React preview now renders the spec-driven `AppShell` path so the edited header settings apply to the actual header strip and logo.
- Restored chart/table ellipsis controls in the React preview by forwarding widget options through the dashboard `SectionRenderer`, and made the React header logo render from the canonical `logoImageUrl` field with broken-image suppression.
- Chart and table widgets now persist selected table metadata into the live AI page spec (`tableName`, `dataTable`, `columns`, and `dataRows`) so the React preview renders real rows instead of empty placeholders.

## 2026-05-05

- Added a default shadow treatment to legacy Experience Builder section cards and exposed a Configure Page toggle to add or remove that shadow per page.
- Removed the extra canvas wrapper padding around Experience Builder cards so the card area sits flush without the left/top gutter.
- Moved the Experience Builder canvas badge into the fixed header area and removed the old floating badge drag state from the body canvas.
- Made the Experience Builder canvas toolbar draggable again, but constrained it to the fixed header region instead of the canvas body.
- Removed the horizontal divider lines between Experience Builder cards so adjacent cards no longer show an emphasized separator.
- Removed the remaining outer shell and canvas borders so the cards no longer sit inside a framed container.
- Tightened the Experience Builder card shadow to a sharper, lower-blur shadow.
- Added placeholder ellipsis buttons for the header, footer, left menu, and right menu shell regions in the legacy Experience Builder.
- Added reusable shell option modals for header, footer, and menu slots, backed by `shellChrome` on the page record.
- Legacy table widgets now render a search box, row-number column, and prev/next paging controls in the Experience Builder canvas.
- Legacy table widgets now show an explicit empty state when search filters remove all rows.
- Legacy table widgets now include a selectable rows-per-page control in the table footer.
- The legacy table widget search box is now right-aligned and capped at 20% width.
- Fixed the Experience Builder save route to use `pool.query` instead of the undefined `client.query`, which was causing the `client is not defined` error on save.
- Scaffolded the new `aiappbuilder` module with an AI schema generator, cust_ table creation, and generic JSONB CRUD APIs.

## 2026-05-06

- Began the AI App Builder module for one-page CRUD applications: backend schema generation, `cust_` table creation, and a schema-driven React builder shell.
- Added the Business Automation tile for AI App Builder and introduced a schema review step so generated AI output can be edited before creating the application and database table.
- Tightened the OpenAI `json_schema` response format for AI App Builder so object schemas explicitly set `additionalProperties: false`, fixing the schema validation error from the AI response format.
- Updated the AI App Builder `validations` schema so all declared properties are required, matching OpenAI strict schema validation rules.
- Updated the AI App Builder `fields[].validation` schema so `minLength`, `maxLength`, `min`, and `max` are all explicitly required for strict `json_schema` validation.
- Expanded the AI App Builder `fields` item schema so every declared field property is included in `required`, and made the root schema `required` list explicit for strict OpenAI validation.
- Hardened the AI App Builder OpenAI response parsing so it falls back to the heuristic schema when the structured response is empty and throws a clearer error for invalid JSON.
- Reworked the AI App Builder OpenAI call to read the raw response body first, avoiding `Unexpected end of JSON input` when the upstream body is empty or non-JSON.
- Standardized AI App Builder transaction rows to use `id` as the primary key and added audit columns (`date_created`, `created_by`, `date_modified`, `modified_by`) to each generated `cust_*` table.
- Updated the AI App Builder table to surface only `date_created` and `created_by`, and restyled the create/edit modal into a booking-style two-column form with time-picker support.
- Added booking validation support to AI App Builder so `unique_combination` rules can reject duplicate room/date/time slot bookings, and automatic audit fields are kept out of generated user-input schemas.
- Refined the AI App Builder booking modal styling to match the provided sample more closely by narrowing the dialog, softening the color treatment, and reducing the visual intensity of inputs and actions.
- Restyled the AI App Builder records table to match the provided booking list sample with a lighter card shell, dark navy header row, right-aligned search and create button, pill status badges, outlined row actions, and a tighter pagination footer.
- Expanded AI App Builder validation support to carry `uniqueRules`, `overlapRules`, and `dependencies` in the schema, with backend enforcement for required fields, date/time rules, unique booking combinations, and overlapping slot prevention.
- Replaced the simple Create New Application prompt with an advanced field and validation builder modal inspired by the provided HTML reference, including field cards, dependency rules, validation rules, and table settings that feed the AI schema generator.

## 2026-05-09

- Added `tenant_id` handling to AI App Builder so `aiappbuilder_applications` and generated `cust_*` tables store the logged-in user's tenant id on create and return it in record payloads.
- Added backup and migration scripts under `server/scripts/` to export tables missing `tenant_id` before applying the column change with an explicit `--apply` step.
- Expanded the backup script to snapshot all non-system public application tables, then reran the backup successfully.

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
- Moved dashboard generation validation behind normalization so default dashboard table/card/chart/widget values are applied before submit-time checks, preventing empty chart arrays from being saved.
- Fixed the server-side dashboard builder-spec path so empty `fields` no longer discard dashboard specs; dashboard apps now preserve `dashboardConfig` even when the app is intentionally fields-free.
- Fixed dashboard runtime data loading so `/:appSlug/records` returns a table-keyed payload for dashboard apps and the renderer consumes `dashboardConfig.sourceTables` per widget instead of reusing one table's rows for every card and chart.
- Fixed dashboard record normalization so source-table columns are preserved on dashboard rows and KPI/chart widgets can aggregate top-level fields like `tenant_id` and `is_active` instead of dropping them during normalization.
- Fixed the AI App Builder builder shell so dashboard `records` objects no longer crash the local `records.map(...)` memo when published dashboard routes return keyed table payloads.
- Added per-widget customization controls to the dashboard renderer so cards, charts, and tables can be edited inline for title, table, metric/chart fields, colors, and other widget settings in the live view.
- Added remove controls for dashboard widgets so cards, charts, and tables can be deleted from the live dashboard view from both the widget header and the settings dialog.
- Added a dashboard schema save action so live widget edits and removals can be persisted back to `aiappbuilder_applications.schema_json` from the published dashboard view.
- Added a `Save Changes` action beside `Publish` on the AI App Builder app cards for dashboard applications so schema changes can be persisted from the application list view as well.
- Synced live dashboard widget edits back into the selected schema state so the app-card `Save Changes` action now persists the edited dashboard instead of the stale original schema.
- Updated the dashboard schema normalizer to preserve extra widget properties like style and size so saved color palette and widget customizations are not stripped on write.
- Moved the dashboard `Save Changes` action out of the published dashboard header so it only appears beside `Publish` on the AI App Builder application cards below search applications.
- Restored the `Save Changes` button on dashboard app cards below search applications in AI App Builder so it is visible beside `Publish` again.
- Re-linked the dashboard renderer's live widget state back to the parent schema state so the app-card `Save Changes` button writes the edited dashboard rather than the stale schema snapshot.
## 2026-06-20

- Compared the local repo against EC2 and synced only the missing Experience Builder tree plus the four requested frontend files that had drifted.
- Confirmed the live Experience Builder page was stale because the EC2 client image still served an older bundle, not because of nginx.
- Rebuilt the EC2 client container successfully after temporarily resizing the instance from `t3.medium` to `t3.large` to avoid build-time OOM failures.
- Verified the rebuilt client image now contains `main.e5ad7c09.js` and `main.17067683.css`.
- Left the API image untouched because the remaining server-side Experience Builder route file was still out of sync on EC2 and was not part of the approved sync scope.
- Found the true production serving path: host nginx serves `/home/ubuntu/apps/00_TechtangoRJS/client/build`, not the Docker client container.
- Copied the rebuilt client bundle into the host nginx document root and reloaded nginx so `Augmis.com/experiencebuilder` now serves `main.e5ad7c09.js`.
- Synced `server/routes/experiencelayouts.js` to EC2 and rebuilt/recreated the API container so the remaining Experience Builder route drift is also resolved.
- Re-verified the live production HTML and bundle on `Augmis.com` and confirmed the deployed `main.e5ad7c09.js` contains the same Experience Builder modal strings as the local `ExperienceBuilder.jsx` source, including `Two Column`, `Three Column`, `Dense Builder`, and `Create New Page`.
- Concluded the current issue is not an nginx transform problem or a missing client build sync; the live code and local source are aligned at the modal level, so any remaining difference is likely page state or database content rather than file drift.
- Accepted the new EC2 access path via EC2 Instance Connect using the temporary `techtango-temp` key, synced the current local `client`, `server`, and `deploy` code to `/home/ubuntu/apps/00_TechtangoRJS`, rebuilt the API container, and verified `Augmis.com/experiencebuilder` now serves `main.b9115a2d.js` and `main.2ef80f6e.css`.
- Left the existing production env files untouched and did not change host nginx configuration; the only production changes were the code sync and rebuilt app artifacts.
