/**
 * Guest session management for users who don't want to log in
 * Guest data is stored in localStorage on the client side
 * Server generates a temporary guest ID for session tracking
 */

import { nanoid } from "nanoid";

export interface GuestSession {
  guestId: string;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory store for guest sessions (in production, use Redis or database)
const guestSessions = new Map<string, GuestSession>();

/**
 * Create a new guest session
 */
export function createGuestSession(): GuestSession {
  const guestId = `guest_${nanoid(12)}`;
  const session: GuestSession = {
    guestId,
    createdAt: new Date(),
    lastActivity: new Date(),
  };
  guestSessions.set(guestId, session);
  return session;
}

/**
 * Get or create a guest session
 */
export function getOrCreateGuestSession(guestId?: string): GuestSession {
  if (guestId && guestSessions.has(guestId)) {
    const session = guestSessions.get(guestId)!;
    session.lastActivity = new Date();
    return session;
  }
  return createGuestSession();
}

/**
 * Validate guest session
 */
export function isValidGuestSession(guestId: string): boolean {
  const session = guestSessions.get(guestId);
  if (!session) return false;

  // Sessions expire after 30 days of inactivity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return session.lastActivity > thirtyDaysAgo;
}

/**
 * Clean up expired guest sessions
 */
export function cleanupExpiredSessions(): void {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const keysToDelete: string[] = [];
  
  guestSessions.forEach((session, guestId) => {
    if (session.lastActivity < thirtyDaysAgo) {
      keysToDelete.push(guestId);
    }
  });

  keysToDelete.forEach(guestId => guestSessions.delete(guestId));
}

// Clean up expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
