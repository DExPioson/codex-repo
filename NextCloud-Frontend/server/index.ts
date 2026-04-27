import express from "express";
import { storage } from "./storage";
import {
  bootstrapDelegatedSession,
  revokeDelegatedCredential,
} from "./credential-provider";
import {
  createFolder,
  deleteFile,
  downloadFile,
  getFile,
  getCurrentUser,
  getDashboardData,
  listFiles,
  uploadFile,
} from "./nextcloud-client";
import {
  createBoard,
  createCard,
  createContact,
  createConversation,
  createEmail,
  createEvent,
  createNote,
  createStack,
  deleteCard,
  deleteContact,
  deleteConversation,
  deleteEmail,
  deleteEvent,
  deleteNote,
  getBoard,
  getContact,
  getConversation,
  getEmail,
  getEmailCounts,
  getEvent,
  getNote,
  leaveConversation,
  listContacts,
  listConversationMessages,
  listConversations,
  listEmails,
  listEvents,
  listNotes,
  listBoards,
  markConversationRead,
  sendConversationMessage,
  setConversationModerator,
  setConversationMute,
  updateCard,
  updateContact,
  updateEmail,
  updateEvent,
  updateNote,
} from "./groupware-client";
import {
  clearNextcloudSession,
  createNextcloudSession,
  getNextcloudSession,
  updateNextcloudSession,
} from "./session-store";
import { getCapabilities } from "./capability-store";

const app = express();
app.use(express.json());

const ALLOW_MOCK_SERVICES = process.env.ALLOW_MOCK_SERVICES === "true";

type ConversationCallState = {
  conversationId: number;
  type: "voice" | "video" | "screen";
  initiatorName: string;
  active: boolean;
  acceptedBy: string[];
  declinedBy: string[];
  isScreenSharing: boolean;
  startedAt: string;
  updatedAt: string;
  offer?: { type: string; sdp?: string };
  offerFrom?: string;
  answer?: { type: string; sdp?: string };
  answerFrom?: string;
  iceCandidates: Array<{ id: string; from: string; candidate: { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null } }>;
};

const conversationCalls = new Map<number, ConversationCallState>();

function requireNextcloudSession(req: express.Request, res: express.Response) {
  const session = getNextcloudSession(req);
  if (!session) {
    res.status(401).json({ ok: false, message: "Please sign in to Nextcloud." });
    return null;
  }
  return session;
}

async function requireCapability(
  session: NonNullable<ReturnType<typeof getNextcloudSession>>,
  res: express.Response,
  feature: "talk" | "deck" | "calendar" | "contacts" | "notes" | "mail" | "activity",
) {
  const snapshot = await getCapabilities(session);
  if (!snapshot.capabilities[feature]) {
    res.status(404).json({
      error: "This feature is not available on the connected Nextcloud instance.",
      code: "feature_unavailable",
      feature,
    });
    return false;
  }

  return true;
}

function blockMockRoutes(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (ALLOW_MOCK_SERVICES) {
    next();
    return;
  }

  res.status(501).json({
    ok: false,
    error: "This endpoint still uses mock data and is disabled until it is wired to Nextcloud.",
    code: "feature_unavailable",
  });
}

app.use(/^\/api\/(activity|activities)(?:\/.*)?$/, blockMockRoutes);

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Username/email and password are required." });
  }

  try {
    const { session, user } = await bootstrapDelegatedSession(email, password);
    createNextcloudSession(res, session);
    res.json({ ok: true, user });
  } catch {
    res.status(401).json({ ok: false, message: "Invalid Nextcloud credentials." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const session = getNextcloudSession(req);
  if (session) {
    try {
      await revokeDelegatedCredential(session);
    } catch {
      // Keep local logout resilient even if remote token revocation fails.
    }
  }

  clearNextcloudSession(req, res);
  res.json({ ok: true });
});

app.get("/api/auth/session", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const user = await getCurrentUser(session);
    res.json({ ok: true, user });
  } catch {
    clearNextcloudSession(req, res);
    res.status(401).json({ ok: false, message: "Nextcloud session expired." });
  }
});

app.get("/api/capabilities", async (req, res) => {
  const session = getNextcloudSession(req);
  const snapshot = await getCapabilities(session || undefined);

  res.json({
    ...snapshot.capabilities,
    source: snapshot.source,
    checkedAt: snapshot.checkedAt,
    apps: snapshot.apps,
  });
});

// User
app.get("/api/user", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const user = await getCurrentUser(session);
    res.json({ data: user });
  } catch {
    res.status(502).json({ error: "Unable to load user from Nextcloud." });
  }
});

app.patch("/api/user", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const nextName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!nextName) {
    return res.status(400).json({ error: "Display name is required." });
  }

  updateNextcloudSession(req, { displayNameOverride: nextName });

  try {
    const user = await getCurrentUser(getNextcloudSession(req) || session);
    res.json({ data: user });
  } catch {
    res.status(502).json({ error: "Unable to update user profile." });
  }
});

// Dashboard aggregate
app.get("/api/dashboard", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const data = await getDashboardData(session, { includeMockData: ALLOW_MOCK_SERVICES });
    res.json({ data });
  } catch {
    res.status(502).json({ error: "Unable to load dashboard data from Nextcloud." });
  }
});

// Files
app.get("/api/files", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const parentPath = (req.query.path as string) || "/";
  try {
    const files = await listFiles(session, parentPath);
    res.json({ data: files });
  } catch {
    res.status(502).json({ error: "Unable to load files from Nextcloud." });
  }
});

app.get("/api/files/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const cloudPath = typeof req.query.path === "string" ? req.query.path : "";
  if (!cloudPath) {
    return res.status(400).json({ error: "File path is required." });
  }

  try {
    if (req.query.download === "1") {
      const file = await downloadFile(session, cloudPath);
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.send(file.buffer);
      return;
    }

    const file = await getFile(session, cloudPath);
    if (!file) return res.status(404).json({ error: "Not found" });
    res.json({ data: file });
  } catch {
    res.status(502).json({ error: "Unable to load file from Nextcloud." });
  }
});

app.post("/api/files", express.raw({ type: "application/octet-stream", limit: "100mb" }), async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const headerContentType = Array.isArray(req.headers["content-type"])
    ? req.headers["content-type"][0] ?? ""
    : req.headers["content-type"] ?? "";
  const fileName = typeof req.headers["x-file-name"] === "string" ? req.headers["x-file-name"] : "";
  const uploadParentPath = typeof req.headers["x-parent-path"] === "string" ? req.headers["x-parent-path"] : "/";
  const uploadContentType =
    typeof req.headers["x-file-content-type"] === "string" ? req.headers["x-file-content-type"] : "application/octet-stream";
  const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
  const isBinaryUpload =
    Boolean(fileName) ||
    Boolean(rawBody) ||
    (typeof headerContentType === "string" && headerContentType.startsWith("application/octet-stream"));

  if (isBinaryUpload) {
    if (!fileName || !rawBody) {
      return res.status(400).json({ error: "Upload file name and content are required." });
    }

    try {
      const file = await uploadFile(session, uploadParentPath, fileName, rawBody, uploadContentType);
      res.json({ data: file });
    } catch {
      res.status(502).json({ error: "Unable to upload file to Nextcloud." });
    }
    return;
  }

  const requestBody = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const { name, type = "folder", parentPath: folderParentPath = "/" } = requestBody as {
    name?: string;
    type?: string;
    parentPath?: string;
  };
  if (type !== "folder") {
    return res.status(400).json({ error: "Unsupported file operation." });
  }

  try {
    const file = await createFolder(session, folderParentPath, name);
    res.json({ data: file });
  } catch {
    res.status(502).json({ error: "Unable to create folder in Nextcloud." });
  }
});

app.patch("/api/files/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = storage.getFile(id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = storage.updateFile(id, req.body);
  res.json({ data: updated });
});

app.delete("/api/files/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const cloudPath = typeof req.query.path === "string" ? req.query.path : "";
  if (!cloudPath) {
    return res.status(400).json({ error: "File path is required." });
  }

  try {
    const result = await deleteFile(session, cloudPath);
    res.json({ data: result });
  } catch {
    res.status(502).json({ error: "Unable to delete file from Nextcloud." });
  }
});

// Conversations
app.get("/api/conversations", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    res.json({ data: await listConversations(session) });
  } catch {
    res.status(502).json({ error: "Unable to load conversations from Nextcloud Talk." });
  }
});
app.get("/api/conversations/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const conversation = await getConversation(session, Number(req.params.id));
    if (!conversation) return res.status(404).json({ error: "Not found" });
    res.json({ data: conversation });
  } catch {
    res.status(502).json({ error: "Unable to load conversation from Nextcloud Talk." });
  }
});
app.post("/api/conversations", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const conversation = await createConversation(session, req.body?.name || "New conversation", req.body?.type || "group");
    res.json({ data: conversation });
  } catch {
    res.status(502).json({ error: "Unable to create conversation in Nextcloud Talk." });
  }
});
app.patch("/api/conversations/:id/read", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const success = await markConversationRead(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to mark conversation as read." });
  }
});
app.patch("/api/conversations/:id/mute", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const updated = await setConversationMute(session, Number(req.params.id), Boolean(req.body?.muted));
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ data: updated });
  } catch {
    res.status(502).json({ error: "Unable to update conversation notification level." });
  }
});
app.patch("/api/conversations/:id/admin", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const updated = await setConversationModerator(session, Number(req.params.id), Number(req.body?.adminId));
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ data: updated });
  } catch {
    res.status(502).json({ error: "Unable to update conversation moderator." });
  }
});
app.delete("/api/conversations/:id/members/me", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const success = await leaveConversation(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to leave conversation." });
  }
});
app.delete("/api/conversations/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const success = await deleteConversation(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to delete conversation." });
  }
});

// Messages
app.get("/api/conversations/:id/messages", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    res.json({ data: await listConversationMessages(session, Number(req.params.id)) });
  } catch {
    res.status(502).json({ error: "Unable to load messages from Nextcloud Talk." });
  }
});
app.post("/api/conversations/:id/messages", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "talk"))) return;

  try {
    const message = await sendConversationMessage(session, Number(req.params.id), String(req.body?.content || ""));
    res.json({ data: message });
  } catch {
    res.status(502).json({ error: "Unable to send message to Nextcloud Talk." });
  }
});

// Call signaling
app.get("/api/conversations/:id/call", (req, res) => {
  const conversationId = Number(req.params.id);
  const call = conversationCalls.get(conversationId) || null;
  res.json({ data: call });
});

app.post("/api/conversations/:id/call/start", (req, res) => {
  const conversationId = Number(req.params.id);
  const now = new Date().toISOString();
  const type = req.body.type as "voice" | "video" | "screen";
  const initiatorName = (req.body.initiatorName as string) || "User";

  const next: ConversationCallState = {
    conversationId,
    type,
    initiatorName,
    active: true,
    acceptedBy: [initiatorName],
    declinedBy: [],
    isScreenSharing: type === "screen",
    startedAt: now,
    updatedAt: now,
    iceCandidates: [],
  };
  conversationCalls.set(conversationId, next);
  res.json({ data: next });
});

app.post("/api/conversations/:id/call/accept", (req, res) => {
  const conversationId = Number(req.params.id);
  const existing = conversationCalls.get(conversationId);
  if (!existing || !existing.active) return res.status(404).json({ error: "No active call" });

  const userName = (req.body.userName as string) || "User";
  if (!existing.acceptedBy.includes(userName)) {
    existing.acceptedBy.push(userName);
  }
  existing.updatedAt = new Date().toISOString();
  conversationCalls.set(conversationId, existing);
  res.json({ data: existing });
});

app.post("/api/conversations/:id/call/decline", (req, res) => {
  const conversationId = Number(req.params.id);
  const existing = conversationCalls.get(conversationId);
  if (!existing || !existing.active) return res.status(404).json({ error: "No active call" });

  const userName = (req.body.userName as string) || "User";
  if (!existing.declinedBy.includes(userName)) {
    existing.declinedBy.push(userName);
  }
  existing.updatedAt = new Date().toISOString();
  conversationCalls.set(conversationId, existing);
  res.json({ data: existing });
});

app.patch("/api/conversations/:id/call", (req, res) => {
  const conversationId = Number(req.params.id);
  const existing = conversationCalls.get(conversationId);
  if (!existing || !existing.active) return res.status(404).json({ error: "No active call" });

  if (typeof req.body.isScreenSharing === "boolean") {
    existing.isScreenSharing = req.body.isScreenSharing;
  }
  if (req.body.offer) {
    existing.offer = req.body.offer as { type: string; sdp?: string };
    existing.offerFrom = (req.body.offerFrom as string) || "User";
    existing.answer = undefined;
    existing.answerFrom = undefined;
    existing.iceCandidates = [];
  }
  if (req.body.answer) {
    existing.answer = req.body.answer as { type: string; sdp?: string };
    existing.answerFrom = (req.body.answerFrom as string) || "User";
  }
  if (req.body.iceCandidate && req.body.iceFrom) {
    existing.iceCandidates.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: req.body.iceFrom as string,
      candidate: req.body.iceCandidate as { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null },
    });
    if (existing.iceCandidates.length > 200) {
      existing.iceCandidates = existing.iceCandidates.slice(-200);
    }
  }
  existing.updatedAt = new Date().toISOString();
  conversationCalls.set(conversationId, existing);
  res.json({ data: existing });
});

app.post("/api/conversations/:id/call/end", (req, res) => {
  const conversationId = Number(req.params.id);
  conversationCalls.delete(conversationId);
  res.json({ data: { success: true } });
});

// Events
app.get("/api/events", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "calendar"))) return;

  try {
    res.json({ data: await listEvents(session) });
  } catch {
    res.status(502).json({ error: "Unable to load events from Nextcloud Calendar." });
  }
});
app.get("/api/events/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "calendar"))) return;

  try {
    const event = await getEvent(session, Number(req.params.id));
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json({ data: event });
  } catch {
    res.status(502).json({ error: "Unable to load event from Nextcloud Calendar." });
  }
});
app.post("/api/events", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "calendar"))) return;

  try {
    res.json({ data: await createEvent(session, req.body) });
  } catch {
    res.status(502).json({ error: "Unable to create event in Nextcloud Calendar." });
  }
});
app.patch("/api/events/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "calendar"))) return;

  try {
    const updated = await updateEvent(session, Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ data: updated });
  } catch {
    res.status(502).json({ error: "Unable to update event in Nextcloud Calendar." });
  }
});
app.delete("/api/events/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "calendar"))) return;

  try {
    const success = await deleteEvent(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to delete event from Nextcloud Calendar." });
  }
});

// Notes
app.get("/api/notes", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "notes"))) return;

  try {
    res.json({ data: await listNotes(session) });
  } catch {
    res.status(502).json({ error: "Unable to load notes from Nextcloud WebDAV." });
  }
});
app.get("/api/notes/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "notes"))) return;

  try {
    const note = await getNote(session, Number(req.params.id));
    if (!note) return res.status(404).json({ error: "Not found" });
    res.json({ data: note });
  } catch {
    res.status(502).json({ error: "Unable to load note from Nextcloud WebDAV." });
  }
});
app.post("/api/notes", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "notes"))) return;

  try {
    res.json({ data: await createNote(session, req.body) });
  } catch {
    res.status(502).json({ error: "Unable to create note in Nextcloud WebDAV." });
  }
});
app.patch("/api/notes/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "notes"))) return;

  try {
    const updated = await updateNote(session, Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ data: updated });
  } catch {
    res.status(502).json({ error: "Unable to update note in Nextcloud WebDAV." });
  }
});
app.delete("/api/notes/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "notes"))) return;

  try {
    const success = await deleteNote(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to delete note from Nextcloud WebDAV." });
  }
});

// Contacts
app.get("/api/contacts", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "contacts"))) return;

  try {
    res.json({ data: await listContacts(session) });
  } catch {
    res.status(502).json({ error: "Unable to load contacts from Nextcloud CardDAV." });
  }
});
app.get("/api/contacts/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "contacts"))) return;

  try {
    const contact = await getContact(session, Number(req.params.id));
    if (!contact) return res.status(404).json({ error: "Not found" });
    res.json({ data: contact });
  } catch {
    res.status(502).json({ error: "Unable to load contact from Nextcloud CardDAV." });
  }
});
app.post("/api/contacts", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "contacts"))) return;

  try {
    res.json({ data: await createContact(session, req.body) });
  } catch {
    res.status(502).json({ error: "Unable to create contact in Nextcloud CardDAV." });
  }
});
app.patch("/api/contacts/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "contacts"))) return;

  try {
    const contact = await updateContact(session, Number(req.params.id), req.body);
    if (!contact) return res.status(404).json({ error: "Not found" });
    res.json({ data: contact });
  } catch {
    res.status(502).json({ error: "Unable to update contact in Nextcloud CardDAV." });
  }
});
app.delete("/api/contacts/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "contacts"))) return;

  try {
    const success = await deleteContact(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to delete contact from Nextcloud CardDAV." });
  }
});

// Boards
app.get("/api/boards", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    res.json({ data: await listBoards(session) });
  } catch {
    res.status(502).json({ error: "Unable to load boards from Nextcloud Deck." });
  }
});
app.get("/api/boards/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    res.json({ data: await getBoard(session, Number(req.params.id)) });
  } catch {
    res.status(502).json({ error: "Unable to load board from Nextcloud Deck." });
  }
});
app.post("/api/boards", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    res.json({ data: await createBoard(session, req.body) });
  } catch {
    res.status(502).json({ error: "Unable to create board in Nextcloud Deck." });
  }
});
app.post("/api/boards/:id/stacks", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    res.json({ data: await createStack(session, Number(req.params.id), String(req.body?.title || "Stack"), Number(req.body?.order || 0)) });
  } catch {
    res.status(502).json({ error: "Unable to create stack in Nextcloud Deck." });
  }
});
app.post("/api/boards/:boardId/stacks/:stackId/cards", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    res.json({ data: await createCard(session, Number(req.params.boardId), Number(req.params.stackId), req.body) });
  } catch {
    res.status(502).json({ error: "Unable to create card in Nextcloud Deck." });
  }
});

// Cards
app.patch("/api/cards/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    const card = await updateCard(session, Number(req.params.id), req.body);
    if (!card) return res.status(404).json({ error: "Not found" });
    res.json({ data: card });
  } catch {
    res.status(502).json({ error: "Unable to update card in Nextcloud Deck." });
  }
});
app.delete("/api/cards/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;
  if (!(await requireCapability(session, res, "deck"))) return;

  try {
    const success = await deleteCard(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to delete card from Nextcloud Deck." });
  }
});

// Emails — counts MUST be before :id route
app.get("/api/emails/counts", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    res.json({ data: await getEmailCounts(session) });
  } catch {
    res.status(502).json({ error: "Unable to load Nextcloud Mail counts." });
  }
});
app.get("/api/emails", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const folder = (req.query.folder as string) || "inbox";
  try {
    res.json({ data: await listEmails(session, folder) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load mail from Nextcloud Mail.";
    res.status(502).json({ error: message });
  }
});
app.get("/api/emails/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const email = await getEmail(session, Number(req.params.id));
    if (!email) return res.status(404).json({ error: "Not found" });
    if (!email.isRead) {
      await updateEmail(session, email.id, { isRead: true }).catch(() => undefined);
      const refreshed = await getEmail(session, Number(req.params.id));
      return res.json({ data: refreshed || email });
    }
    res.json({ data: email });
  } catch {
    res.status(502).json({ error: "Unable to load message from Nextcloud Mail." });
  }
});
app.post("/api/emails", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    res.json({ data: await createEmail(session, req.body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create message in Nextcloud Mail.";
    res.status(502).json({ error: message });
  }
});
app.patch("/api/emails/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const email = await updateEmail(session, Number(req.params.id), req.body);
    if (!email) return res.status(404).json({ error: "Not found" });
    res.json({ data: email });
  } catch {
    res.status(502).json({ error: "Unable to update message flags in Nextcloud Mail." });
  }
});
app.delete("/api/emails/:id", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const success = await deleteEmail(session, Number(req.params.id));
    res.json({ data: { success } });
  } catch {
    res.status(502).json({ error: "Unable to delete message from Nextcloud Mail." });
  }
});

// Activities
app.get("/api/activity", (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const type = (req.query.type as string) || "all";
  let all = storage.getActivities();
  if (type && type !== "all") {
    all = all.filter(a => a.type === type);
  }
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({ data: all.slice(0, limit) });
});
app.patch("/api/activity/:id/read", (req, res) => {
  storage.updateActivity(Number(req.params.id), { isRead: true });
  res.json({ data: { success: true } });
});
app.post("/api/activity/read-all", (_req, res) => {
  storage.markAllActivitiesRead();
  res.json({ data: { success: true } });
});
app.get("/api/activities", (_req, res) => res.json({ data: storage.getActivities() }));

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`CloudSpace API server running on http://localhost:${PORT}`);
  console.log(`Nextcloud upstream: ${process.env.NC_BASE_URL || "http://localhost:8090"}`);
  console.log(`Mock-backed endpoints: ${ALLOW_MOCK_SERVICES ? "enabled" : "disabled"}`);
});
