# Experience Builder V2 AI Plan

This document defines the AI-first Experience Builder V2 flow.

Working note:
- When a technical term is used imprecisely, I should correct it explicitly so the implementation stays aligned with the actual architecture and UI vocabulary.

Implementation status:
- Client-side V2 modules now exist under `client/src/pages/businessautomation/experiencebuilder/v2/`.
- The AI generation endpoint is mounted at `/api/experiencebuilder-ai/generate`.
- The V2 create flow now opens the AI designer panel, generates a strict page spec, previews it, and only then creates the page record.

## Why not free-form HTML

Free-form HTML is possible, but it is the wrong primary contract for this builder.

Reasons:
- The builder must remain editable after generation.
- Widgets, rows, sections, and shell chrome need to stay structured so the UI can reopen them later.
- Validation is much easier on a structured spec than on arbitrary HTML/CSS.
- Publishing, diffing, and revision history are more reliable when the page is saved as data.
- Free-form HTML makes it harder to map the AI result back into the existing widget/section system.

Recommended approach:
- Let the AI generate a structured page spec.
- Validate the spec.
- Preview the spec.
- Only then commit it into the Experience Builder page model.
- The renderer can still compile the spec into HTML-like output for display, but the saved source should remain structured data.

## Why a strict schema is needed

A strict schema means the AI must return a predictable JSON object with known keys, types, and allowed values.

This is necessary because:
- The page renderer needs exact field names to build sections, widgets, and chrome.
- The preview step needs to know whether the response is safe and complete.
- Validation can reject malformed or partial AI output early.
- The history/revision log can store clean, comparable versions of the same shape.
- The system can evolve without breaking old pages if the schema is versioned.

Strict schema rules:
- Top-level output must be JSON only.
- No markdown fences.
- No extra prose.
- No unknown keys unless explicitly allowed.
- Every widget must conform to a known widget schema.
- Every section must conform to a known section schema.
- Any schema violation should throw an error and stop the flow.

## V2 Designer Input Form Fields

### 1. Page Intent
- Page name
- Page purpose
- Target audience
- Industry / domain
- Tone
- Design style
  - Modern
  - Business
  - Professional
  - IT
  - Minimal
  - Dashboard
  - Landing
  - Editorial

### 2. Shell / Chrome
- Show top navbar
- Show fixed header
- Show footer
- Show bottom bar
- Show left menu
- Show right menu
- Left menu collapsible
- Right menu collapsible
- Collapse trigger style
  - Arrow
  - Ellipsis
  - Icon button
- Fixed vs sticky vs static behavior for header/footer/menus
- Show breadcrumbs
- Show utility icons
- Show page title
- Show brand name
- Show tagline
- Logo text
- Logo image upload
- Shell padding
- Content width mode
  - Full width
  - Centered
  - Fixed max width

### 3. Layout Structure
- Number of sections
- Rows per section
- Columns per row
- Section height
- Section spacing
- Section padding
- Section border
- Section radius
- Row density
- Canvas spacing
- Full width canvas
- Split layout presets
  - Sidebar + main
  - Header + content + footer
  - Dashboard
  - Form-heavy
  - Content-heavy

### 4. Widgets
- Widget type selection
  - Chart
  - Table
  - Text Block
  - Image
  - Icon
  - KPI
  - Form
  - Synced Block
  - Template Part
- Widget placement target
- Widget order
- Widget width
- Widget height
- Widget alignment
- Widget padding
- Widget background
- Widget border
- Widget radius

### 5. Chart Widget Inputs
- Data table
- Chart type
  - Bar
  - Horizontal bar
  - Line
  - Pie
  - Doughnut
- Chart name
- X axis column
- Y axis column
- Aggregation
  - actual
  - count
  - avg
  - sum
- Legend position
- Theme color

### 6. Table Widget Inputs
- Data table
- Row limit
- Column selection
- Sort order
- Empty state text
- Compact mode

### 7. Text Block Inputs
- Manual text
- AI-generated text prompt
- Text style
- Font size
- Text color
- Bold
- Italic
- Underline

### 8. Image Widget Inputs
- Upload image
- Image URL
- Fit mode
  - contain
  - cover
- Position
  - center
  - top-left
  - top-center
  - top-right
  - left
  - right
  - bottom-left
  - bottom-center
  - bottom-right

### 9. Icon Widget Inputs
- Icon text or icon key
- Icon color
- Icon size

### 10. AI Styling Inputs
- Primary color
- Accent color
- Background color
- Neutral color
- Border color
- Card shadow style
- Corner radius
- Spacing density
- Typography tone

### 11. Behavior Inputs
- Responsive breakpoints
- Desktop/tablet/mobile preview
- Menu collapse behavior
- Sticky header behavior
- Sticky footer behavior
- Scroll behavior
- Scroll container
- Widget visibility by device

## AI Output JSON Schema

Top-level object:

```json
{
  "schemaVersion": "v2.0",
  "pageMeta": {},
  "theme": {},
  "shell": {},
  "layout": {},
  "widgets": [],
  "behaviors": {},
  "generation": {}
}
```

### 1. `schemaVersion`
- Type: string
- Required: yes
- Example: `v2.0`

### 2. `pageMeta`
- `name`: string
- `description`: string
- `style`: enum
  - modern
  - business
  - professional
  - it
  - minimal
  - dashboard
  - landing
  - editorial
- `domain`: string
- `audience`: string

### 3. `theme`
- `brandName`: string
- `tagline`: string
- `logoText`: string
- `primaryColor`: string
- `accentColor`: string
- `backgroundColor`: string
- `fontFamily`: string
- `density`: enum
  - compact
  - normal
  - spacious

### 4. `shell`
- `topNavbar`: object
- `header`: object
- `footer`: object
- `bottomBar`: object
- `leftMenu`: object
- `rightMenu`: object

Each shell object should support:
- `enabled`: boolean
- `behavior`: enum
  - static
  - sticky
  - fixed
- `collapsible`: boolean
- `collapsedByDefault`: boolean
- `toggleStyle`: enum
  - arrow
  - ellipsis
  - icon
- `height`: number
- `width`: number
- `padding`: number
- `content`: string

### 5. `layout`
- `canvasMode`: enum
  - fullWidth
  - centered
  - fixed
- `sections`: array

Each section:
- `id`: string
- `name`: string
- `row`: number
- `columns`: number
- `height`: number
- `padding`: object
- `gap`: number
- `style`: object
- `widgets`: array

Each widget in a section:
- `id`: string
- `type`: enum
  - chart
  - table
  - text
  - image
  - icon
  - kpi
  - form
  - syncedBlock
  - templatePart
- `title`: string
- `position`: object
- `config`: object

### 6. `widgets`
This can be a normalized widget registry, useful for lookups and revision logging.

Each widget entry:
- `id`
- `type`
- `sourceSectionId`
- `config`
- `deviceVisibility`

### 7. `behaviors`
- `responsiveBreakpoints`: object
- `previewModes`: array
- `sectionHoverControls`: boolean
- `menuCollapseOnMobile`: boolean
- `headerStickyOnScroll`: boolean
- `footerSticky`: boolean
- `canvasScrollable`: boolean
- `widgetDragEnabled`: boolean
- `widgetResizeEnabled`: boolean

### 8. `generation`
- `promptId`: string
- `model`: string
- `generatedAt`: ISO timestamp
- `inputHash`: string
- `revisionNotes`: string
- `source`: string

## Prompt Structure

The AI prompt should have three parts.

### 1. System prompt
Rules:
- Return JSON only.
- Follow the schema exactly.
- Do not invent unsupported fields.
- If input is insufficient, return an error object.
- Prefer builder-safe structures over raw HTML.

### 2. Developer prompt
Responsibilities:
- Explain the builder model.
- Explain the available shell, layout, widget, and behavior options.
- Explain allowed enum values.
- Explain that the output must be renderable by the V2 builder.
- Explain that invalid output should be rejected.

### 3. User prompt
The user will provide:
- page intent
- selected design style
- shell options
- widget choices
- chart/table/widget configs
- image/text/icon inputs
- branding inputs
- behavior preferences

### 4. Expected AI task
The AI should:
- synthesize the inputs into a coherent layout
- place widgets into sections
- choose spacing and density that match the selected style
- apply shell chrome configuration
- produce a valid JSON document

## Builder Functions That Will Consume the AI Output

The V2 builder should be split into helper functions.

### 1. Input collection
- `buildDesignerInputPayload(formState)`
- `normalizeDesignerInput(formState)`
- `validateDesignerInput(payload)`

### 2. AI request
- `buildAIPrompt(payload)`
- `requestAIPageSpec(promptPayload)`
- `parseAIPageSpec(responseText)`

### 3. Validation
- `validatePageSpecSchema(pageSpec)`
- `validateShellSpec(shell)`
- `validateSectionSpec(section)`
- `validateWidgetSpec(widget)`
- `validateBehaviorSpec(behaviors)`

### 4. Preview
- `buildPreviewFromPageSpec(pageSpec)`
- `renderPreviewSections(pageSpec)`
- `renderPreviewWidgets(pageSpec)`
- `renderPreviewShell(pageSpec)`

### 5. Commit / save
- `commitAIPageSpec(pageSpec)`
- `saveDraftPage(pageSpec)`
- `publishPageSpec(pageSpec)`
- `storeRevision(pageSpec)`

### 6. Revision log
- `recordGenerationRevision(pageSpec, inputPayload, status)`
- `listGenerationRevisions(pageId)`
- `restoreGenerationRevision(revisionId)`

## Error Handling

If the AI output is malformed:
- throw an error
- show the error in the UI
- do not auto-fallback to a template
- do not silently sanitize into a different design

If the AI output is valid JSON but fails schema checks:
- reject it
- show validation errors
- allow the user to fix the inputs and retry

## Recommended V2 Flow

1. User clicks `Create Page`.
2. Designer input page opens.
3. User selects style, shell, widgets, and content inputs.
4. User submits.
5. AI returns structured page spec JSON.
6. System validates JSON.
7. System shows preview.
8. User confirms.
9. System commits to the page model.
10. Revision history is stored.

## Suggested Implementation Files

- `client/src/pages/businessautomation/experiencebuilder/v2/DesignerInputPanel.jsx`
- `client/src/pages/businessautomation/experiencebuilder/v2/PageSpecSchema.js`
- `client/src/pages/businessautomation/experiencebuilder/v2/pageSpecBuilder.js`
- `client/src/pages/businessautomation/experiencebuilder/v2/pageSpecValidator.js`
- `client/src/pages/businessautomation/experiencebuilder/v2/aiPromptBuilder.js`
- `client/src/pages/businessautomation/experiencebuilder/v2/revisionLog.js`
- `client/src/pages/businessautomation/experiencebuilder/v2/PagePreview.jsx`

## Final Recommendation

Yes, the requested AI page builder is feasible.

The correct approach is:
- collect structured design intent
- ask AI to generate structured JSON
- validate strictly
- preview
- save to the builder data model

That will give you a flexible AI designer without losing control of the page structure.



# Rules
Think before coding
- State Assumptions Explicitly
- Ask when confused
-  Push back on Unclear requests

Simplicity First
- Minimum code for the problem (do not write 200 lines of code what can be written in 50lines)
- No speculative features

Surgical Changes
- Touch only what's ncessary
- Match existing style
- Leave unrelated code alone

Goal-Driven Execution
- Verifiable success criteria
- Test loops, not vague tasks
- 'Fix Bugs' - Write test, make it pass


# Techtango

All-in-one app for managing proposals, meetings, workflows, and approvals.

## Features

- Modular architecture
- User authentication with JWT
- Protected routes and subscriptions
- Dynamic module loading




# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Documentation Policy Note

- Markdown files in this repository are append-only.
- Do not overwrite or replace existing `*.md` files.
- Future documentation updates must be added as new content only.
