// Shared GSAP choreography for every EJS view. No API requests or data changes.
// The library owns timelines, easing, staggering, scroll triggers, and cleanup.
(() => {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return; // All content and controls still work.
  gsap.registerPlugin(ScrollTrigger);

  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", (context) => {
    const select = gsap.utils.toArray;
    const enter = (selector, options = {}) => {
      const elements = select(selector);
      if (!elements.length) return;
      return gsap.from(elements, {
        opacity: 0,
        y: 12,
        duration: 0.45,
        stagger: 0.05,
        ease: "power3.out",
        clearProps: "opacity,transform",
        ...options,
      });
    };

    // A short arrival sequence leads the eye from context to the primary action.
    enter(".landing-nav, .topbar", { y: -8, duration: 0.4 });
    enter(
      ".page-heading > *, .detail-hero > *, .auth-form-wrap > *, .landing-hero > div:first-child > *",
      {
        delay: 0.05,
        stagger: 0.05,
      },
    );
    enter(".welcome-banner, .catalog-banner, .hero-photo, .auth-story-copy", {
      delay: 0.10,
      y: 16,
      duration: 0.55,
    });

    // Reveal only when a group enters the viewport. No CSS hides content first.
    const groups = select(
      ".stats-grid, .course-grid, .three-grid, .content-split, .week-grid",
    );
    const grouped = new Set(
      groups.flatMap((group) => Array.from(group.children)),
    );
    const standalone = select(
      ".panel, .section-heading, .showcase-heading",
    ).filter(
      (element) =>
        !grouped.has(element) &&
        !groups.some((group) => group.contains(element)),
    );
    [...groups, ...standalone].forEach((element) => {
      const targets = groups.includes(element)
        ? Array.from(element.children)
        : [element];
      gsap.from(targets, {
        opacity: 0,
        y: 12,
        duration: 0.4,
        stagger: { amount: 0.2 },
        ease: "power2.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 94%", once: true },
      });
    });

    // Animate details where they become visible, including long schedules and reports.
    for (const element of select("[data-arrival]")) {
      gsap.from(element, {
        opacity: 0,
        y: 8,
        duration: 0.32,
        ease: "power2.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 98%", once: true },
      });
    }
    for (const result of select("[data-result-cue]")) {
      gsap.fromTo(result, { boxShadow: "0 0 0 2px var(--accent-text)" }, {
        boxShadow: "0 0 0 2px transparent", duration: 0.65, clearProps: "boxShadow",
        scrollTrigger: { trigger: result, start: "top 94%", once: true },
        immediateRender: false,
      });
    }
    for (const check of select("[data-registration-notice] .icon")) {
      gsap.from(check, { scale: 0.65, duration: 0.2, ease: "back.out(1.5)", clearProps: "transform" });
    }

    context.add("openMenu", () => {
      enter(".sidebar .nav-item", { y: 0, x: -6, duration: 0.22, stagger: { amount: 0.12 }, overwrite: true });
    });
    document.addEventListener("portal:menu", context.openMenu);

    // Dialogs and popovers share the same entrance.
    context.add("openDialog", (event) => {
      gsap.from(event.target, {
        opacity: 0, y: 12, scale: 0.98, duration: 0.28, ease: "power2.out",
        overwrite: true, clearProps: "opacity,transform",
      });
    });
    document.addEventListener("portal:open", context.openDialog);

    // Feedback appears with its message, rather than animating the form's layout.
    context.add("showFeedback", (event) => {
      gsap.fromTo(
        event.target,
        { opacity: 0, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          overwrite: true,
          clearProps: "opacity,transform",
        },
      );
    });
    document.addEventListener("portal:feedback", context.showFeedback);

    // Hidden/revealed elements must become readable immediately on keyboard focus.
    const focusTarget = (event) => {
      let element = event.target;
      while (element && element !== document.body) {
        const tweens = gsap.getTweensOf(element);
        tweens.forEach((tween) => {
          if (tween.progress() < 1) tween.progress(1);
        });
        element = element.parentElement;
      }
    };
    document.addEventListener("focusin", focusTarget);
    return () => {
      document.removeEventListener("portal:menu", context.openMenu);
      document.removeEventListener("portal:open", context.openDialog);
      document.removeEventListener("portal:feedback", context.showFeedback);
      document.removeEventListener("focusin", focusTarget);
    };
  });

  // Pointer animation is confined to decorative icons, preserving target bounds.
  media.add(
    "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
    () => {
      const listeners = [];
      gsap.utils
        .toArray(".course-card, .portal-card, .button, .round-link")
        .forEach((control) => {
          const artwork = control.querySelector(
            ".mini-icon, .icon",
          );
          if (!artwork) return;
          const isCard = control.matches(".course-card, .portal-card");
          const move = gsap.quickTo(artwork, isCard ? "y" : "x", {
            duration: 0.3,
            ease: "power2.out",
          });
          const onEnter = () => move(isCard ? -4 : 3);
          const onLeave = () => move(0);
          control.addEventListener("pointerenter", onEnter);
          control.addEventListener("pointerleave", onLeave);
          listeners.push(() => {
            control.removeEventListener("pointerenter", onEnter);
            control.removeEventListener("pointerleave", onLeave);
          });
        });
      return () => listeners.forEach((remove) => remove());
    },
  );

  // Keep BFCache restores usable; the browser restores the scroll position itself.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) ScrollTrigger.refresh();
  });
})();
