// src/lib/integrations/google/gmail.js

import { getValidAccessToken } from "@/lib/integrations/google/tokens";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Authenticated fetch against the Gmail API.
 * Uses the existing per-org token infrastructure (auto-refresh on expiry).
 */
async function gmailFetch(orgId, path, params = {}) {
  const accessToken = await getValidAccessToken(orgId);
  const url = new URL(`${GMAIL_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || `Gmail API error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.gmailError = data?.error;
    throw err;
  }
  return data;
}

/** Get the Gmail profile (emailAddress, messagesTotal, historyId). */
export async function getGmailProfile(orgId) {
  return gmailFetch(orgId, "/profile");
}

/**
 * List recent inbox message IDs.
 * Returns { messages: [{id, threadId}], nextPageToken, resultSizeEstimate }
 */
export async function listInboxMessages(
  orgId,
  { maxResults = 50, pageToken = null } = {},
) {
  return gmailFetch(orgId, "/messages", {
    q: "in:inbox",
    maxResults,
    ...(pageToken ? { pageToken } : {}),
  });
}

/**
 * List history since a given historyId (incremental sync).
 * Returns { history: [...], historyId: "latest" }
 */
export async function listHistory(orgId, startHistoryId) {
  return gmailFetch(orgId, "/history", {
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });
}

/**
 * Get a full message by ID.
 * format: "metadata" | "full"
 */
export async function getMessage(orgId, messageId, format = "full") {
  return gmailFetch(orgId, `/messages/${messageId}`, { format });
}

/**
 * Parse a Gmail message response into a clean object for case creation.
 */
export function parseGmailMessage(msg) {
  const headers = msg?.payload?.headers || [];
  const getHeader = (name) =>
    headers
      .find((h) => h.name.toLowerCase() === name.toLowerCase())
      ?.value || null;

  const fromRaw = getHeader("From") || "";
  const emailMatch = fromRaw.match(/<([^>]+)>/);
  const senderEmail = emailMatch
    ? emailMatch[1].trim().toLowerCase()
    : fromRaw.trim().toLowerCase();
  const senderName = emailMatch
    ? fromRaw.replace(/<[^>]+>/, "").replace(/"/g, "").trim()
    : "";

  const subject = getHeader("Subject") || "(no subject)";
  const dateStr = getHeader("Date") || null;
  const snippet = msg?.snippet || "";

  let bodyText = snippet;
  if (msg?.payload?.body?.data) {
    try {
      bodyText = Buffer.from(msg.payload.body.data, "base64url").toString(
        "utf-8",
      );
    } catch {
      /* use snippet */
    }
  } else if (msg?.payload?.parts) {
    const textPart = msg.payload.parts.find(
      (p) => p.mimeType === "text/plain" && p.body?.data,
    );
    if (textPart?.body?.data) {
      try {
        bodyText = Buffer.from(textPart.body.data, "base64url").toString(
          "utf-8",
        );
      } catch {
        /* use snippet */
      }
    }
  }

  return {
    messageId: msg?.id || null,
    senderEmail,
    senderName,
    subject,
    dateStr,
    bodyText: bodyText || snippet,
    snippet,
    labelIds: msg?.labelIds || [],
  };
}
