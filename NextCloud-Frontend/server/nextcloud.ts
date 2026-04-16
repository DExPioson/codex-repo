import type { Request, Response } from "express";
import { randomBytes, createHash } from "node:crypto";
import { storage } from "./storage";

const NC_BASE_URL = process.env.NC_BASE_URL || "http://localhost:8080";
const SESSION_COOKIE = "cloudspace_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type NextcloudSession = {
  username: string;
  password: string;
  displayNameOverride?: string;
};

type DavFile = {
  id: number;
  name: string;
  path: string;
  type: "file" | "folder";
  mimeType: string | null;
  size: number;
  modifiedAt: string;
  sharedWith: string | null;
  isFavourite: boolean;
  parentPath: string;
  ownerId: number;
};

const sessions = new Map<string, NextcloudSession>();

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey || rest.length === 0) continue;
    cookies[rawKey] = decodeURIComponent(rest.join("="));
  }

  return cookies;
}

function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.endsWith("@cloudspace.home")) {
    return trimmed.slice(0, trimmed.indexOf("@"));
  }
  return trimmed;
}

function normalizeCloudPath(input: string | undefined) {
  if (!input || input === "/") return "/";
  const withLeadingSlash = input.startsWith("/") ? input : `/${input}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function toDavUrl(username: string, cloudPath = "/") {
  const normalized = normalizeCloudPath(cloudPath);
  const encodedPath =
    normalized === "/"
      ? ""
      : normalized
          .split("/")
          .filter(Boolean)
          .map((segment) => encodeURIComponent(segment))
          .join("/");

  const suffix = encodedPath ? `/${encodedPath}` : "";
  return `/remote.php/dav/files/${encodeURIComponent(username)}${suffix}`;
}

function extractTagValue(source: string, tagName: string) {
  const pattern = new RegExp(
    `<(?:[\\w-]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`,
    "i",
  );
  return pattern.exec(source)?.[1]?.trim() ?? "";
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function hashToId(value: string) {
  const digest = createHash("sha1").update(value).digest("hex").slice(0, 8);
  return parseInt(digest, 16);
}

function usernameToStableUserId(username: string) {
  const digest = createHash("sha1").update(`user:${username}`).digest("hex").slice(0, 7);
  return parseInt(digest, 16);
}

function parseDavResponses(xml: string, username: string, parentPath: string) {
  const blocks = xml.match(/<(?:\w+:)?response\b[\s\S]*?<\/(?:\w+:)?response>/gi) || [];
  const currentDavHref = decodeURIComponent(toDavUrl(username, parentPath)).replace(/\/+$/, "");
  const files: DavFile[] = [];

  for (const block of blocks) {
    const hrefRaw = decodeXml(extractTagValue(block, "href"));
    if (!hrefRaw) continue;

    const hrefPath = decodeURIComponent(hrefRaw.replace(/^https?:\/\/[^/]+/i, "")).replace(/\/+$/, "");
    if (!hrefPath || hrefPath === currentDavHref) continue;

    const displayName = decodeXml(extractTagValue(block, "displayname")) || hrefPath.split("/").filter(Boolean).at(-1) || "Untitled";
    const contentType = decodeXml(extractTagValue(block, "getcontenttype")) || null;
    const contentLength = Number(extractTagValue(block, "getcontentlength") || 0);
    const lastModified = extractTagValue(block, "getlastmodified");
    const isFolder = /<(?:\w+:)?collection\s*\/?>/i.test(block);
    const davPrefix = `/remote.php/dav/files/${encodeURIComponent(username)}`;
    const cloudPathRaw = hrefPath.startsWith(davPrefix) ? hrefPath.slice(davPrefix.length) || "/" : hrefPath;
    const cloudPath = normalizeCloudPath(cloudPathRaw);

    files.push({
      id: hashToId(cloudPath),
      name: displayName,
      path: cloudPath,
      type: isFolder ? "folder" : "file",
      mimeType: isFolder ? null : contentType,
      size: Number.isFinite(contentLength) ? contentLength : 0,
      modifiedAt: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString(),
      sharedWith: null,
      isFavourite: false,
      parentPath: normalizeCloudPath(parentPath),
      ownerId: 1,
    });
  }

  return files.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function toBasicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString("base64");
}

async function nextcloudFetch(session: NextcloudSession, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Basic ${toBasicAuth(session.username, session.password)}`);

  return fetch(`${NC_BASE_URL}${path}`, {
    ...init,
    headers,
  });
}

async function nextcloudJson(session: NextcloudSession, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("OCS-APIRequest", "true");
  headers.set("Accept", "application/json");

  const response = await nextcloudFetch(session, path, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Nextcloud request failed: ${response.status} ${path}`);
  }

  return response.json();
}

function mapNextcloudUser(payload: any) {
  const data = payload?.ocs?.data || {};
  const quota = data.quota || {};

  return {
    id: usernameToStableUserId(data.id || "user"),
    name: data.displayname || data.id || "Nextcloud User",
    email: data.email || `${data.id || "user"}@cloudspace.home`,
    avatar: null,
    role: Array.isArray(data.groups) && data.groups.includes("admin") ? "admin" : "user",
    storageUsed: Number(quota.used || 0),
    storageQuota: Number(quota.quota || 0),
    username: data.id || "",
  };
}

export async function authenticateAgainstNextcloud(identifier: string, password: string) {
  const username = normalizeLoginIdentifier(identifier);
  const payload = await nextcloudJson(
    { username, password },
    "/ocs/v2.php/cloud/user?format=json",
  );

  const user = mapNextcloudUser(payload);
  if (!user.username) {
    throw new Error("Authenticated user did not include an id");
  }

  return {
    session: {
      username: user.username,
      password,
    },
    user,
  };
}

export function createNextcloudSession(res: Response, session: NextcloudSession) {
  const token = randomBytes(24).toString("hex");
  sessions.set(token, session);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Lax`,
  );
}

export function clearNextcloudSession(req: Request, res: Response) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

export function getNextcloudSession(req: Request) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return token ? sessions.get(token) : undefined;
}

export function updateNextcloudSession(req: Request, partial: Partial<NextcloudSession>) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const existing = sessions.get(token);
  if (!existing) return null;
  const next = { ...existing, ...partial };
  sessions.set(token, next);
  return next;
}

export async function getCurrentUser(session: NextcloudSession) {
  const payload = await nextcloudJson(session, "/ocs/v2.php/cloud/user?format=json");
  const mapped = mapNextcloudUser(payload);
  if (session.displayNameOverride) {
    return {
      ...mapped,
      name: session.displayNameOverride,
    };
  }
  return mapped;
}

export async function listFiles(session: NextcloudSession, parentPath: string) {
  const response = await nextcloudFetch(session, toDavUrl(session.username, parentPath), {
    method: "PROPFIND",
    headers: {
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
    },
    body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
    <d:getcontentlength />
    <d:getcontenttype />
    <d:getlastmodified />
    <d:resourcetype />
  </d:prop>
</d:propfind>`,
  });

  if (response.status === 404) return [];
  if (response.status !== 207) {
    throw new Error(`WebDAV PROPFIND failed: ${response.status}`);
  }

  return parseDavResponses(await response.text(), session.username, parentPath);
}

export async function createFolder(session: NextcloudSession, parentPath: string, name: string) {
  const parent = normalizeCloudPath(parentPath);
  const folderPath = parent === "/" ? `/${name}` : `${parent}/${name}`;
  const response = await nextcloudFetch(session, toDavUrl(session.username, folderPath), {
    method: "MKCOL",
  });

  if (!response.ok && response.status !== 405) {
    throw new Error(`WebDAV MKCOL failed: ${response.status}`);
  }

  return {
    id: hashToId(folderPath),
    name,
    path: folderPath,
    type: "folder" as const,
    mimeType: null,
    size: 0,
    modifiedAt: new Date().toISOString(),
    sharedWith: null,
    isFavourite: false,
    parentPath: parent,
    ownerId: 1,
  };
}

export async function getDashboardData(session: NextcloudSession) {
  const [user, rootFiles] = await Promise.all([
    getCurrentUser(session),
    listFiles(session, "/"),
  ]);

  const recentFiles = rootFiles
    .filter((file) => file.type === "file")
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 5);

  const convos = storage.getConversations();
  const unreadMessages = convos.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
  const recentConvos = convos
    .filter((conversation) => conversation.lastMessageAt)
    .sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""))
    .slice(0, 2);
  const recentMessages = recentConvos.map((conversation) => {
    const messages = storage.getMessages(conversation.id);
    return {
      conversation,
      message: messages[messages.length - 1],
    };
  });

  const now = new Date().toISOString();
  const upcomingEvents = storage
    .getEvents()
    .filter((event) => event.startAt >= now || event.allDay)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 3);

  return {
    recentFiles,
    upcomingEvents,
    unreadMessages,
    recentMessages,
    storageUsed: user.storageUsed || 0,
    storageQuota: user.storageQuota || 0,
    recentActivity: storage.getActivities().slice(0, 4),
  };
}
