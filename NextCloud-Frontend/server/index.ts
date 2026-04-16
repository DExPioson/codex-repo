import express from "express";
import { storage } from "./storage";
import {
  authenticateAgainstNextcloud,
  clearNextcloudSession,
  createFolder,
  createNextcloudSession,
  getCurrentUser,
  getDashboardData,
  getNextcloudSession,
  listFiles,
  updateNextcloudSession,
} from "./nextcloud";

const app = express();
app.use(express.json());

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

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Username/email and password are required." });
  }

  try {
    const { session, user } = await authenticateAgainstNextcloud(email, password);
    createNextcloudSession(res, session);
    res.json({ ok: true, user });
  } catch (_error) {
    res.status(401).json({ ok: false, message: "Invalid Nextcloud credentials." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearNextcloudSession(req, res);
  res.json({ ok: true });
});

app.get("/api/auth/session", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const user = await getCurrentUser(session);
    res.json({ ok: true, user });
  } catch (_error) {
    clearNextcloudSession(req, res);
    res.status(401).json({ ok: false, message: "Nextcloud session expired." });
  }
});

// User
app.get("/api/user", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const user = await getCurrentUser(session);
    res.json({ data: user });
  } catch (_error) {
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
  } catch (_error) {
    res.status(502).json({ error: "Unable to update user profile." });
  }
});

// Dashboard aggregate
app.get("/api/dashboard", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  try {
    const data = await getDashboardData(session);
    res.json({ data });
  } catch (_error) {
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
  } catch (_error) {
    res.status(502).json({ error: "Unable to load files from Nextcloud." });
  }
});

app.get("/api/files/:id", (req, res) => {
  const file = storage.getFile(Number(req.params.id));
  if (!file) return res.status(404).json({ error: "Not found" });
  res.json({ data: file });
});

app.post("/api/files", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const { name, type = "folder", parentPath = "/" } = req.body;
  if (type !== "folder") {
    return res.status(501).json({ error: "Only folder creation is wired to Nextcloud right now." });
  }

  try {
    const file = await createFolder(session, parentPath, name);
    res.json({ data: file });
  } catch (_error) {
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

app.delete("/api/files/:id", (req, res) => {
  storage.deleteFile(Number(req.params.id));
  res.json({ data: { success: true } });
});

// Conversations
app.get("/api/conversations", (_req, res) => {
  const convos = storage.getConversations();
  convos.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
  res.json({ data: convos });
});
app.get("/api/conversations/:id", (req, res) => {
  const conv = storage.getConversation(Number(req.params.id));
  if (!conv) return res.status(404).json({ error: "Not found" });
  res.json({ data: conv });
});
app.post("/api/conversations", (req, res) => {
  const conv = storage.createConversation(req.body);
  res.json({ data: conv });
});
app.patch("/api/conversations/:id/read", (req, res) => {
  storage.updateConversation(Number(req.params.id), { unreadCount: 0 });
  res.json({ data: { success: true } });
});
app.patch("/api/conversations/:id/mute", (req, res) => {
  const updated = storage.updateConversation(Number(req.params.id), { isMuted: req.body.muted });
  res.json({ data: { isMuted: updated?.isMuted } });
});
app.patch("/api/conversations/:id/admin", (req, res) => {
  const updated = storage.updateConversation(Number(req.params.id), { adminId: req.body.adminId });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ data: updated });
});
app.delete("/api/conversations/:id/members/me", (req, res) => {
  storage.deleteConversation(Number(req.params.id));
  res.json({ data: { success: true } });
});
app.delete("/api/conversations/:id", (req, res) => {
  storage.deleteConversation(Number(req.params.id));
  res.json({ data: { success: true } });
});

// Messages
app.get("/api/conversations/:id/messages", (req, res) => {
  const msgs = storage.getMessages(Number(req.params.id));
  msgs.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  res.json({ data: msgs });
});
app.post("/api/conversations/:id/messages", async (req, res) => {
  const session = requireNextcloudSession(req, res);
  if (!session) return;

  const conversationId = Number(req.params.id);
  const { content } = req.body;
  const sentAt = new Date().toISOString();

  let currentUser;
  try {
    currentUser = await getCurrentUser(session);
  } catch (_error) {
    return res.status(502).json({ error: "Unable to resolve current user from Nextcloud." });
  }

  const msg = storage.createMessage({
    conversationId,
    senderId: currentUser.id,
    senderName: currentUser.name,
    content,
    sentAt,
  });
  storage.updateConversation(conversationId, {
    lastMessage: content,
    lastMessageAt: sentAt,
  });
  res.json({ data: msg });
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
app.get("/api/events", (_req, res) => res.json({ data: storage.getEvents() }));
app.get("/api/events/:id", (req, res) => {
  const event = storage.getEvent(Number(req.params.id));
  if (!event) return res.status(404).json({ error: "Not found" });
  res.json({ data: event });
});
app.post("/api/events", (req, res) => {
  const event = storage.createEvent(req.body);
  res.json({ data: event });
});
app.patch("/api/events/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = storage.getEvent(id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = storage.updateEvent(id, req.body);
  res.json({ data: updated });
});
app.delete("/api/events/:id", (req, res) => {
  storage.deleteEvent(Number(req.params.id));
  res.json({ data: { success: true } });
});

// Notes
app.get("/api/notes", (_req, res) => {
  const allNotes = storage.getNotes();
  allNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ data: allNotes });
});
app.get("/api/notes/:id", (req, res) => {
  const note = storage.getNote(Number(req.params.id));
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json({ data: note });
});
app.post("/api/notes", (req, res) => {
  const note = storage.createNote(req.body);
  res.json({ data: note });
});
app.patch("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = storage.getNote(id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = storage.updateNote(id, { ...req.body, updatedAt: new Date().toISOString() });
  res.json({ data: updated });
});
app.delete("/api/notes/:id", (req, res) => {
  storage.deleteNote(Number(req.params.id));
  res.json({ data: { success: true } });
});

// Contacts
app.get("/api/contacts", (_req, res) => {
  const all = storage.getContacts();
  all.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ data: all });
});
app.get("/api/contacts/:id", (req, res) => {
  const c = storage.getContact(Number(req.params.id));
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json({ data: c });
});
app.post("/api/contacts", (req, res) => {
  const c = storage.createContact(req.body);
  res.json({ data: c });
});
app.patch("/api/contacts/:id", (req, res) => {
  const c = storage.updateContact(Number(req.params.id), req.body);
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json({ data: c });
});
app.delete("/api/contacts/:id", (req, res) => {
  storage.deleteContact(Number(req.params.id));
  res.json({ data: { success: true } });
});

// Boards
app.get("/api/boards", (_req, res) => res.json({ data: storage.getBoards() }));
app.get("/api/boards/:id", (req, res) => {
  const board = storage.getBoard(Number(req.params.id));
  if (!board) return res.status(404).json({ error: "Not found" });
  const boardStacks = storage.getStacks(board.id);
  const boardCards = storage.getCards(board.id);
  const stacksWithCards = boardStacks
    .sort((a, b) => a.order - b.order)
    .map(s => ({
      ...s,
      cards: boardCards.filter(c => c.stackId === s.id).sort((a, b) => a.order - b.order),
    }));
  res.json({ data: { board, stacks: stacksWithCards } });
});
app.post("/api/boards", (req, res) => {
  const b = storage.createBoard(req.body);
  res.json({ data: b });
});
app.post("/api/boards/:id/stacks", (req, res) => {
  const boardId = Number(req.params.id);
  const s = storage.createStack({ boardId, title: req.body.title, order: req.body.order });
  res.json({ data: s });
});
app.post("/api/boards/:boardId/stacks/:stackId/cards", (req, res) => {
  const boardId = Number(req.params.boardId);
  const stackId = Number(req.params.stackId);
  const c = storage.createCard({ ...req.body, boardId, stackId });
  res.json({ data: c });
});

// Cards
app.patch("/api/cards/:id", (req, res) => {
  const c = storage.updateCard(Number(req.params.id), req.body);
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json({ data: c });
});
app.delete("/api/cards/:id", (req, res) => {
  storage.deleteCard(Number(req.params.id));
  res.json({ data: { success: true } });
});

// Emails — counts MUST be before :id route
app.get("/api/emails/counts", (_req, res) => {
  res.json({ data: storage.getEmailCounts() });
});
app.get("/api/emails", (req, res) => {
  const folder = (req.query.folder as string) || "inbox";
  const all = storage.getEmails(folder);
  all.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  res.json({ data: all });
});
app.get("/api/emails/:id", (req, res) => {
  const email = storage.getEmail(Number(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  // Mark as read on fetch
  if (!email.isRead) {
    storage.updateEmail(email.id, { isRead: true });
  }
  res.json({ data: storage.getEmail(email.id) });
});
app.post("/api/emails", (req, res) => {
  const email = storage.createEmail(req.body);
  res.json({ data: email });
});
app.patch("/api/emails/:id", (req, res) => {
  const email = storage.updateEmail(Number(req.params.id), req.body);
  if (!email) return res.status(404).json({ error: "Not found" });
  res.json({ data: email });
});
app.delete("/api/emails/:id", (req, res) => {
  storage.deleteEmail(Number(req.params.id));
  res.json({ data: { success: true } });
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
});
