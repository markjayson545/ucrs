// Exercise actual Express rendering and follow every internal link without MongoDB.
const assert = require("node:assert/strict");
const app = require("../app")({ preview: true });
const server = app.listen(0, "127.0.0.1", async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const queue = ["/", "/preview/forbidden"];
  const visited = new Set();
  try {
    while (queue.length) {
      const path = queue.shift();
      if (visited.has(path)) continue;
      visited.add(path);
      const response = await fetch(base + path);
      assert.equal(
        response.status,
        path === "/preview/forbidden" ? 403 : 200,
        path,
      );
      const html = await response.text();
      assert.match(response.headers.get("content-type"), /text\/html/, path);
      assert.match(html, /<main\b/, path);
      assert.match(html, /data-theme-toggle\b/, path);
      assert.match(html, /id="appearance-dialog"/, path);
      assert.doesNotMatch(html, /<%|undefined|ReferenceError/, path);
      if (/^\/(student|faculty|admin|account)(\/|\?|$)/.test(path) && response.status === 200) {
        assert.match(html, /<details[^>]*data-profile-menu/, path);
      }
      for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) {
        if (!/\.(css|js|svg|webp)$/.test(href) && !visited.has(href))
          queue.push(href);
      }
      if (html.includes("data-preview-form")) {
        assert.match(html, /data-preview-form[^>]*inert/, path);
        assert.doesNotMatch(html, /action="\/api\//, path);
      }
    }
    assert.ok(
      visited.size >= 31,
      `Expected all preview pages, got ${visited.size}`,
    );
    for (const path of [
      "/catalog/courses/missing",
      "/admin/courses/missing/edit",
      "/faculty/sections/missing/roster",
      "/student/missing",
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404, path);
      assert.match(await response.text(), /Page not found/);
    }
    const empty = await fetch(base + "/catalog/courses?q=does-not-exist");
    assert.match(await empty.text(), /No courses found/);
    const search = await fetch(
      base + "/catalog/courses?q=Linear&department=Mathematics",
    );
    const searchHtml = await search.text();
    assert.match(searchHtml, /Linear Algebra/);
    assert.doesNotMatch(searchHtml, /Introduction to Computing/);
    const escaped = await fetch(
      base +
        "/catalog/courses?q=" +
        encodeURIComponent("<script>alert(1)</script>"),
    );
    assert.doesNotMatch(await escaped.text(), /<script>alert/);
    for (const path of [
      "/stylesheets/portal.css",
      "/stylesheets/theme.css",
      "/stylesheets/public-pages.css",
      "/javascripts/appearance.js",
      "/javascripts/showcase.js",
      "/javascripts/portal.js",
      "/javascripts/motion.js",
      "/images/campus-courtyard.webp",
      "/images/library-study.webp",
      "/images/teaching-studio.webp",
      "/images/showcase/student-schedule.webp",
      "/images/showcase/faculty-gradebook.webp",
      "/images/showcase/admin-reports.webp",
      "/vendor/gsap/gsap.min.js",
      "/vendor/gsap/ScrollTrigger.min.js",
    ]) {
      assert.equal((await fetch(base + path)).status, 200, path);
    }
    const previewWrite = await fetch(base + "/auth/register", { method: "POST" });
    assert.equal(previewWrite.status, 404);
    console.log(
      `PASS: ${visited.size} linked preview pages, filters, escaping, error pages, and browser assets.`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
