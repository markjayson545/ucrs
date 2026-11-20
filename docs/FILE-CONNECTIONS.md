# How the UCRS files connect

Start with [app.js](../app.js). Read [bin/www](../bin/www) alongside it to see how the program reaches that file.

## 1. Start the server

```text
npm run dev
  → bin/www calls config/db.js to connect to MongoDB and initialize model indexes
  → bin/www calls createApp() from app.js and starts listening
  → app.js sets the EJS views folder, reads request bodies, serves public files,
    loads the session middleware, and mounts routes/index.js at /
  → routes/index.js mounts the API routers and routes/views.routes.js
```

**Mounting** adds the mount path before the paths inside a router. For example, `routes/index.js` mounts `section.routes.js` at `/api/sections`. A route declared as `router.get('/:id', ...)` inside that file handles `GET /api/sections/:id`. The HTML router is mounted at `/`, so its `/student/schedule` path stays the same.

## 2. Follow a GET page

Open `/student/schedule` using a student account.

1. [routes/views.routes.js](../routes/views.routes.js) matches the URL. The cookie identifies a session stored in MongoDB. [middleware/view-auth.js](../middleware/view-auth.js) reads the user ID from that session, loads the active user, and checks the role.
2. `portal.schedule` in [controllers/portal.controller.js](../controllers/portal.controller.js) calls `listForStudent()` and `timetable()` in [services/enrollment.service.js](../services/enrollment.service.js).
3. The service queries [models/Enrollment.js](../models/Enrollment.js). Its `section` and `course` references point to [Section.js](../models/Section.js) and [Course.js](../models/Course.js). Mongoose's `populate()` loads those records so the controller has the class meetings, course title, and credits.
4. The controller calls `res.render('student/schedule', { title, meetings })`. Express finds [views/student/schedule.ejs](../views/student/schedule.ejs) under the views directory. The template loops through `meetings` and includes the shared header and footer.
5. Express sends the completed HTML. In browser DevTools, the response contains the resulting table or timetable markup. You can edit the source EJS in the repo and refresh to see the change.

The object passed to `res.render()` supplies values for one page. `res.locals` supplies request-wide values, such as `user`, `role`, `term`, and `formatTime`, that the shared partials can also read. In EJS, use `<%= value %>` for text that needs HTML escaping and `<%- include(...) %>` for a trusted template include.

## 3. Follow a form submission

Open a course and submit **Enroll**.

```text
views/catalog/show.ejs
  → the form's action and method send POST /student/enrollments/<sectionId>/register
  → routes/views.routes.js checks the session, role, origin, and ID
  → portal.register calls enrollmentService.register(userId, sectionId)
  → the service checks eligibility and commits the registration and seat count
  → the controller redirects with 303 to GET /student/enrollments
  → views/student/enrollments.ejs shows the saved status and a one-time message
```

The form's HTML `action` and `method` define its request. [public/javascripts/portal.js](../public/javascripts/portal.js) confirms actions marked with `data-confirm` and enhances `data-submit` forms with a busy state and in-place feedback. It sends the same form body with the `X-Portal-Form` header. Success returns a destination URL. If a service throws an `AppError`, [middleware/errorHandler.js](../middleware/errorHandler.js) sends the message and any field errors back to the open form. A regular HTML submission still uses a redirect on success and an EJS error page on failure.

Sign-in is an example of a form submitted with JavaScript. [public/javascripts/auth.js](../public/javascripts/auth.js) sends JSON to `POST /auth/session`. [routes/session.routes.js](../routes/session.routes.js) verifies the password, saves the user ID in the server-side session, and returns the workspace URL. On the next page request, the browser sends the session cookie.

Account settings use the same form pattern. `POST /account/password` validates the current and new passwords, then calls [user.service.js](../services/user.service.js). The save hook in [User.js](../models/User.js) hashes the new password and increments `authVersion`. Both authentication middlewares compare that value with the one in the session or JWT. The controller creates a fresh session for the browser that made the change.

## 4. Follow the JSON version

`POST /api/enrollments` reaches [routes/enrollment.routes.js](../routes/enrollment.routes.js). [middleware/auth.js](../middleware/auth.js) verifies the bearer token and looks up the user's current role. [controllers/enrollment.controller.js](../controllers/enrollment.controller.js) calls the same `enrollmentService.register()` as the EJS portal. The API controller sends the record as JSON with HTTP 201.

When you change a registration rule, start in the service. When you change a URL or role check, start in the router. When you change the shape of a response, start in its controller or template.

## 5. Find the browser files

Express serves [public/](../public/) through `express.static()`, with `public` as the URL root. For example, `public/stylesheets/portal.css` is requested at `/stylesheets/portal.css`. [views/partials/head.ejs](../views/partials/head.ejs) links the stylesheet and loads the browser scripts with `defer`.

| I want to change… | First file to open |
| --- | --- |
| An HTML page URL or access rule | [routes/views.routes.js](../routes/views.routes.js) |
| Which records a page receives | [controllers/portal.controller.js](../controllers/portal.controller.js) |
| Layout, labels, fields, and links | The matching [EJS file](CONNECTING-VIEWS.md) |
| A table filter, mobile menu, or confirmation dialog | [public/javascripts/portal.js](../public/javascripts/portal.js) |
| A page entrance, dialog animation, or meter reveal | [public/javascripts/motion.js](../public/javascripts/motion.js) and [portal.css](../public/stylesheets/portal.css) |
| Light and dark colors or saved accent selection | [theme.css](../public/stylesheets/theme.css) and [appearance.js](../public/javascripts/appearance.js) |
| The profile popup or account form | [profile-menu.ejs](../views/partials/profile-menu.ejs) and [account/index.ejs](../views/account/index.ejs) |
| A registration rule | [services/enrollment.service.js](../services/enrollment.service.js) |
| A stored field, reference, or index | The corresponding file in [models/](../models/) |
| A page running with `npm run dev:views` | [routes/preview.routes.js](../routes/preview.routes.js) and [fixtures/view-demo.js](../fixtures/view-demo.js) |

## 6. Copy the same pattern when you add a page

1. Pick a URL and add a single route beside the relevant workspace in `views.routes.js`.
2. Add a controller that reads the request, calls the service, and passes named values to `res.render()`.
3. Put database queries and rules in a service. Put request input checks in the router's validators or a validation module.
4. Create the EJS file and use the shared header and footer. Keep template code to display logic such as loops and empty states.
5. Add a normal link or form first. If the interaction needs JavaScript or motion, add a descriptive `data-*` hook and use the matching script in `public/javascripts`.

For a concrete example, trace the **weekly schedule** link from `header.ejs` to `views.routes.js`, then to `portal.schedule` and back to `schedule.ejs`. You can reuse that exact path for the next read-only student page.
