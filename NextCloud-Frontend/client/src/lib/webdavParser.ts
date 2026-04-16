export interface WebDAVItem {
  href: string;
  name: string;
  size: number;
  modified: string | null;
  contentType: string | null;
  isDirectory: boolean;
  fileId: string | null;
  permissions: string | null;
}

/**
 * Parse a WebDAV PROPFIND multi-status XML response into file items.
 * Automatically strips the directory entry itself (first response = the folder).
 *
 * @param xmlString Raw XML string from the PROPFIND response
 * @param requestPath The path that was PROPFINDed (used to strip the parent entry)
 */
export function parseWebDAVResponse(
  xmlString: string,
  requestPath?: string
): WebDAVItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`WebDAV XML parse error: ${parseError.textContent}`);
  }

  const responses = Array.from(doc.querySelectorAll("response"));

  return responses
    .map((response) => {
      const href = decodeURIComponent(
        response.querySelector("href")?.textContent?.trim() ?? ""
      );
      const props = response.querySelector("prop");

      const name = href.replace(/\/$/, "").split("/").pop() ?? "";
      const isDirectory = !!props?.querySelector("resourcetype collection");
      const size = parseInt(
        props?.querySelector("getcontentlength")?.textContent ?? "0",
        10
      );

      return {
        href,
        name,
        size: isNaN(size) ? 0 : size,
        modified: props?.querySelector("getlastmodified")?.textContent ?? null,
        contentType: props?.querySelector("getcontenttype")?.textContent ?? null,
        isDirectory,
        fileId: props?.querySelector("fileid")?.textContent ?? null,
        permissions: props?.querySelector("permissions")?.textContent ?? null,
      };
    })
    .filter((item) => {
      if (!requestPath) return item.name !== "";
      const normalizedHref = item.href.replace(/\/$/, "");
      const normalizedPath = requestPath.replace(/\/$/, "");
      return !normalizedHref.endsWith(normalizedPath);
    });
}
