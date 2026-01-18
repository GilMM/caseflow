// src/lib/workspaceCache.js
"use client";

/**
 * Simple in-memory cache for workspace data to avoid
 * repeated Supabase calls on every navigation.
 * Cache expires after 5 minutes.
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let workspaceCache = {
  data: null,
  timestamp: 0,
};

let announcementsCache = {
  data: null,
  orgId: null,
  timestamp: 0,
};

export function getCachedWorkspace() {
  const now = Date.now();
  if (workspaceCache.data && now - workspaceCache.timestamp < CACHE_TTL) {
    return workspaceCache.data;
  }
  return null;
}

export function setCachedWorkspace(data) {
  workspaceCache = {
    data,
    timestamp: Date.now(),
  };
}

export function invalidateWorkspaceCache() {
  workspaceCache = { data: null, timestamp: 0 };
}

export function getCachedAnnouncements(orgId) {
  const now = Date.now();
  if (
    announcementsCache.data &&
    announcementsCache.orgId === orgId &&
    now - announcementsCache.timestamp < CACHE_TTL
  ) {
    return announcementsCache.data;
  }
  return null;
}

export function setCachedAnnouncements(orgId, data) {
  announcementsCache = {
    data,
    orgId,
    timestamp: Date.now(),
  };
}

export function invalidateAnnouncementsCache() {
  announcementsCache = { data: null, orgId: null, timestamp: 0 };
}
