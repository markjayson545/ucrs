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
        y: 16,
        duration: 0.65,
        stagger: 0.07,
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
        delay: 0.08,
        stagger: 0.09,
      },
    );
    enter(".welcome-banner, .catalog-banner, .hero-art, .auth-story > div", {
      delay: 0.14,
      y: 22,
      duration: 0.85,
    });
    enter(".welcome-art .art-book, .hero-art .arch, .auth-art span", {
      delay: 0.3,
      y: 24,
      duration: 1.1,
      stagger: 0.12,
    });

    // Reveal only when a group enters the viewport. No CSS hides content first.
    const groups = select(
      ".stats-grid, .course-grid, .three-grid, .dashboard-grid, .content-split, .week-grid",
    );
    const grouped = new Set(
      groups.flatMap((group) => Array.from(group.children)),
    );
    const standalone = select(
      ".panel, .section-heading, .landing-portals > .row-between",
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
        y: 18,
        duration: 0.65,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 94%", once: true },
      });
    });

    // Dialog focus/semantics remain native; GSAP adds a brief spring entrance.
    const dialog = document.querySelector("#preview-dialog");
    context.add("openDialog", () => {
      gsap.fromTo(
        dialog,
        { opacity: 0, y: 18, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.38,
          ease: "back.out(1.25)",
          overwrite: true,
          clearProps: "opacity,transform",
        },
      );
    });
    dialog?.addEventListener("portal:open", context.openDialog);

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
          if (tween.scrollTrigger || tween.isActive()) tween.progress(1);
        });
        element = element.parentElement;
      }
    };
    document.addEventListener("focusin", focusTarget);
    return () => {
      dialog?.removeEventListener("portal:open", context.openDialog);
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
            ".course-art > .icon, .mini-icon, .icon",
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
