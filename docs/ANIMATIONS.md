# Working with the view animations

[The shared head](../views/partials/head.ejs) loads GSAP, ScrollTrigger, `portal.js`, and `motion.js` in that order. The libraries are copied from npm to `public/vendor/gsap` by [copy-vendor.js](../scripts/copy-vendor.js) before the app or preview starts.

## Where to edit

| Effect | File and hook |
| --- | --- |
| Page headings, welcome art, and staged card entrances | [motion.js](../public/javascripts/motion.js) uses the existing CSS class names |
| A class meeting or an enrollment confirmation entering view | `motion.js` looks for `data-arrival` |
| A seat-occupancy meter entering view | `motion.js` looks for `data-meter` |
| Dialog, mobile navigation, search empty state, or a newly added meeting | [portal.js](../public/javascripts/portal.js) updates the element, then dispatches `portal:open`, `portal:menu`, or `portal:feedback` |
| Workspace screenshot change | [showcase.js](../public/javascripts/showcase.js) activates the selected tab, then dispatches `portal:feedback` on the new panel |
| Submit spinner, button press, mobile drawer and backdrop | [portal.css](../public/stylesheets/portal.css) styles the browser state |

## Reuse an effect

Add `data-arrival` to an EJS element that should enter as it scrolls into view. The existing scroll trigger uses opacity and a short vertical offset and plays once.

```ejs
<article class="section-option" data-arrival>
  <h3>Section <%= section.sectionCode %></h3>
</article>
```

For content that appears after a click or another browser event, update the element first and dispatch the same feedback event used by the meeting form.

```js
feedback.textContent = message;
feedback.hidden = false;
feedback.dispatchEvent(new Event('portal:feedback', { bubbles: true }));
```

GSAP starts the effect after the content is ready. This keeps the display, form submission, and server response independent of animation timing. The CSS and JavaScript honor `prefers-reduced-motion`. Keyboard focus also finishes an entrance immediately when it reaches an animated control.

## Follow the theme toggle

[appearance-trigger.ejs](../views/partials/appearance-trigger.ejs) renders both icons. CSS displays the sun in Light mode and the moon in Dark mode. The button reports whether Dark mode is on, and the Appearance dialog still offers System mode and the accent choices.

[appearance.js](../public/javascripts/appearance.js) calculates a radius that reaches the farthest corner from where you clicked or tapped. Keyboard activation starts the circle at the button’s center. The script applies the new mode in the View Transition update callback and saves it after the animation settles. Leaving the page mid-transition also saves the selection.

[theme.css](../public/stylesheets/theme.css) expands the incoming Dark view or contracts the outgoing Dark view over 420 ms. The page capture and the icon animate separately. Regular control color transitions pause so the new theme is fully painted when the circle starts. With reduced motion or a browser that lacks View Transitions, the theme switches instantly. [View Transitions guide](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)

TweakCN’s button passes the click position to its provider, and its global stylesheet animates the incoming snapshot. [Toggle button](https://github.com/jnsahaj/tweakcn/blob/main/components/theme-toggle.tsx) · [Theme provider](https://github.com/jnsahaj/tweakcn/blob/main/components/theme-provider.tsx#L45-L65) · [Reveal CSS](https://github.com/jnsahaj/tweakcn/blob/main/app/globals.css#L93-L124)
