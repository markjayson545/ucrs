# UCRS view design

UI/UX Pro Max was invoked with university registration and education dashboard queries and its HTML stack guidance. The university query's institutional navy, clear grid, serif headings, and restrained spacing fit this product. The retry returned children's typography and a marketing showcase layout; those recommendations do not fit a university workspace and were not adopted.

- Navy navigation and actions; ivory editorial panels; pale blue, sage, lavender, and ochre course artwork.
- Georgia headings with system sans-serif body text. No remote fonts, scripts, or image dependencies.
- Shared sidebar, breadcrumb, term, page heading, course cards, table, and footer partials.
- One primary action per view, visible form labels, native controls, keyboard focus, skip link, reduced motion, and accessible modal feedback.
- Desktop sidebar becomes a collapsible mobile navigation. Cards reflow; wide data tables scroll within their panel. Weekly meetings become a day-by-day list on small screens.
- Preview actions are explicit and never write to the database or call an API.

The shared CSS tokens are in `public/stylesheets/portal.css`. The EJS includes are in `views/partials`. No CSS framework or build step is needed.

## Animation library

GSAP and its ScrollTrigger plugin power the shared choreography in `public/javascripts/motion.js`: page arrivals, staggered cards, scroll reveals, decorative icon hover feedback, and native dialog entrances. The library handles easing, timelines, viewport triggers, and cleanup instead of implementing a custom animation engine.

The exact GSAP version is pinned in `package.json`. `npm run dev:views` first runs `scripts/copy-vendor.js`, which copies unmodified browser builds and their license notices into `public/vendor/gsap`. Run `npm run assets:vendor` to refresh those files manually. The checked-in assets allow the UI to run without CDN access. Upstream license notices and the terms link are preserved in the build headers and `public/vendor/gsap/NOTICE.txt`.

Content is visible without JavaScript or if GSAP fails to load. `gsap.matchMedia()` removes animation styles and listeners when reduced motion is enabled, including when changed while a page is open. Animations use transforms and opacity, finish rather than loop indefinitely, and do not delay navigation or saving. Keyboard focus completes an active reveal so a focused control remains visible.
