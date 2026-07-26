import app from "./app";
import { logger } from "./lib/logger";
import { ensureProductionReady } from "./lib/prodInit";

const rawPort = process.env["PORT"] || "10000";
const port = Number(rawPort) || 10000;

ensureProductionReady().catch((err) => {
  logger.warn({ err }, "Non-fatal warning during production readiness auto-init");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
