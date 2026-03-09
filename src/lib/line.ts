import crypto from "crypto";

// ============================================================
// LINE Messaging API Helpers
// ============================================================

// ─── Type Definitions ────────────────────────────────────────

export interface LineEvent {
  type: string;
  message?: {
    type: string;
    id: string;
    text?: string;
    packageId?: string;
    stickerId?: string;
  };
  source?: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  timestamp: number;
  replyToken?: string;
}

export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export type LineMessageShape = 
  | { type: 'text'; text: string }
  | { type: 'sticker'; packageId: string; stickerId: string }
  | { type: 'image'; originalContentUrl: string; previewImageUrl: string };

// ─── Internal Helpers ────────────────────────────────────────

const getAccessToken = () => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("CRITICAL: LINE_CHANNEL_ACCESS_TOKEN is not configured.");
  return token;
};

// ─── Signature Verification ──────────────────────────────────

/**
 * Verifies that the webhook request is legitimately from LINE.
 */
export function verifySignature(
  body: string,
  signature: string,
  channelSecret: string,
): boolean {
  if (!signature || !channelSecret) return false;
  
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "base64"),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

// ─── API Methods ─────────────────────────────────────────────

/**
 * Sends a reply message to the user via LINE Reply API.
 */
export async function replyMessage(
  replyToken: string,
  messages: LineMessageShape[],
): Promise<void> {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE Reply API error [${response.status}]: ${errorBody}`);
  }
}

/**
 * Fetches a LINE user's profile
 */
export async function getUserProfile(userId: string): Promise<LineUserProfile | null> {
  const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });

  if (!response.ok) {
    console.warn(`Could not fetch LINE profile for ${userId} [${response.status}]`);
    return null;
  }

  return response.json();
}

/**
 * Sends a push message via LINE Push API.
 */
export async function pushMessage(
  to: string,
  messages: LineMessageShape[],
): Promise<void> {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE Push API error [${response.status}]: ${errorBody}`);
  }
}
