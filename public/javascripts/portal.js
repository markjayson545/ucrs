// Presentation interactions only. This file makes no API requests.
(() => {
  const menu = document.querySelector("[data-menu]");
  const sidebar = document.querySelector("#sidebar");
  const mobile = window.matchMedia("(max-width: 760px)");
  const syncNavigation = () => {
    if (sidebar)
      sidebar.inert =
        mobile.matches && !document.body.classList.contains("menu-open");
  };
  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    menu?.setAttribute("aria-expanded", "false");
    syncNavigation();
  };
  menu?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menu.setAttribute("aria-expanded", String(open));
    syncNavigation();
  });
  mobile.addEventListener("change", closeMenu);
  syncNavigation();
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      closeMenu();
      menu?.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#sidebar, [data-menu]")) closeMenu();
  });
  document
    .querySelector("[data-workspace]")
    ?.addEventListener("change", (e) => {
      window.location.assign(e.target.value);
    });
  document.querySelectorAll("[data-password]").forEach((button) =>
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.password);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password",
      );
      button.setAttribute("aria-pressed", String(show));
    }),
  );
  const dialog = document.querySelector("#preview-dialog");
  const showPreview = (message) => {
    if (!dialog) return;
    dialog.querySelector("[data-dialog-message]").textContent = message;
    dialog.showModal();
    dialog.dispatchEvent(new Event("portal:open"));
  };
  document
    .querySelectorAll("[data-preview-action]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        showPreview(
          button.dataset.message ||
            "This is a design preview. No changes have been saved.",
        ),
      ),
    );
  document.querySelectorAll("[data-preview-form]").forEach((form) => {
    form.removeAttribute("inert");
    // Without JS, disable submit rather than allowing default GET to leak fields.
    form.querySelectorAll('button[type="submit"]').forEach((button) => {
      button.disabled = false;
    });
    const start = form.querySelector('[name="start"]');
    const end = form.querySelector('[name="end"]');
    const validateTime = () => {
      if (start && end)
        end.setCustomValidity(
          end.value <= start.value
            ? "End time must be later than start time."
            : "",
        );
    };
    start?.addEventListener("input", validateTime);
    end?.addEventListener("input", validateTime);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      validateTime();
      if (!form.reportValidity()) return;
      const message =
        form.dataset.message ||
        "Preview complete. No changes have been saved and no information was sent.";
      const feedback = form.querySelector(".form-feedback");
      if (feedback) {
        feedback.textContent = message;
        feedback.hidden = false;
        feedback.dispatchEvent(new Event("portal:feedback", { bubbles: true }));
      }
      showPreview(message);
    });
    form.addEventListener("reset", () => {
      const feedback = form.querySelector(".form-feedback");
      if (feedback) feedback.hidden = true;
      if (end) end.setCustomValidity("");
    });
  });
  document.querySelectorAll("[data-table-search]").forEach((input) =>
    input.addEventListener("input", () => {
      const rows = document.querySelectorAll(
        `#${input.dataset.tableSearch} tbody tr`,
      );
      let visible = 0;
      rows.forEach((row) => {
        row.hidden = !row.textContent
          .toLowerCase()
          .includes(input.value.trim().toLowerCase());
        if (!row.hidden) visible++;
      });
      const empty = document.querySelector(
        `[data-empty-for="${input.dataset.tableSearch}"]`,
      );
      if (empty) empty.hidden = visible > 0;
    }),
  );
})();
