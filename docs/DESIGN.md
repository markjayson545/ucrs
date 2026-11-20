# Frontend design and usability

The public pages use campus photography and a capped display heading. Workspaces use 15px body text, 26–34px page titles, and 38px controls on desktop. Touch controls use a 44px minimum. The layout responds to CSS viewport width and respects Windows scaling and browser zoom. [Microsoft Fluent type ramp](https://fluent2.microsoft.design/typography) · [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) · [MDN device pixel ratio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)

## Profile menu

The avatar opens a disclosure with the signed-in identity, quick appearance controls, account settings, and sign-out. Tab moves through the controls. Escape closes the popup and returns focus to the avatar. The account page holds the profile and password forms for every role. [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)

## Appearance

Open the avatar menu or account page to switch between Light and Dark. Visitors can also switch from the home and sign-in pages. Use **Appearance** to follow the system theme or choose Clay, Teal, Indigo, Plum, or Moss. Light is the default. The preview and live app save preferences for their own browser origins.

- [theme.css](../public/stylesheets/theme.css) defines surface, text, accent, and status colors.
- [appearance.js](../public/javascripts/appearance.js) applies saved choices before paint and updates System when the device theme changes.
- [portal.css](../public/stylesheets/portal.css) styles workspace components. [public-pages.css](../public/stylesheets/public-pages.css) styles the home and account layouts using the same theme variables.
- [Animations](ANIMATIONS.md) describes motion hooks and reduced-motion behavior.

## Usability review

The review followed the upstream [UX Heuristics skill](https://github.com/wondelai/skills/tree/main/ux-heuristics) and [Jakob Nielsen’s ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). It covered browsing a course, registering or dropping a course, entering grades, managing courses, and changing appearance.

| Finding | Severity before | Change |
| --- | --- | --- |
| Oversized headings, panels, and navigation pushed the working area down on desktop. | 2 · Minor | Capped type sizes and reduced the space around tables, forms, dashboards, and the landing page. |
| Faculty and administrators lacked an account page, and sign-out and appearance lived in different places. | 3 · Major | The avatar opens the same account and quick settings menu for all roles. |
| A rejected portal save could send users to another page and clear the draft when they reopened the form. | 3 · Major | Form feedback stays beside the draft. Validation messages link to a field when it has a matching control. |
| Small text and controls made workspace navigation and dense tables harder to scan on phones. | 2 · Minor | Larger targets, more space, a visible active section, and overflow hints for wide tables. |
| Table search hid rows without showing how many matched. | 2 · Minor | Persistent search labels and a live result count. |
| Grade selections had no clear unsaved state. | 2 · Minor | The gradebook shows the selected count and enables Save when a grade is selected. |
| A generic confirmation left the effect of dropping a course or leaving a waitlist unclear. | 2 · Minor | Each confirmation names the action and describes what changes. |

**Current heuristic score** is 9/10 for the reviewed flows. Dense data tables still require horizontal scrolling on narrow screens. A prioritized mobile view for those tables would close that gap. This score comes from the heuristic and browser checks. A moderated study with students, faculty, and administrators would show how the design works for actual users.

## Showcase screenshots

The home-page gallery uses Chromium captures of the running EJS preview with fixture records. Select a role to display its screenshot, or open the full-size image.

| Screenshot | Capture route in `npm run dev:views` |
| --- | --- |
| [Student timetable](../public/images/showcase/student-schedule.webp) | `/student/schedule` |
| [Faculty gradebook](../public/images/showcase/faculty-gradebook.webp) | `/faculty/sections/section-1/grades` |
| [Admin enrollment reports](../public/images/showcase/admin-reports.webp) | `/admin/reports` |

To update these after a design change, open the fixture pages at 1440 by 850 with Light and Clay selected. Capture WebP images at the same size and keep the filename references in [index.ejs](../views/index.ejs) in sync.

## Campus photography

These illustrations of a fictional campus were generated with built-in ImageGen and saved as optimized WebP files. The product screenshots above are browser captures.

| File | ImageGen prompt |
| --- | --- |
| [campus-courtyard.webp](../public/images/campus-courtyard.webp) | Use case: photorealistic-natural. Asset type: university portal hero photograph. Create a realistic horizontal editorial photo of a modern Filipino university campus, with several Filipino college students casually walking away or side-on toward an open-air academic courtyard, sunlit sand-colored concrete and red brick arcades, deep green tropical foliage and sweeping architecture. Wide landscape 3:2, compose the most readable people and path in the middle and lower right with room to crop. Candid documentary photography, warm midday light, some pleasant shadow, nuanced film color, polished natural texture. No text, signage, logos or frames. This is a fictional university. |
| [library-study.webp](../public/images/library-study.webp) | Use case: photorealistic-natural. Asset type: university registration portal catalog and student-workspace editorial photograph. A cinematic horizontal landscape 3:2 view of a university library study table with two Filipino college students working together, notebooks and a laptop that faces away, daylight pouring through large tall windows, wooden shelves, warm honey tones and muted green. Subjects centered for both landscape and close crops. Candid eyes on their work, believable proportions, warm independent editorial photography. No visible text, logos or signage. Fictional campus. |
| [teaching-studio.webp](../public/images/teaching-studio.webp) | Use case: photorealistic-natural. Asset type: faculty and campus administration website photography. A cinematic landscape 3:2 detail of a modern Filipino university teaching studio, a Filipino professor in foreground in profile, guiding two university students around a shared seminar table near big airy windows, muted teal walls, soft warm side-light. Natural reportage, purposeful conversation, subjects grouped toward center, authentic documentary feel. No readable text, logos or watermarks. |
