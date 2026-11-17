# Working with the view animations

The views use [GSAP](https://gsap.com/docs/v3/) and [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/). Both are installed through npm and served locally. There are no API calls in the animation layer.

## Where to look

- `views/partials/head.ejs` loads the libraries, then the existing interaction script, then `motion.js`. Deferred scripts execute in this order.
- `public/javascripts/motion.js` defines shared entrances, scroll reveals, dialog feedback, and hover motion.
- `public/javascripts/portal.js` owns form and navigation behavior. It dispatches `portal:open` and `portal:feedback` events for the animation layer to observe.
- `scripts/copy-vendor.js` refreshes local assets before `npm run dev:views`. Run `npm run assets:vendor` after changing the dependency version for other entry points.

## Follow this pattern

GSAP's `from()` animates from a starting appearance to the element's existing CSS appearance. `stagger` offsets each item's start. `clearProps` releases the temporary inline styles when the animation finishes.

```js
// Inside the existing no-preference matchMedia callback in motion.js:
gsap.from(".your-new-card", {
  opacity: 0,
  y: 16,
  duration: 0.65,
  stagger: 0.08,
  ease: "power2.out",
  clearProps: "opacity,transform",
  scrollTrigger: {
    trigger: ".your-new-section",
    start: "top 94%",
    once: true,
  },
});
```

Prefer adding a new card inside an existing `.course-grid`, `.stats-grid`, or `.three-grid`; it will receive the shared stagger automatically. Avoid registering another tween on those same targets, because competing animations can overwrite one another.

The [GSAP matchMedia pattern](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>) automatically reverts the animations created inside it when the media query stops matching. Event-triggered animations are registered with `context.add()` so they are also tracked for cleanup. Hover listeners are removed by the callback's returned cleanup function.

Keep database queries and `res.render()` in your controllers. Animation code only runs in the browser after Express has rendered the EJS page.
