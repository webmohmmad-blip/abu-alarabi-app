import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { notesTable, subjectsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/notes", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { subjectId, dossierId } = req.query as Record<string, string>;

  let notes = await db
    .select({
      note: notesTable,
      subjectName: subjectsTable.name,
    })
    .from(notesTable)
    .leftJoin(subjectsTable, eq(notesTable.subjectId, subjectsTable.id))
    .where(eq(notesTable.userId, aReq.userId));

  if (subjectId) {
    notes = notes.filter((n) => n.note.subjectId === parseInt(subjectId, 10));
  }
  if (dossierId) {
    notes = notes.filter(
      (n) => n.note.dossierId === parseInt(dossierId, 10)
    );
  }

  res.json(
    notes.map(({ note, subjectName }) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      subjectId: note.subjectId,
      subjectName: subjectName ?? "",
      dossierId: note.dossierId,
      sessionId: note.sessionId,
      tags: note.tags ?? [],
      isPinned: note.isPinned,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }))
  );
});

router.post("/notes", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { title, content, subjectId, dossierId, sessionId, tags } = req.body as {
    title: string;
    content: string;
    subjectId: number;
    dossierId?: number;
    sessionId?: number;
    tags?: string[];
  };

  if (!title) {
    res.status(400).json({ error: "عنوان الملاحظة مطلوب" });
    return;
  }
  if (content == null) {
    res.status(400).json({ error: "محتوى الملاحظة مطلوب" });
    return;
  }

  const [note] = await db
    .insert(notesTable)
    .values({
      userId: aReq.userId,
      subjectId,
      dossierId: dossierId ?? null,
      sessionId: sessionId ?? null,
      title,
      content,
      tags: tags ?? [],
      isPinned: false,
    })
    .returning();

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, subjectId));

  res.status(201).json({
    id: note.id,
    title: note.title,
    content: note.content,
    subjectId: note.subjectId,
    subjectName: subject?.name ?? "",
    dossierId: note.dossierId,
    sessionId: note.sessionId,
    tags: note.tags ?? [],
    isPinned: note.isPinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });
});

router.patch("/notes/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const noteId = parseInt(rawId, 10);
  const { title, content, tags, isPinned } = req.body as {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
  };

  const [note] = await db
    .update(notesTable)
    .set({
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && { tags }),
      ...(isPinned !== undefined && { isPinned }),
    })
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, aReq.userId)))
    .returning();

  if (!note) {
    res.status(404).json({ error: "الملاحظة غير موجودة" });
    return;
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, note.subjectId));

  res.json({
    id: note.id,
    title: note.title,
    content: note.content,
    subjectId: note.subjectId,
    subjectName: subject?.name ?? "",
    dossierId: note.dossierId,
    sessionId: note.sessionId,
    tags: note.tags ?? [],
    isPinned: note.isPinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });
});

router.delete("/notes/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const noteId = parseInt(rawId, 10);

  const [note] = await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, aReq.userId)))
    .returning();

  if (!note) {
    res.status(404).json({ error: "الملاحظة غير موجودة" });
    return;
  }

  res.sendStatus(204);
});

export default router;
