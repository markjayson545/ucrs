# UCRS: Folder Structure and Code Patterns

A reference for building the University Course Registration System on top of your **express-generator** project.
It replaces the `src/` layout suggested in the build plan, because your project already has `bin/www`, `app.js` and `routes/`.

**How to use this file:** Do not paste the snippets. Type them, run them, break them, then write the next resource (Section, Enrollment, ...) by following the same pattern. The Course slice in section 6 is a complete example of one feature from route to database. Everything else in the project repeats that shape.

---

## 1. What your current tree tells us

| What I see | What it means |
|------------|---------------|
| `bin/` | `bin/www` is the generated server startup file. It plays the role of `server.js` (connect to the DB, then listen). |
| `routes/`, `views/`, `public/` | Generator defaults. `views/admin`, `views/faculty`, `views/student` look like you planned EJS pages. |
| `array-flatten`, `methods`, `body-parser` in `node_modules` | You most likely have **Express 4**. Confirm with `npm ls express`. In Express 4, an error thrown inside an `async` route handler is **not** caught automatically, so we use an `asyncHandler` wrapper (section 3). |
| `mongoose`, `mongodb`, `dotenv`, `morgan` already installed | Good, nothing to add for these. |
| `data/` with `journal`, `diagnostic.data` | This is your **local MongoDB data folder**. It must be in `.gitignore`. A local standalone `mongod` does **not** support transactions, so the atomic-update pattern in section 8 is the right approach. |
| `ejs`, `cookie-parser` | Not needed for a JSON API. Leave them installed and ignore them for now. |

**Decision for the views folder:** the rubric grades a REST API with JSON responses, not web pages. Build the API first and test it in Postman. If you have time left, a simple EJS or plain HTML front end is a nice Phase 11 extra. Do not start with it.

---

## 2. Target folder structure

```
ucrs/
├── bin/
│   └── www                       generated; edit it to connect to MongoDB before listening
├── config/
│   └── db.js                     Mongoose connection
├── controllers/                  thin: read req, call a service, send res
│   ├── auth.controller.js
│   ├── course.controller.js
│   ├── section.controller.js
│   ├── enrollment.controller.js
│   └── report.controller.js
├── services/                     business logic and database work
│   ├── course.service.js
│   ├── section.service.js
│   ├── enrollment.service.js
│   ├── transcript.service.js
│   └── report.service.js
├── models/                       Mongoose schemas
│   ├── User.js
│   ├── Course.js
│   ├── Section.js
│   └── Enrollment.js
├── routes/
│   ├── index.js                  mounts every router under /api
│   ├── auth.routes.js
│   ├── course.routes.js
│   ├── section.routes.js
│   ├── enrollment.routes.js
│   └── report.routes.js
├── middleware/
│   ├── auth.js                   protect + authorizeRoles
│   ├── validate.js               turns express-validator results into an error
│   ├── notFound.js
│   └── errorHandler.js
├── validators/                   express-validator rule arrays
│   ├── auth.validator.js
│   └── course.validator.js
├── utils/
│   ├── AppError.js
│   ├── asyncHandler.js
│   ├── response.js
│   ├── token.js
│   ├── time.js                   overlaps() from your Phase 0 exercise
│   └── gpa.js
├── scripts/
│   └── seed.js
├── tests/
├── docs/                         ERD image, Postman collection, this file
├── public/  views/               generator leftovers, untouched for now
├── data/                         local mongod files (gitignored)
├── app.js                        builds and exports the Express app (never calls listen)
├── .env  .env.example  .gitignore
├── README.md  DEVLOG.md
└── package.json
```

**Delete** `routes/users.js` (generated sample) and replace `routes/index.js` with the one in section 4.

**Naming rules (follow them everywhere):**

- Models: `PascalCase`, singular, one per file (`Course.js` exports the `Course` model).
- Everything else: `thing.type.js` (`course.service.js`, `course.routes.js`).
- Routes are plural nouns: `/api/courses`, `/api/sections`.

**Create the folders** (Windows cmd, from the project root):

```
mkdir config controllers services models middleware validators utils scripts tests docs
```

### The request flow (memorise this)

```
Request
  -> route            which URL + method?
  -> protect          is there a valid token?            (401 if not)
  -> authorizeRoles   is this role allowed?              (403 if not)
  -> validator rules  is the input shaped correctly?
  -> validate         stop here with 400 if rules failed
  -> controller       read req, call the service, send the response
  -> service          business rules + Mongoose queries, throws AppError
  -> model            schema, validation, indexes
Any error thrown anywhere -> errorHandler -> consistent JSON
```

**Rule of thumb:** a controller is 3 to 6 lines. If it is getting long, the logic belongs in a service.

---

## 3. Setup

### 3.1 Install what is missing

```
npm install bcryptjs jsonwebtoken express-validator cors helmet express-rate-limit
npm install -D nodemon
```

`bcryptjs` is used instead of `bcrypt` because it is pure JavaScript and avoids native build problems on Windows.

### 3.2 package.json scripts

```json
"scripts": {
  "start": "node ./bin/www",
  "dev": "nodemon ./bin/www",
  "seed": "node scripts/seed.js"
}
```

### 3.3 .env (never commit this) and .env.example (commit this, with fake values)

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/ucrs
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1d
```

Generate a real secret:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3.4 .gitignore

```
node_modules
.env
data/
```

If you already committed `data/` or `.env`, run `git rm -r --cached data` (and `git rm --cached .env`) once.

### 3.5 config/db.js

```js
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing. Check your .env file.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
```

### 3.6 bin/www: connect first, then listen

Keep the generated file, but replace the three lines near the bottom that start the server:

```js
// BEFORE (generated)
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
```

```js
// AFTER
const connectDB = require('../config/db');

connectDB().then(() => {
  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
});
```

**Why:** if the database is down, you want to find out immediately and clearly, not when the first request fails.

### 3.7 app.js: rewrite as a JSON API app

Replace the generated contents (view engine, cookie parser, static files, http-errors) with:

```js
require('dotenv').config();   // must run before anything reads process.env

const express = require('express');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api', routes);

app.use(notFound);        // after all routes
app.use(errorHandler);    // always last

module.exports = app;
```

**Order matters in Express.** Middleware runs top to bottom. The error handler goes last so it can catch errors from everything above it.

---

## 4. Shared building blocks (write these once, use everywhere)

### utils/AppError.js

An error that carries an HTTP status code. Services throw it; the error handler turns it into JSON.

```js
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;          // optional list of field errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

### utils/asyncHandler.js

Express 4 does not catch errors from `async` functions. This wrapper sends them to `next(err)` for you, so you never write `try/catch` in controllers.

```js
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

### utils/response.js

One response shape for the whole API.

```js
exports.success = (res, data, statusCode = 200, meta) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};
```

### utils/token.js

```js
const jwt = require('jsonwebtoken');

exports.signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },     // keep the payload small
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
```

### middleware/notFound.js

```js
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
```

### middleware/validate.js

Put this after your express-validator rule arrays. It stops the request if any rule failed.

```js
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new AppError('Validation failed', 400, errors));
};
```

### middleware/errorHandler.js

Express recognises an error handler by its **four parameters**. Do not remove `next`, even though it is unused.

```js
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors = err.errors || undefined;

  if (err.name === 'ValidationError') {                 // Mongoose schema validation
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {                // e.g. a malformed ObjectId
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {                      // duplicate key (unique index)
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : 'Duplicate value';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Invalid or expired token';
  } else if (err.type === 'entity.parse.failed') {      // bad JSON body
    status = 400;
    message = 'Malformed JSON in request body';
  }

  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (status === 500 && process.env.NODE_ENV !== 'production') body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = errorHandler;
```

### routes/index.js

```js
const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.use('/auth', require('./auth.routes'));
router.use('/courses', require('./course.routes'));
// add the others here as you build them

module.exports = router;
```

**Checkpoint:** run `npm run dev`, then `GET http://localhost:3000/api/health` in Postman, and `GET /api/nothing` (should return your JSON 404, not an HTML page).

---

## 5. Models

### models/User.js (password hashing pattern)

```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,                     // creates a unique index
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: { type: String, required: true, minlength: 8, select: false }, // hidden from queries by default
    role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
    idNumber: { type: String, trim: true, unique: true, sparse: true },      // sparse: many users may have none
    department: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }                  // adds createdAt and updatedAt
);

// Hash the password before saving, but only when it changed.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method: user.comparePassword('plain text')
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Never leak the hash or __v when a user is sent as JSON.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
```

**Things to understand here:**

- Schema validation (`minlength: 8`) runs **before** the `pre('save')` hook, so it checks the plain password, not the hash.
- `select: false` means `User.findOne(...)` will not return the password unless you ask with `.select('+password')`.
- Hooks like `pre('save')` do **not** run for `findByIdAndUpdate`. Never change passwords through update queries; load the document, set the field, and call `.save()`.

### models/Course.js (references to itself)

```js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    credits: { type: Number, required: true, min: 1, max: 6 },
    department: { type: String, required: true, trim: true },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true }
);

courseSchema.index({ department: 1 });    // we filter by department often

module.exports = mongoose.model('Course', courseSchema);
```

### models/Section.js (embedded sub-documents and a compound index)

```js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Embedded because a schedule is always read together with its section.
const scheduleSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], required: true },
    start: { type: Number, required: true, min: 0, max: 1439 },   // minutes since midnight
    end: {
      type: Number,
      required: true,
      min: 1,
      max: 1440,
      validate: {
        validator: function (v) { return v > this.start; },       // custom validator
        message: 'End time must be after start time',
      },
    },
    room: { type: String, trim: true },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    course: { type: ObjectId, ref: 'Course', required: true },
    term: { type: String, required: true, trim: true },           // e.g. "2026-1"
    sectionCode: { type: String, required: true, trim: true, uppercase: true },
    faculty: { type: ObjectId, ref: 'User', required: true },
    capacity: { type: Number, required: true, min: 1 },
    enrolledCount: { type: Number, default: 0, min: 0 },
    schedule: [scheduleSchema],
    status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
  },
  { timestamps: true }
);

// The same course cannot have the same section code twice in one term.
sectionSchema.index({ course: 1, term: 1, sectionCode: 1 }, { unique: true });
sectionSchema.index({ term: 1, faculty: 1 });

module.exports = mongoose.model('Section', sectionSchema);
```

### models/Enrollment.js

```js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'User', required: true },
    section: { type: ObjectId, ref: 'Section', required: true },
    course: { type: ObjectId, ref: 'Course', required: true },   // copied on purpose: cheap transcript and prereq queries
    term: { type: String, required: true },
    status: {
      type: String,
      enum: ['enrolled', 'waitlisted', 'dropped', 'completed'],
      default: 'enrolled',
    },
    grade: {
      letter: String,
      points: Number,
      submittedBy: { type: ObjectId, ref: 'User' },
      submittedAt: Date,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, term: 1, status: 1 });
enrollmentSchema.index({ section: 1, status: 1, createdAt: 1 });  // roster and waitlist order

// A student may have only ONE active enrollment per section, but may re-enrol after dropping.
// Partial indexes with $in need MongoDB 6.0+. Verify in Compass that it was created.
enrollmentSchema.index(
  { student: 1, section: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['enrolled', 'waitlisted'] } } }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);
```

If the partial index gives you trouble, the alternative design is a plain unique index on `student + section` and re-activating the old document on re-enrolment. Whichever you choose, write it in DEVLOG.md.

---

## 6. Authentication pattern

### validators/auth.validator.js

```js
const { body } = require('express-validator');

exports.registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

exports.loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];
```

`isEmail()` on the login email also makes sure it is a **string**, which blocks the NoSQL-injection trick of sending `{"email": {"$ne": null}}`.

### controllers/auth.controller.js

```js
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { success } = require('../utils/response');

exports.register = asyncHandler(async (req, res) => {
  // Pick fields one by one. Never pass req.body straight into the model,
  // and NEVER take the role from the request. Public sign-up is always a student.
  const { name, email, password, idNumber, department } = req.body;
  const user = await User.create({ name, email, password, idNumber, department, role: 'student' });
  success(res, { user, token: signToken(user) }, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');   // password is select:false

  // One generic message for every failure, so attackers cannot tell which part was wrong.
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  success(res, { user, token: signToken(user) });
});

exports.me = asyncHandler(async (req, res) => {
  success(res, { user: req.user });
});
```

### middleware/auth.js

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// 401 = "I don't know who you are"
exports.protect = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Authentication required', 401);

  const payload = jwt.verify(token, process.env.JWT_SECRET);   // throws if invalid or expired; errorHandler maps it to 401
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw new AppError('User no longer exists or is deactivated', 401);

  req.user = user;
  next();
});

// 403 = "I know who you are, but you may not do this"
exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};
```

### routes/auth.routes.js

```js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerRules, loginRules } = require('../validators/auth.validator');

router.post('/register', registerRules, validate, ctrl.register);
router.post('/login', loginRules, validate, ctrl.login);
router.get('/me', protect, ctrl.me);

module.exports = router;
```

Read the route lines left to right: **URL, rules, validate, controller**. Every route in the project looks like this.

### scripts/seed.js (first admin)

```js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = 'admin@ucrs.test';
  if (!(await User.findOne({ email }))) {
    await User.create({ name: 'Admin', email, password: 'ChangeMe123!', role: 'admin' });
    console.log('Admin created');
  } else {
    console.log('Admin already exists');
  }

  await mongoose.disconnect();
})();
```

Run it from the project root with `npm run seed` (dotenv reads `.env` from the current folder).

**Auth checkpoint in Postman:** register, login, call `/api/auth/me` with `Authorization: Bearer <token>`. Then try no token (401), a student token on an admin route (403), and a duplicate email (409).

---

## 7. A complete vertical slice: Courses

This is the pattern for **every** resource. Build it for Courses, then repeat it for Sections.

### validators/course.validator.js

```js
const { body, param, query } = require('express-validator');

exports.idParam = [param('id').isMongoId().withMessage('Invalid course id')];

exports.createRules = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('credits').isInt({ min: 1, max: 6 }).withMessage('credits must be 1 to 6').toInt(),
  body('prerequisites').optional().isArray().withMessage('prerequisites must be an array'),
  body('prerequisites.*').isMongoId().withMessage('Invalid prerequisite id'),
];

// For updates every field is optional, but if present it must be valid.
exports.updateRules = [
  body('title').optional().trim().notEmpty(),
  body('department').optional().trim().notEmpty(),
  body('credits').optional().isInt({ min: 1, max: 6 }).toInt(),
  body('prerequisites').optional().isArray(),
  body('prerequisites.*').isMongoId().withMessage('Invalid prerequisite id'),
];

exports.listRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('q').optional().isString(),
  query('department').optional().isString(),   // blocks ?department[$ne]=x injection
  query('sort').optional().isString(),
];
```

### services/course.service.js

```js
const Course = require('../models/Course');
const AppError = require('../utils/AppError');

const SORTABLE = ['code', 'title', 'credits', 'department'];          // whitelist: never trust a raw sort param
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // so "(" or "*" in a search cannot break the regex

exports.list = async ({ page = 1, limit = 10, q, department, sort = 'code' }) => {
  const filter = {};
  if (department) filter.department = String(department);
  if (q) {
    const rx = new RegExp(escapeRegex(String(q)), 'i');                // 'i' = case-insensitive
    filter.$or = [{ code: rx }, { title: rx }];
  }
  const sortField = SORTABLE.includes(sort) ? sort : 'code';

  // Run both queries at the same time.
  const [items, total] = await Promise.all([
    Course.find(filter)
      .sort(sortField)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('prerequisites', 'code title'),    // replace ids with {code, title}
    Course.countDocuments(filter),
  ]);

  return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
};

exports.getById = async (id) => {
  const course = await Course.findById(id).populate('prerequisites', 'code title');
  if (!course) throw new AppError('Course not found', 404);
  return course;
};

async function assertPrereqsExist(ids, selfId) {
  const unique = [...new Set(ids.map(String))];
  if (selfId && unique.includes(String(selfId))) {
    throw new AppError('A course cannot be its own prerequisite', 400);
  }
  const found = await Course.countDocuments({ _id: { $in: unique } });
  if (found !== unique.length) throw new AppError('One or more prerequisites do not exist', 400);
}

exports.create = async (data) => {
  // Whitelist fields instead of passing req.body directly (prevents mass assignment).
  const { code, title, description, credits, department, prerequisites = [] } = data;
  await assertPrereqsExist(prerequisites);
  return Course.create({ code, title, description, credits, department, prerequisites });
};

exports.update = async (id, data) => {
  const allowed = ['title', 'description', 'credits', 'department', 'prerequisites'];
  const updates = {};
  for (const key of allowed) if (data[key] !== undefined) updates[key] = data[key];

  if (updates.prerequisites) await assertPrereqsExist(updates.prerequisites, id);

  // new: true       -> return the updated document, not the old one
  // runValidators   -> update queries skip schema validation unless you ask for it
  const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!course) throw new AppError('Course not found', 404);
  return course;
};

exports.remove = async (id) => {
  // TODO (yours): refuse with 409 if any Section references this course.
  const course = await Course.findByIdAndDelete(id);
  if (!course) throw new AppError('Course not found', 404);
};
```

### controllers/course.controller.js

```js
const courseService = require('../services/course.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await courseService.list(req.query);
  success(res, items, 200, meta);
});

exports.getOne = asyncHandler(async (req, res) => {
  success(res, await courseService.getById(req.params.id));
});

exports.create = asyncHandler(async (req, res) => {
  success(res, await courseService.create(req.body), 201);
});

exports.update = asyncHandler(async (req, res) => {
  success(res, await courseService.update(req.params.id, req.body));
});

exports.remove = asyncHandler(async (req, res) => {
  await courseService.remove(req.params.id);
  res.status(204).send();
});
```

### routes/course.routes.js

```js
const router = require('express').Router();
const ctrl = require('../controllers/course.controller');
const { protect, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { idParam, createRules, updateRules, listRules } = require('../validators/course.validator');

router.use(protect);   // every route below requires a valid token

router.get('/', listRules, validate, ctrl.list);
router.get('/:id', idParam, validate, ctrl.getOne);

router.post('/', authorizeRoles('admin'), createRules, validate, ctrl.create);
router.patch('/:id', authorizeRoles('admin'), idParam, updateRules, validate, ctrl.update);
router.delete('/:id', authorizeRoles('admin'), idParam, validate, ctrl.remove);

module.exports = router;
```

### Recipe: adding any new resource (Sections, Enrollments, ...)

1. Model in `models/`
2. Validator rules in `validators/`
3. Service in `services/` (rules, queries, `throw new AppError(...)`)
4. Controller in `controllers/` (wrap each handler in `asyncHandler`)
5. Routes in `routes/`, in the order: auth, role, rules, validate, controller
6. Mount the router in `routes/index.js`
7. Test every success **and** failure case in Postman
8. Commit

---

## 8. Patterns for the harder parts

These show the technique only. The rules around them are yours to write.

### 8.1 Atomic seat claim (registration, Phase 6)

A naive "read the count, check it, then save" lets two students take the last seat at the same moment. Make the check and the increment **one** database operation:

```js
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');

exports.register = async (studentId, sectionId) => {
  const section = await Section.findById(sectionId);
  if (!section) throw new AppError('Section not found', 404);
  if (section.status !== 'open') throw new AppError('Section is not open for registration', 409);

  // TODO: already enrolled in this section or another section of the same course this term?
  // TODO: prerequisites completed with a passing grade?
  // TODO: schedule conflict with current sections? (utils/time.js overlaps)
  // TODO: credit limit?

  // The filter only matches while there is still room, and the $inc happens in the same step.
  const claimed = await Section.findOneAndUpdate(
    { _id: sectionId, $expr: { $lt: ['$enrolledCount', '$capacity'] } },
    { $inc: { enrolledCount: 1 } },
    { new: true }
  );

  if (!claimed) {
    // Section is full. TODO: create a 'waitlisted' enrollment, or throw 409, per your decision.
  }

  try {
    return await Enrollment.create({
      student: studentId,
      section: sectionId,
      course: section.course,
      term: section.term,
      status: 'enrolled',
    });
  } catch (err) {
    // Creating the enrollment failed, so give the seat back.
    await Section.updateOne({ _id: sectionId }, { $inc: { enrolledCount: -1 } });
    throw err;
  }
};
```

Your local `mongod` is standalone, so multi-document transactions are not available. This "claim, then undo on failure" approach is the correct one here. Mention it in your README's design decisions.

### 8.2 Ownership check (object-level authorization)

A role check says "faculty may grade". It does **not** say "this faculty member may grade **this** section". Always add the second check:

```js
const enrollment = await Enrollment.findById(enrollmentId);
if (!enrollment) throw new AppError('Enrollment not found', 404);

const section = await Section.findById(enrollment.section);
if (String(section.faculty) !== String(req.user._id)) {
  throw new AppError('You can only grade sections you teach', 403);
}
```

The same idea applies to drops: compare `enrollment.student` with `req.user._id`. Compare with `String(...)`, because ObjectIds are objects and `===` on two objects is always false.

### 8.3 Aggregation (admin reports, Phase 8)

Prototype in Compass first, then paste into code. Fill rate per section for a term:

```js
Section.aggregate([
  { $match: { term } },
  { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'course' } },
  { $unwind: '$course' },
  {
    $project: {
      sectionCode: 1,
      capacity: 1,
      enrolledCount: 1,
      'course.code': 1,
      'course.title': 1,
      fillPercent: {
        $round: [{ $multiply: [{ $divide: ['$enrolledCount', '$capacity'] }, 100] }, 1],
      },
    },
  },
  { $sort: { fillPercent: -1 } },
]);
```

Two things that trip people up: the `from` value is the **collection** name (Mongoose lowercases and pluralises the model name, so `Course` becomes `courses`), and ids inside an aggregation are **not** auto-cast, so convert string ids with `new mongoose.Types.ObjectId(id)` before using them in `$match`.

---

## 9. Mongoose gotchas to keep in mind

| Gotcha | What to do |
|--------|------------|
| `findByIdAndUpdate` returns the **old** document by default | Pass `{ new: true }` |
| Update queries skip schema validation | Pass `{ runValidators: true }` |
| `pre('save')` hooks do not run on update queries | Change passwords with load, set, `.save()` |
| Comparing ObjectIds with `===` | Use `String(a) === String(b)` or `a.equals(b)` |
| `populate` returns whole documents | Pass a second argument to select safe fields: `populate('faculty', 'name email')` |
| `req.query` can contain objects (`?x[$ne]=1`) | Validate with `.isString()` and wrap with `String()` |
| Putting user text into a regex | Escape it first (see `escapeRegex`) |
| Index declared in the schema but not in the database | Check Compass; restart so Mongoose can build indexes |
| Forgetting `await` | Symptom: you get a Promise or `undefined`. Add `await` and check that the function is `async` |

---

## 10. Suggested order to build with these patterns

1. Section 3: setup, `db.js`, `bin/www`, `app.js`. Checkpoint: `/api/health` works.
2. Section 4: shared building blocks and the error handler. Checkpoint: bad URL returns JSON 404.
3. Section 5: `User`, `Course`, `Section`, `Enrollment` models, plus a throwaway script that creates one of each and populates them.
4. Section 6: auth end to end, plus the seed admin.
5. Section 7: the Course slice, then copy the recipe for Sections (with the faculty-role check and schedule validation).
6. Section 8.1 and your own rules: registration and drop.
7. Timetable, grades, transcript, reports, then security hardening (`helmet`, `cors`, `express-rate-limit`), Postman collection and README.

Keep a short note in `DEVLOG.md` after each step. When something is unclear, the official docs (expressjs.com, mongoosejs.com, express-validator.github.io, mongodb.com/docs) are the reference.