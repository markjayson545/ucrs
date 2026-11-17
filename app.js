require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const morgan = require('morgan');

const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler');

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(morgan('dev'));
app.use(logger('dev'));
app.use(express.json({ limit: '10kb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
if (!process.env.SESSION_SECRET){
    throw new Error('Missing session_SECRET environment variable');
}

app.use(session({
    name: 'ucrs.sid',
    secret: process.env.SESSION_SECRET,

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
    }),

    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,
        path: '/',
    }
}));

app.use('/', routes)

app.use(notFound);
app.use(errorHandler);

module.exports = app;
