// Exercise actual Express rendering and follow every internal link without MongoDB.
const assert = require("node:assert/strict");
const app = require("../app");
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
      assert.doesNotMatch(html, /<%|undefined|ReferenceError/, path);
      for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) {
        if (!/\.(css|js|svg)$/.test(href) && !visited.has(href))
          queue.push(href);
      }
      if (html.includes("data-preview-form")) {
        assert.match(html, /data-preview-form[^>]*inert/, path);
        assert.doesNotMatch(html, /action="\/api\//, path);
      }
    }
    assert.ok(
      visited.size >= 28,
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
      assert.match(await response.text(), /Let’s find your way back/);
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
      "/javascripts/portal.js",
      "/javascripts/motion.js",
      "/vendor/gsap/gsap.min.js",
      "/vendor/gsap/ScrollTrigger.min.js",
    ]) {
      assert.equal((await fetch(base + path)).status, 200, path);
    }
    const health = await fetch(base + "/api/health");
    assert.equal((await health.json()).data.status, "ok");
    const protectedCourse = await fetch(base + "/courses");
    // Existing errorHandler reads err.status, while AppError sets statusCode.
    // Preserve and document that pre-existing API bug; this UI task doesn't fix it.
    assert.equal(protectedCourse.status, 500);
    assert.match(
      protectedCourse.headers.get("content-type"),
      /application\/json/,
    );
    assert.equal(
      (await protectedCourse.json()).message,
      "Authorization required",
    );
    const unknownApi = await fetch(base + "/api/missing");
    assert.equal(unknownApi.status, 500); // Same existing statusCode/status mismatch.
    assert.match(unknownApi.headers.get("content-type"), /application\/json/);
    console.log(
      `PASS: ${visited.size} linked HTML pages, filters, escaping, 404s, assets, and unchanged API routing.`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
