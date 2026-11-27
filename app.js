require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

function createApp({ preview = false } = {}) {
    const app = express();

    app.locals.preview = preview;
    app.locals.images = require('./utils/image-display');
    app.locals.courseQuery = '';
    app.locals.registeredUrl = '/auth/login?registered=1';
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.use(helmet({
        contentSecurityPolicy: {
            directives: { upgradeInsecureRequests: null },
        },
        // Native forms need a same-origin Origin header for the POST guard.
        referrerPolicy: { policy: 'same-origin' },
        strictTransportSecurity: process.env.NODE_ENV === 'production',
    }));
    if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    if (!preview) {
        if (!process.env.SESSION_SECRET) throw new Error('Missing SESSION_SECRET');
        if (!process.env.JWT_SECRET) throw new Error('Missing JWT_SECRET');

        if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
        app.use(session({
            name: 'ucrs.sid',
            secret: process.env.SESSION_SECRET,
            store: MongoStore.create({
                client: mongoose.connection.getClient(),
                dbName: mongoose.connection.name,
                collectionName: 'sessions',
            }),
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
            },
        }));
    }

    app.use('/', preview ? require('./routes/preview.routes') : routes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

module.exports = createApp;
