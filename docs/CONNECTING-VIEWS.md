# Connecting your Express + MongoDB app to EJS

The UI is ready to explore. Your API controllers, services, models, auth middleware, and existing API mounts were left unchanged. Only HTML routing was added to `routes/index.js`.

## Start here

```sh
npm run dev:views
# Open http://127.0.0.1:8081
# No MongoDB connection needed. This entry point uses sample records only.

npm run check:views
# Renders every linked view and checks filtering, escaping, errors, and API routing.
```

Your regular `npm run dev` still starts `bin/www` and connects to MongoDB first. `VIEWS_PORT` changes the preview port. Everything below is a learning example, not an installed backend implementation.

The first useful task is **connecting the read-only course catalog**. Then add authentication for HTML pages, followed by protected forms. Keep working in that order so each layer makes sense before adding another.

## 1. Understand the request journey

```text
Browser GET /catalog/courses?q=algebra
  → routes/views.routes.js       matches the page URL
  → a view controller            reads req.query, calls a service
  → services/course.service.js   queries MongoDB through the Course model
  → res.render('catalog/index', { courses, q, department, ... })
  → views/catalog/index.ejs      turns those values into HTML
  → browser                      displays HTML + portal.css + portal.js
```

An HTML view controller uses `res.render()`. A JSON API controller uses `res.json()`. They can both call the **same service**. Do not call your own HTTP API from the EJS template; load data before rendering it. Express describes template rendering in its [template engine guide](https://expressjs.com/en/guide/using-template-engines.html).

## 2. Use the URI hierarchy consistently

Page URLs now follow this structure. `:courseId` and `:sectionId` are placeholders, not literal URL text.

| Method | URI                                   | EJS view / purpose                                |
| ------ | ------------------------------------- | ------------------------------------------------- |
| GET    | `/`                                   | `index` — campus welcome                          |
| GET    | `/auth/login`                         | `auth/login`                                      |
| GET    | `/auth/register`                      | `auth/register`                                   |
| GET    | `/catalog/courses`                    | `catalog/index` — `?q=...&department=...` filters |
| GET    | `/catalog/courses/:courseId`          | `catalog/show` — available sections               |
| GET    | `/student`                            | `student/index` — overview                        |
| GET    | `/student/enrollments`                | `student/enrollments`                             |
| GET    | `/student/schedule`                   | `student/schedule`                                |
| GET    | `/student/transcript`                 | `student/transcript`                              |
| GET    | `/student/profile`                    | `student/profile`                                 |
| GET    | `/faculty`                            | `faculty/index`                                   |
| GET    | `/faculty/sections`                   | `faculty/sections`                                |
| GET    | `/faculty/sections/:sectionId/roster` | `faculty/roster`                                  |
| GET    | `/faculty/sections/:sectionId/grades` | `faculty/grades`                                  |
| GET    | `/admin`                              | `admin/index`                                     |
| GET    | `/admin/courses`                      | `admin/courses`                                   |
| GET    | `/admin/courses/new`                  | `admin/course-form` — create design               |
| GET    | `/admin/courses/:courseId/edit`       | `admin/course-form` — edit design                 |
| GET    | `/admin/sections`                     | `admin/sections`                                  |
| GET    | `/admin/sections/new`                 | `admin/section-form`                              |
| GET    | `/admin/users`                        | `admin/users`                                     |
| GET    | `/admin/reports`                      | `admin/reports`                                   |
| GET    | `/preview/forbidden`                  | 403 design preview                                |

Your current JSON routes remain `/api/health`, `/api/auth/*`, and **`/courses`**. Opening `/courses` does not open the catalog; use `/catalog/courses`. The empty enrollment, section, and report router files are still unmounted and unchanged.

When you decide to reorganize the API later, `/api/courses`, `/api/sections`, and `/api/enrollments` would be consistent collection roots. That migration is **not applied here**, since changing `/courses` would change your API contract.

Use plural nouns for collections. Nest resources when the parent gives them meaning: a roster belongs to a section. Use query strings for filters, rather than inventing `/searchCoursesByDepartment`. Keep literal paths such as `/new` before parameter paths. See [Express routing](https://expressjs.com/en/guide/routing.html).

## 3. Replace one fixture-backed GET at a time

Right now `fixtures/view-demo.js` supplies `courses`, `sections`, `enrollments`, `students`, `transcript`, and a sample `user`. The first middleware in `views.routes.js` puts those values into `res.locals`, so includes can use them too. All role workspaces are public sample previews. The workspace picker is navigation, **not authentication or permission enforcement**.

For the first read-only exercise, add this future controller. It reuses your current course service without editing that service or its API controller:

```js
// controllers/catalog.view.controller.js — example, not installed
const courseService = require("../services/course.service");

exports.list = async (req, res, next) => {
  try {
    const q =
      typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const department =
      typeof req.query.department === "string" ? req.query.department : "";
    const { items, meta } = await courseService.list({
      q,
      department,
      page: 1,
      limit: 12,
      sort: "code",
    });

    res.render("catalog/index", {
      title: "Find your next possibility",
      courses: items,
      q,
      department,
      meta,
    });
  } catch (error) {
    next(error); // Required for rejected async work with your Express 4 setup.
  }
};
```

Replace the existing catalog list handler; do not register another identical route below it:

```js
const catalogView = require("../controllers/catalog.view.controller");
router.get("/catalog/courses", catalogView.list);
```

Now run your normal database-connected entry point, `npm run dev`. The course cards use your actual `Course` field names: `_id`, `code`, `title`, `description`, `credits`, `department`, and `prerequisites`. Their background falls back to blue if a real record has no `color` property. Add pagination links using `meta` after the first read works; the example intentionally starts with the first 12 results.

The list links contain database ObjectIds once they use real records. **Connect the detail handler in the same step**, because its old fixture lookup only understands sample IDs such as `cs101`:

```js
// Also in controllers/catalog.view.controller.js
const mongoose = require("mongoose");
const Section = require("../models/Section");

exports.show = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isObjectIdOrHexString(courseId)) {
      return res.status(404).render("shared/notFound", {
        title: "Course not found",
      });
    }
    // Use a server-selected term, not an unchecked value from the URL.
    const term = "2026-1";
    const course = await courseService.getById(courseId);
    const sections = await Section.find({ course: courseId, term })
      .populate("faculty", "name")
      .lean();

    res.render("catalog/show", {
      title: course.title,
      course,
      sections,
      term,
    });
  } catch (error) {
    // Your current service uses AppError.statusCode, not .status.
    if (error.statusCode === 404) {
      return res.status(404).render("shared/notFound", {
        title: "Course not found",
      });
    }
    next(error);
  }
};

// Replace the existing detail route:
router.get("/catalog/courses/:courseId", catalogView.show);
```

`populate()` replaces a referenced faculty ID with the selected faculty fields; it is why `section.faculty.name` works in the template. With real data, handle a deleted faculty reference (which can be `null`) by displaying “Faculty to be assigned.” `lean()` returns plain objects suited to read-only rendering, without document methods, getters, or virtuals by default. See [Mongoose lean](https://mongoosejs.com/docs/tutorials/lean.html).

## 4. Recognize the EJS pattern

```ejs
<%- include('../partials/header') %>

<h1><%= title %></h1>
<% if (courses.length === 0) { %>
  <p>No courses found.</p>
<% } %>

<% courses.forEach(course => { %>
  <%- include('../partials/course-card', { course }) %>
<% }) %>

<%- include('../partials/footer') %>
```

`<% ... %>` runs JavaScript. `<%= ... %>` outputs escaped text, which is appropriate for user and database values. `<%- ... %>` outputs HTML without escaping; use it for your trusted includes, never for a user's course description. These are the [EJS tag and include conventions](https://ejs.co/).

Do not use `res.render('page', req.query)` or spread arbitrary request objects into render options. Select each local explicitly.

## 5. Add HTML authentication before real student/faculty/admin records

Your existing `protect` middleware reads `Authorization: Bearer ...`. Normal links and HTML form navigation do **not** automatically attach a Bearer token. Therefore, adding `protect` to these page routes alone will not make browser sign-in work.

Choose one approach deliberately:

- For this EJS app, a server session is the clearest next exercise: a dedicated HTML sign-in handler verifies the password, regenerates the session, stores only `userId`, and redirects to the role's overview. Use a production session store, HTTP-only cookies, `SameSite`, secure cookies over HTTPS, logout, and CSRF protection for mutation forms. Keep the existing token API separate.
- If you later build an API client, JavaScript can call your current auth API and attach a Bearer header to JSON requests. That alone does not authenticate an EJS link. Avoid treating the preview picker or an editable browser role as authorization.

After you intentionally install and configure session middleware and a store, a page guard can look like this. It is **not usable yet**, because sessions are not installed by this UI task:

```js
// Future middleware/view-auth.js
const User = require("../models/User");

exports.requirePageUser = async (req, res, next) => {
  try {
    if (!req.session?.userId) return res.redirect("/auth/login");
    const user = await User.findById(req.session.userId)
      .select("name email role idNumber department isActive")
      .lean();
    if (!user?.isActive) return res.redirect("/auth/login");
    req.user = user;
    res.locals.user = user;
    res.locals.role = user.role;
    next();
  } catch (error) {
    next(error);
  }
};

exports.allowPageRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).render("shared/notAuthorized", {
        title: "Access restricted",
      });
    }
    next();
  };
```

Mount those guards before the respective page routes:

```js
router.use("/student", requirePageUser, allowPageRoles("student"));
router.use("/faculty", requirePageUser, allowPageRoles("faculty"));
router.use("/admin", requirePageUser, allowPageRoles("admin"));
```

In the same step remove the preview middleware's sample `user`, sample collections, and forced `role` values; use real controller locals instead. The `page()` helper currently forces preview roles and must be replaced for protected pages. Remove the preview picker and sample banners once the workspace is real. Derive avatar initials from the signed-in user's name; the current `AM` is artwork for the sample profile.

For student data, query by `req.user._id`, never an arbitrary student ID supplied by the browser:

```js
const Enrollment = require("../models/Enrollment");
const enrollments = await Enrollment.find({
  student: req.user._id,
  term: "2026-1",
  status: { $in: ["enrolled", "waitlisted"] },
})
  .populate("course")
  .populate({ path: "section", populate: { path: "faculty", select: "name" } })
  .lean();
res.render("student/enrollments", {
  title: "My enrollments",
  enrollments,
});
```

For a faculty roster, first load the section with **both** `_id: req.params.sectionId` and `faculty: req.user._id`. Return 404 if that scoped lookup fails, then load its enrollments. A role check alone does not prove this teacher owns this section. Admin pages need the admin role verified on the server for every read and write.

## 6. Connect a form using POST → redirect → GET

All current mutation forms are inert until `portal.js` enables them, use `data-preview-form`, and keep submit buttons disabled without JS. They only validate and display feedback; no network requests, accounts, grades, or enrollments are created. Sign-in does not authenticate you.

When ready, remove `data-preview-form`, `inert`, and the submit button's `disabled` from the **one** form you are connecting. Add an explicit `action` and `method`. Keep the other forms in preview mode.

```ejs
<!-- Future real admin create form, AFTER page authentication + CSRF setup -->
<form action="/admin/courses" method="post">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <label for="code">Course code</label>
  <input id="code" name="code" required>
  <label for="title">Course title</label>
  <input id="title" name="title" required>
  <label for="department">Department</label>
  <input id="department" name="department" required>
  <label for="credits">Credits</label>
  <input id="credits" name="credits" type="number" min="1" max="6" required>
  <button type="submit">Create course</button>
</form>
```

The field `name` becomes a key in `req.body` because `app.js` already installs `express.urlencoded()`. The CSRF token must come from the server middleware you configure; the example does not create that middleware for you.

```js
// Future route: guards and CSRF middleware are prerequisites, not installed here.
// Reuse createRules/validate from your existing validators where appropriate.
router.post(
  "/admin/courses",
  requirePageUser,
  allowPageRoles("admin"),
  csrfProtection,
  createRules,
  validate,
  async (req, res, next) => {
    try {
      const { code, title, department, description } = req.body;
      const credits = Number(req.body.credits);
      if (!Number.isInteger(credits) || credits < 1 || credits > 6) {
        return res.status(422).send("Credits must be an integer from 1 to 6");
      }
      const rawPrerequisites = req.body.prerequisites;
      const prerequisites = rawPrerequisites
        ? Array.isArray(rawPrerequisites)
          ? rawPrerequisites
          : [rawPrerequisites]
        : [];
      await courseService.create({
        code,
        title,
        department,
        description,
        credits,
        prerequisites,
      });
      res.redirect(303, "/admin/courses");
    } catch (error) {
      next(error);
    }
  },
);
```

Normalize a single prerequisite checkbox into an array, because URL-encoded forms may send a string when only one is selected. Validate on the server even when HTML has `required` and `min`. Your current `validate` and error handler return JSON; for a finished page form, add **view-specific** validation and error handling that re-renders the submitted fields, shows inline errors, and focuses a linked error summary. Do not change the API response format to support page forms. The terse `send` in this teaching example marks the place to add that behavior.

After saving, `303` asks the browser to GET the list so refresh does not repeat the POST. Native forms support GET and POST, so use a future `POST /admin/courses/:courseId` page handler for edits, while leaving the existing API's PATCH handler unchanged. Do not add a method-override dependency just for the design preview.

For the section form, turn `09:30` into minutes before saving:

```js
const toMinutes = (value) => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("Enter a valid time");
  }
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const schedule = [
  {
    day: req.body.day,
    start: toMinutes(req.body.start),
    end: toMinutes(req.body.end),
    room: req.body.room,
  },
];
// Check end > start, valid weekday, real faculty/course IDs, and conflicts.
// Faculty IDs in the current preview are illustrative, not MongoDB ObjectIds.
```

Enrollment and grading belong after auth and server-side ownership checks. Enrollment must check prerequisites, schedule conflicts, duplicate enrollment, and seat capacity, including concurrent requests; do not trust the seat count shown in the browser. Convert gradebook input names into validated enrollment updates scoped to the teacher's own section, rather than trusting a client-supplied student or faculty ID.

## 7. Suggested learning order

1. Trace the existing fixture catalog GET and its EJS loop.
2. Connect catalog list + detail to the existing course service and Section model. Add pagination and loading/error/empty states as needed.
3. Build HTML session sign-in/logout and server-verified role guards.
4. Connect the student's own enrollments, schedule, and transcript; calculate totals from actual records.
5. Connect admin course create/edit with validation, CSRF, and redirect-after-save.
6. Add sections and enrollment, including capacity and conflict rules.
7. Add scoped faculty rosters, grade submission, and computed reports.

Dashboard totals, names, timetable, transcript grades, and report figures are illustrative. Replace their hardcoded values with controller locals when connecting each screen; do not mix real student records with sample totals. Add explicit empty states and handle deleted populated references as you do so.

## Existing backend issues to study separately

These were observed while checking the views and were **not edited**:

- `middleware/auth.js` checks `user.active`, while `models/User.js` defines `isActive`. This can reject valid users on protected API requests.
- `utils/AppError.js` sets `statusCode`, but `middleware/errorHandler.js` reads `status`. As currently written, an unauthenticated `/courses` request and an unknown API route respond with 500 instead of the intended 401/404. The view checks explicitly preserve that baseline rather than silently changing it.
- `utils/response.js` assigns `success: data` rather than a boolean; API clients must not assume the response currently contains `success: true`.
- `services/course.service.js` loops with `for (const key in allowedFields)`, which gives array indexes rather than field names; study `for...of` when you work on update behavior.

Fix and test those in a separate backend exercise before connecting protected views. None of them prevents exploring the current sample UI.
