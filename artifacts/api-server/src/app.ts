import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import sitemapRouter from "./routes/sitemap";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the Replit reverse proxy so rate-limit & IP headers work correctly
app.set("trust proxy", 1);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // handled by Vite/Nginx in prod
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /malsahori\.com$/,
  /localhost/,
  /127\.0\.0\.1/,
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some((p) => p.test(origin))) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // In development all curl tests share 127.0.0.1 — use a high limit so
  // regression tests don't accidentally trip the limiter. Production keeps 15.
  max: process.env.NODE_ENV === "production" ? 15 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "عدد محاولات تسجيل الدخول تجاوز الحد، يرجى الانتظار 15 دقيقة." },
});

app.use(globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── SEO — sitemap.xml and robots.txt at root (before SPA / wildcard) ────────
// These must be registered at the app root, NOT under /api, so that if the
// reverse proxy is ever configured to route /sitemap.xml and /robots.txt to
// this server, they are served correctly without authentication or SPA fallback.
// They are ALSO accessible at /api/sitemap.xml via the /api router below.
app.use(sitemapRouter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
