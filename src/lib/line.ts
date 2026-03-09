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
    // Sticker-specific fields
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

// ─── Signature Verification ──────────────────────────────────

/**
 * Verifies that the webhook request is legitimately from LINE.
 *
 * LINE signs each webhook request body using HMAC-SHA256 with
 * the Channel Secret as the key. We recompute the hash and
 * compare it with the `x-line-signature` header.
 *
 * @see https://developers.line.biz/en/docs/messaging-api/receiving-messages/#verifying-signatures
 */
export function verifySignature(
  body: string,
  signature: string,
  channelSecret: string,
): boolean {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "base64"),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

// ─── Reply Message ───────────────────────────────────────────

/**
 * Sends a reply message to the user via LINE Reply API.
 *
 * @param replyToken - One-time token from the webhook event (valid ~1 min)
 * @param messages   - Array of message objects to send
 */
export async function replyMessage(
  replyToken: string,
  messages: Array<any>,
): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LINE Reply API error [${response.status}]:`, errorBody);
  }
}

// ─── Get User Profile ────────────────────────────────────────

/**
 * Fetches a LINE user's profile (display name, avatar, etc.)
 *
 * @param userId - LINE user ID from the event source
 * @returns User profile or null if the request fails
 */
export async function getUserProfile(
  userId: string,
): Promise<LineUserProfile | null> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN");
    return null;
  }

  const response = await fetch(
    `https://api.line.me/v2/bot/profile/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error(
      `Failed to get LINE profile for ${userId}:`,
      response.status,
    );
    return null;
  }

  return response.json();
}

// ─── Push Message ────────────────────────────────────────────

/**
 * Sends a push message to a specific user via LINE Push API.
 * This is used when replying at a later time (without a reply token).
 *
 * @param to       - LINE user ID to send the message to
 * @param messages - Array of message objects to send
 */
export async function pushMessage(
  to: string,
  messages: Array<any>,
): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Missing LINE_CHANNEL_ACCESS_TOKEN");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LINE Push API error [${response.status}]:`, errorBody);
    throw new Error(`Failed to send LINE push message: ${response.status}`);
  }
}
