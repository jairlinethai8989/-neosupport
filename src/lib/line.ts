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
  postback?: {
    data: string;
    params?: {
      date?: string;
      datetime?: string;
    }
  };
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
  | { type: 'text'; text: string; quickReply?: any }
  | { type: 'sticker'; packageId: string; stickerId: string; quickReply?: any }
  | { type: 'image'; originalContentUrl: string; previewImageUrl: string; quickReply?: any }
  | { type: 'flex'; altText: string; contents: any; quickReply?: any };

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

/**
 * Links/Unlinks a Rich Menu for a specific user
 * Pass richMenuId as null to unlink and return to default
 */
export async function setRichMenuForUser(userId: string, richMenuId: string | null): Promise<void> {
  const url = richMenuId 
    ? `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`
    : `https://api.line.me/v2/bot/user/${userId}/richmenu`;
  
  const response = await fetch(url, {
    method: richMenuId ? "POST" : "DELETE",
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LINE RichMenu API error [${response.status}]: ${errorBody}`);
  }
}

/**
 * Creates a standard Flex Message JSON for Staff Alerts
 */
export function createStaffAlertFlex(ticket: {
  ticket_no: string;
  description: string;
  hospital_name: string;
  reporter_name: string;
  priority?: string;
}) {
  const priorityColor = ticket.priority === 'Critical' ? '#ef4444' : 
                       ticket.priority === 'High' ? '#f59e0b' : '#3b82f6';

  return {
    type: "bubble" as const,
    size: "mega" as const,
    header: {
      type: "box",
      layout: "baseline",
      contents: [
        {
          type: "text",
          text: "งานใหม่เข้าระบบ 🚨",
          weight: "bold",
          size: "lg",
          color: "#ffffff"
        }
      ],
      backgroundColor: priorityColor,
      paddingAll: "15px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: ticket.ticket_no,
          weight: "bold",
          size: "xl",
          margin: "md"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "โรงพยาบาล:",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: ticket.hospital_name,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "ผู้แจ้ง:",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: ticket.reporter_name,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5
                }
              ]
            }
          ]
        },
        {
          type: "separator",
          margin: "xxl"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          contents: [
            {
              type: "text",
              text: "รายละเอียดอาการ:",
              size: "sm",
              color: "#aaaaaa",
              margin: "md"
            },
            {
              type: "text",
              text: ticket.description,
              wrap: true,
              size: "md",
              color: "#333333",
              margin: "sm"
            }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#2563eb",
          action: {
            type: "uri",
            label: "🖐️ กดรับงาน (Claim)",
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/tickets`
          }
        },
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "ดูรายละเอียดงาน",
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/tickets`
          }
        }
      ],
      flex: 0
    }
  };
}

/**
 * Creates a Flex Message for Star Rating (Satisfaction Survey)
 */
export function createRatingFlex(ticketId: string, ticketNo: string) {
  return {
    type: "bubble" as const,
    size: "mega" as const,
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#4f46e5",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "ประเมินความพึงพอใจ ⭐",
          weight: "bold",
          color: "#ffffff",
          size: "lg",
          align: "center"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: `Ticket: ${ticketNo}`,
          weight: "bold",
          size: "md",
          align: "center"
        },
        {
          type: "text",
          text: "งานแก้ไขเสร็จเรียบร้อยแล้วค่ะ/ครับ รบกวนช่วยประเมินการบริการของเจ้าหน้าที่ เพื่อนำไปปรับปรุงให้ดียิ่งขึ้นนะคะ/ครับ",
          wrap: true,
          size: "sm",
          color: "#666666",
          align: "center"
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "xl",
          spacing: "xs",
          justifyContent: "center",
          contents: [1, 2, 3, 4, 5].map(star => ({
            type: "button",
            action: {
              type: "postback",
              label: `${star} ⭐`,
              data: `action=rate&ticket_id=${ticketId}&rating=${star}`,
              displayText: `ให้คะแนน ${star} ดาว ⭐`
            },
            flex: 1,
            color: "#f59e0b",
            style: "secondary",
            height: "sm"
          }))
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [1, 2, 3, 4, 5].map(star => ({
            type: "text",
            text: String(star),
            align: "center",
            size: "xs",
            color: "#999999",
            flex: 1
          }))
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "link",
          action: {
            type: "uri",
            label: "เขียนคำแนะนำเพิ่มเติม",
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketId}/rate`
          }
        }
      ]
    }
  };
}

/**
 * Creates a Flex Message for Reporting a Problem
 */
export function createReportPromptFlex() {
  return {
    type: "bubble" as const,
    size: "mega" as const,
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#ef4444",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: "📝 แจ้งรายละเอียดปัญหา",
          weight: "bold",
          color: "#ffffff",
          size: "lg",
          align: "center"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "รบกวนระบุปัญหาที่คุณพบ เพื่อเปิดใบงานนะคะ/ครับ",
          weight: "bold",
          size: "md",
          align: "center",
          wrap: true
        },
        {
          type: "text",
          text: "คุณสามารถส่งเป็นข้อความ หรือถ่ายรูปปัญหาที่เกิดขึ้นส่งมาได้เลยค่ะ/ครับ",
          size: "sm",
          color: "#666666",
          align: "center",
          wrap: true
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "message",
            label: "⌨️ พิมพ์รายละเอียด",
            text: "ระบุปัญหา: "
          }
        }
      ]
    }
  };
}
/**
 * Creates a Flex Message for confirming and creating a ticket
 */
export function createConfirmTicketFlex(description: string, fileCount: number = 0) {
  const shortDesc = description.length > 80 ? description.substring(0, 77) + "..." : description;
  
  return {
    type: "bubble" as const,
    size: "mega" as const,
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#06C755",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: "🚀 พร้อมเปิดใบงานแจ้งซ่อม",
          weight: "bold",
          color: "#ffffff",
          size: "lg",
          align: "center"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "สรุปรายละเอียดห้อง/อาการ:",
          weight: "bold",
          size: "sm",
          color: "#999999"
        },
        {
          type: "text",
          text: shortDesc || "(ยังไม่ได้ระบุรายละเอียด)",
          size: "md",
          wrap: true,
          weight: "bold"
        },
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          margin: "md",
          contents: [
            {
              type: "text",
              text: "📎 ไฟล์แนบ:",
              color: "#aaaaaa",
              size: "sm",
              flex: 2
            },
            {
              type: "text",
              text: `${fileCount} ไฟล์`,
              color: "#666666",
              size: "sm",
              flex: 5
            }
          ]
        },
        {
          type: "text",
          text: "ตรวจสอบความถูกต้องแล้วกดปุ่ม 'สร้างใบงาน' ด้านล่างเพื่อยืนยันนะคะ/ครับ",
          size: "xs",
          color: "#ef4444",
          margin: "lg",
          wrap: true,
          align: "center"
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          height: "sm",
          action: {
            type: "postback",
            label: "🛠️ สร้างใบงาน (Create Ticket)",
            data: "action=finalize_ticket",
            displayText: "กำลังสร้างใบงานแจ้งซ่อม..."
          }
        },
        {
          type: "button",
          style: "link",
          color: "#ef4444",
          height: "sm",
          action: {
            type: "message",
            label: "❌ ยกเลิกและเริ่มใหม่",
            text: "แจ้งซ่อม"
          }
        }
      ]
    }
  };
}
