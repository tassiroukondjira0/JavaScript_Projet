const path = require('path');
// override:true so the project's .env always wins over any OS-level env vars
// (e.g. a globally set DB_PASSWORD/DB_NAME that would break the connection).
require('dotenv').config({ override: true });

// Prevent a single failed DB query / async error from crashing the whole server.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection (caught to keep server alive):', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (caught to keep server alive):', err && err.message ? err.message : err);
});

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const flash = require('connect-flash');
const helmet = require('helmet');
const crypto = require('crypto');
const i18next = require('i18next');

const Backend = require('i18next-fs-backend');
const i18nHttpMiddleware = require('i18next-http-middleware');


const { connectDB } = require('./config/db');
const { createSocketIO } = require('./sockets/socket');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const miscRoutes = require('./routes/misc');
const chatRoutes = require('./routes/chat');
const storyRoutes = require('./routes/stories');


async function start() {
  // Attempt DB connection but DON'T crash the server if MySQL is unavailable.
  try {
    await connectDB();
    console.log('Database connection pool established.');
  } catch (err) {
    console.warn('WARNING: Could not connect to the database. The server will still start in limited mode.');
    console.warn('         Reason:', err && err.message ? err.message : err);
  }

  const app = express();

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // Basic request logging (simple)
  app.use((req, res, next) => {
    res.locals.requestId = crypto.randomUUID();
    next();
  });

  // Body parsing
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // Static assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Session
  app.set('trust proxy', 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'change-me-please',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        // Robust: if we are behind a proxy that terminates HTTPS,
        // Express will set req.secure correctly.
        secure: process.env.NODE_ENV === 'production',
        // If you're testing with plain HTTP locally, this is fine.
        maxAge: 1000 * 60 * 60 * 24
      }
    })
  );


  app.use(flash());

  // Normalize the authenticated user onto req.user so that the common pattern
  // `req.user?.userId` works for BOTH session and JWT auth. The session stores
  // the user as req.session.user = { id, email, role }. Previously many
  // controllers read req.session.userId (undefined), which caused friend
  // requests to fail and posts/comments to be attributed to the wrong user.
  app.use((req, res, next) => {
    if (req.session?.user && !req.user) {
      req.user = {
        userId: req.session.user.id,
        id: req.session.user.id,
        email: req.session.user.email,
        role: req.session.user.role
      };
    }
    next();
  });

  // i18n
  const i18n = i18next.createInstance();
  i18n
    .use(Backend)
    .init({
      fallbackLng: 'fr',
      preload: ['fr', 'en'],
      supportedLngs: ['fr', 'en'],
      lng: 'fr',
      ns: ['translation'],
      defaultNS: 'translation',
      backend: {
        loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json')
      }
    });

  // Force la langue via cookie `i18next` (ou fallback fr)
  // (cookie-parser est utilisé ci-dessus)
  app.use((req, res, next) => {
    const cookieLng = req.cookies?.i18next;
    const lng = cookieLng === 'en' || cookieLng === 'fr' ? cookieLng : 'fr';

    // i18next-http-middleware dépend de `req.i18n`/`req.language` et de `req.t`.
    // On définit la langue avant d'appeler le middleware.
    req.language = lng;
    i18n.changeLanguage(lng);

    next();
  });

  app.use(i18nHttpMiddleware.handle(i18n));

  app.use((req, res, next) => {
    res.locals.t = req.t;
    res.locals.language = req.language || 'fr';
    next();
  });




  // Views
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Basic responsive + theme handled on client (already in CSS)


  // Locals helper
  app.use((req, res, next) => {
    const sessionUser = req.session?.user || null;
    if (sessionUser) {
      // Ensure is_admin and is_super_admin are computed from the role
      // so the left nav can show/hide the admin link correctly
      sessionUser.is_admin = sessionUser.role === 'ADMIN' || sessionUser.role === 'SUPER_ADMIN';
      sessionUser.is_super_admin = sessionUser.role === 'SUPER_ADMIN';
    }
    res.locals.user = sessionUser;
    res.locals.flash = {
      success: req.flash('success'),
      error: req.flash('error')
    };
    next();
  });

  // Routes
  app.use('/', miscRoutes);
  app.use('/auth', authRoutes);
  app.use('/posts', require('./routes/posts'));

  // Mount pages routes (friends, messages, notifications, dashboard, profile, etc.)
  app.use('/', require('./routes/pages'));

  // Mount API routes
  app.use('/api', require('./routes/api'));

  app.use('/users', userRoutes);
  app.use('/profile', profileRoutes);
  app.use('/admin', adminRoutes);
  app.use('/chat', chatRoutes);
  app.use('/stories', storyRoutes);
  app.use('/notifications', require('./routes/notifications'));
  app.use('/admin/crud', require('./routes/adminCrud'));


  // Logout quick route
  app.post('/auth/logout', (req, res) => {
    if (req.session) req.session.destroy(() => res.redirect('/'));
    else res.redirect('/');
  });


  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Djokko listening on port : http://localhost:${process.env.PORT || 3000}`);
  });

  const socketApi = createSocketIO(server, app);
  app.locals.socketApi = socketApi;

  // Expose socket.io Server on `app` so that controllers using req.app.get('socketio')
  // (friendController, likeController, commentController, etc.) can find it.
  app.set('socketio', socketApi.io);
  // Also set socketApi itself in case some code needs emitToUser
  app.set('socketApi', socketApi);

  // Sprint 3: chat socket
  const { registerChat } = require('./sockets/chatSocket');
  registerChat(socketApi.io, socketApi);
}




start().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});