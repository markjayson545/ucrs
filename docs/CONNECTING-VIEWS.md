# Browser routes and EJS views

Run the [live portal](../README.md#run-the-live-system) for real sign-in and records. Run `npm run dev:views` for the same templates with sample records and a workspace picker. Start with [How the files connect](FILE-CONNECTIONS.md) for a guided walk through the request.

## GET page map

| URL | Template under `views/` | Who can open it in the live portal |
| --- | --- | --- |
| `/` | `index.ejs` | Anyone |
| `/auth/login`, `/auth/register` | `auth/login.ejs`, `auth/register.ejs` | Anyone |
| `/catalog/courses`, `/catalog/courses/:id` | `catalog/index.ejs`, `catalog/show.ejs` | Anyone |
| `/student`, `/student/enrollments`, `/student/schedule`, `/student/transcript` | The corresponding file under `student/`, starting with `index.ejs` | Student |
| `/account` | `account/index.ejs` | Any signed-in role |
| `/faculty`, `/faculty/sections` | `faculty/index.ejs`, `faculty/sections.ejs` | Faculty |
| `/faculty/sections/:id/roster`, `/faculty/sections/:id/grades` | `faculty/roster.ejs`, `faculty/grades.ejs` | Faculty assigned to the section |
| `/admin`, `/admin/courses`, `/admin/sections`, `/admin/users`, `/admin/reports` | The corresponding file under `admin/`, starting with `index.ejs` | Administrator |
| `/admin/courses/new`, `/admin/courses/:id/edit` | `admin/course-form.ejs` | Administrator |
| `/admin/sections/new`, `/admin/sections/:id/edit` | `admin/section-form.ejs` | Administrator |

In a form such as `views/admin/course-form.ejs`, look for the `action` attribute and search for that path in [the live router](../routes/views.routes.js). The method is part of the lookup. A GET shows the form and a POST saves it.

## Registration rules

- The active registration term defaults to `2026-1`. Students can take up to **18 credits** per term and need a grade of **D or higher** in their prerequisites.
- Registration checks the student's confirmed timetable for overlaps and prevents multiple registrations for the same course in the term. Pending waitlist places appear on the schedule with a label.
- A full section places eligible students on its waitlist. When an open section gains seats, the service checks the waiting students in order and promotes the earliest eligible student. Students whose current schedule or credit load blocks promotion keep their place in the queue.
- Faculty publish grades for their own sections. A submitted grade completes the enrollment and appears in the transcript. GPA weights grade points by course credits.
- A section with active registrations keeps its meeting times and rooms. A section with enrollment history can be closed. Courses in use by sections, prerequisites, or enrollment records are protected from deletion.
