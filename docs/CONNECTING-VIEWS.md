# Browser routes and EJS views

The live portal uses a session cookie to identify the signed-in user and checks their current role on each protected page. The public catalog is available to visitors. For a walkthrough with sample records, run `npm run dev:views` and use the workspace picker. [Live setup](../README.md#run-the-live-system) · [How requests reach EJS](FILE-CONNECTIONS.md)

## GET page map

| URL | Template under `views/` | Who can open it in the live portal |
| --- | --- | --- |
| `/` | `index.ejs` | Anyone |
| `/auth/login`, `/auth/register` | `auth/login.ejs`, `auth/register.ejs` | Anyone |
| `/catalog/courses`, `/catalog/courses/:id` | `catalog/index.ejs`, `catalog/show.ejs` | Anyone |
| `/student`, `/student/enrollments`, `/student/schedule`, `/student/transcript` | The corresponding file under `student/`, starting with `index.ejs` | Student |
| `/account` | `account/index.ejs` | Any signed-in role. Students can also open `/student/profile`. |
| `/faculty`, `/faculty/sections` | `faculty/index.ejs`, `faculty/sections.ejs` | Faculty |
| `/faculty/sections/:id/roster`, `/faculty/sections/:id/grades` | `faculty/roster.ejs`, `faculty/grades.ejs` | Faculty assigned to the section |
| `/admin`, `/admin/courses`, `/admin/sections`, `/admin/users`, `/admin/reports` | The corresponding file under `admin/`, starting with `index.ejs` | Administrator |
| `/admin/courses/new`, `/admin/courses/:id/edit` | `admin/course-form.ejs` | Administrator |
| `/admin/sections/new`, `/admin/sections/:id/edit` | `admin/section-form.ejs` | Administrator |

A GET displays a page. Forms send changes to the path in their `action` attribute. For example, `GET /admin/courses/new` displays the course form and `POST /admin/courses` saves it. [Live page router](../routes/views.routes.js)

## Using the workspaces

- **Visitors** can search the catalog by course code, title, or department. To create a student account, enter your name and email, then enter the same password twice. Student ID and department are optional. Open **Appearance** in the header to choose Light, Dark, or System and an accent. The browser remembers these choices for this site.
- **Students** select a course and register for a specific section. **My enrollments** shows confirmed seats and waitlist places. **Weekly schedule** lists meetings and rooms. **Academic record** shows completed enrollments and cumulative GPA.
- **Faculty** open **My sections**, choose the roster for a section they teach, and save letter grades in its gradebook.
- **Administrators** create a course, assign a faculty member to a section, and set its term, meeting times, and capacity. **Reports** compares occupied and remaining seats and waitlisted registrations by section for the current term. The table lists exact counts, including total capacity.
- **All signed-in users** can open the avatar menu for appearance, sign-out, and account settings. Choose **Sign out** and confirm to end the current browser session, or cancel to keep working. Email changes require the current password. A password change refreshes the current session and invalidates older sessions and bearer tokens.

## Registration rules

- The active registration term defaults to `2026-1`. Students can take up to **18 credits** per term and need a grade of **D or higher** in their prerequisites.
- Registration checks the student's confirmed timetable for overlaps and prevents multiple registrations for the same course in the term. Pending waitlist places appear on the schedule with a label.
- A full section places eligible students on its waitlist. When an open section gains seats, the service checks the waiting students in order and promotes the earliest eligible student. Students whose current schedule or credit load blocks promotion keep their place in the queue.
- Faculty publish grades for their own sections. A submitted grade completes the enrollment and appears in the transcript. GPA weights grade points by course credits.
- A section with active registrations keeps its meeting times and rooms. A section with enrollment history can be closed. Courses in use by sections, prerequisites, or enrollment records are protected from deletion.
