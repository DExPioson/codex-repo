import { parseWebDAVResponse, type WebDAVItem } from "./webdavParser";

const BASE_URL = import.meta.env.VITE_NEXTCLOUD_URL as string;

type OcsEnvelope<T> = {
  ocs: {
    meta: { status: string; statuscode: number; message?: string };
    data: T;
  };
};

type NextcloudUser = {
  id: string;
  displayname?: string;
  email?: string;
  quota?: Record<string, unknown>;
};

function authHeader(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function ocsHeaders(token: string, contentType = "application/json"): HeadersInit {
  return {
    ...authHeader(token),
    "OCS-APIRequest": "true",
    "Content-Type": contentType,
  };
}

export async function getCurrentUser(token: string): Promise<NextcloudUser> {
  const res = await fetch(`${BASE_URL}/ocs/v2.php/cloud/user?format=json`, {
    headers: ocsHeaders(token),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to get user info: ${res.status}`);
  const data = (await res.json()) as OcsEnvelope<NextcloudUser>;
  return data.ocs.data;
}

export async function listFiles(token: string, path = "/"): Promise<WebDAVItem[]> {
  const user = await getCurrentUser(token);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const target = `${BASE_URL}/remote.php/dav/files/${encodeURIComponent(user.id)}${cleanPath}`;

  const res = await fetch(target, {
    method: "PROPFIND",
    headers: {
      ...authHeader(token),
      Depth: "1",
      "Content-Type": "application/xml",
    },
    body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <d:getcontenttype/>
    <d:resourcetype/>
    <oc:fileid/>
    <oc:permissions/>
    <oc:size/>
  </d:prop>
</d:propfind>`,
    credentials: "include",
  });

  if (res.status !== 207) throw new Error(`PROPFIND failed: ${res.status}`);
  return parseWebDAVResponse(await res.text(), cleanPath);
}

export async function uploadFile(token: string, path: string, file: Blob): Promise<Response> {
  const user = await getCurrentUser(token);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(
    `${BASE_URL}/remote.php/dav/files/${encodeURIComponent(user.id)}${cleanPath}`,
    {
      method: "PUT",
      headers: {
        ...authHeader(token),
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
      credentials: "include",
    },
  );

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res;
}

export async function createShareLink(token: string, path: string, shareType = 3) {
  const form = new URLSearchParams({
    path,
    shareType: String(shareType),
    permissions: "1",
  });

  const res = await fetch(`${BASE_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json`, {
    method: "POST",
    headers: ocsHeaders(token, "application/x-www-form-urlencoded"),
    body: form,
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Failed to create share: ${res.status}`);
  const data = (await res.json()) as OcsEnvelope<Record<string, unknown>>;
  return data.ocs.data;
}
