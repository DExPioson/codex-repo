import { createHash } from "node:crypto";
import { storage } from "./storage";
import type { NextcloudSession } from "./credential-provider";
import { resolveCurrentUser } from "./credential-provider";

const NC_BASE_URL = process.env.NC_BASE_URL || "http://localhost:8090";

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

function getParentPath(cloudPath: string) {
  const normalized = normalizeCloudPath(cloudPath);
  if (normalized === "/") return "/";
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return `/${parts.slice(0, -1).join("/")}`;
}

function getBaseName(cloudPath: string) {
  const normalized = normalizeCloudPath(cloudPath);
  return normalized.split("/").filter(Boolean).at(-1) || "";
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

function parseDavResponses(xml: string, username: string, parentPath: string) {
  const blocks = xml.match(/<(?:\w+:)?response\b[\s\S]*?<\/(?:\w+:)?response>/gi) || [];
  const currentDavHref = decodeURIComponent(toDavUrl(username, parentPath)).replace(/\/+$/, "");
  const files: DavFile[] = [];

  for (const block of blocks) {
    const hrefRaw = decodeXml(extractTagValue(block, "href"));
    if (!hrefRaw) continue;

    const hrefPath = decodeURIComponent(hrefRaw.replace(/^https?:\/\/[^/]+/i, "")).replace(/\/+$/, "");
    if (!hrefPath || hrefPath === currentDavHref) continue;

    const displayName =
      decodeXml(extractTagValue(block, "displayname")) ||
      hrefPath.split("/").filter(Boolean).at(-1) ||
      "Untitled";
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

function toBasicAuth(session: NextcloudSession) {
  return Buffer.from(`${session.username}:${session.credential.secret}`).toString("base64");
}

async function nextcloudFetch(session: NextcloudSession, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Basic ${toBasicAuth(session)}`);

  return fetch(`${NC_BASE_URL}${path}`, {
    ...init,
    headers,
  });
}

export async function getCurrentUser(session: NextcloudSession) {
  return resolveCurrentUser(session);
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

export async function uploadFile(
  session: NextcloudSession,
  parentPath: string,
  name: string,
  content: Buffer,
  contentType: string,
) {
  const parent = normalizeCloudPath(parentPath);
  const filePath = parent === "/" ? `/${name}` : `${parent}/${name}`;
  const response = await nextcloudFetch(session, toDavUrl(session.username, filePath), {
    method: "PUT",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`WebDAV PUT failed: ${response.status}`);
  }

  const files = await listFiles(session, parent);
  const uploaded = files.find((file) => file.path === filePath || file.name === name);
  if (!uploaded) {
    throw new Error("Uploaded file could not be reloaded from Nextcloud.");
  }

  return uploaded;
}

export async function getFile(session: NextcloudSession, cloudPath: string) {
  const parent = getParentPath(cloudPath);
  const name = getBaseName(cloudPath);
  const files = await listFiles(session, parent);
  return files.find((file) => file.path === normalizeCloudPath(cloudPath) || file.name === name) || null;
}

export async function downloadFile(session: NextcloudSession, cloudPath: string) {
  const response = await nextcloudFetch(session, toDavUrl(session.username, cloudPath), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`WebDAV GET failed: ${response.status}`);
  }

  const file = await getFile(session, cloudPath);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    contentType: response.headers.get("content-type") || file?.mimeType || "application/octet-stream",
    name: file?.name || getBaseName(cloudPath) || "download",
  };
}

export async function deleteFile(session: NextcloudSession, cloudPath: string) {
  const response = await nextcloudFetch(session, toDavUrl(session.username, cloudPath), {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV DELETE failed: ${response.status}`);
  }

  return { success: true };
}

export async function getDashboardData(
  session: NextcloudSession,
  options: { includeMockData: boolean },
) {
  const [user, rootFiles] = await Promise.all([
    getCurrentUser(session),
    listFiles(session, "/"),
  ]);

  const recentFiles = rootFiles
    .filter((file) => file.type === "file")
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 5);

  const convos = options.includeMockData ? storage.getConversations() : [];
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
  const upcomingEvents = options.includeMockData
    ? storage
        .getEvents()
        .filter((event) => event.startAt >= now || event.allDay)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .slice(0, 3)
    : [];

  return {
    recentFiles,
    upcomingEvents,
    unreadMessages,
    recentMessages,
    storageUsed: user.storageUsed || 0,
    storageQuota: user.storageQuota || 0,
    recentActivity: options.includeMockData ? storage.getActivities().slice(0, 4) : [],
    integrationMode: options.includeMockData ? "mixed" : "nextcloud-only",
  };
}
