import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import subjectsRouter from "./subjects";
import dossiersRouter from "./dossiers";
import worksheetsRouter from "./worksheets";
import examsRouter from "./exams";
import studyplanRouter from "./studyplan";
import sessionsRouter from "./sessions";
import notesRouter from "./notes";
import statisticsRouter from "./statistics";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import commentsRouter from "./comments";
import flashcardsRouter from "./flashcards";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(subjectsRouter);
router.use(dossiersRouter);
router.use(worksheetsRouter);
router.use(examsRouter);
router.use(studyplanRouter);
router.use(sessionsRouter);
router.use(notesRouter);
router.use(statisticsRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);
router.use("/comments", commentsRouter);
router.use("/admin", adminRouter);
// Flashcards routes — handled directly inside the file at /flashcard-decks and /flashcards
router.use(flashcardsRouter);

export default router;
