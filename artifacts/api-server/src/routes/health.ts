import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Canonical health endpoint — required by spec and load balancers
router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "abu-alarabi-api", status: "healthy" });
});

// Legacy alias — kept for backward compat
router.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "abu-alarabi-api", status: "healthy" });
});

export default router;
