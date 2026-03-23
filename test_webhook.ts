import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Parse env
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim().replace(/^"|"$/g, '');
      process.env[match[1]] = val;
    }
  });
}

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LINE_UID = process.env.LINE_ADMIN_UID!;

// Build a fake LINE message event
const body = JSON.stringify({
  destination: "FAKE",
  events: [
    {
      type: "message",
      message: { type: "text", id: `test_${Date.now()}`, text: "ทดสอบ" },
      source: { type: "user", userId: LINE_UID },
      timestamp: Date.now(),
      replyToken: "noreply0000000000000000000000000000000"
    }
  ]
});

// Generate correct LINE signature
const signature = crypto.createHmac('SHA256', CHANNEL_SECRET).update(body).digest('base64');

console.log('Testing webhook at:', `${APP_URL}/api/line/webhook`);
console.log('Using LINE UID:', LINE_UID);
console.log('Generated Signature:', signature.substring(0, 20) + '...');
console.log('Body preview:', body.substring(0, 100));

async function test() {
  try {
    const res = await fetch(`${APP_URL}/api/line/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': signature
      },
      body
    });

    const json = await res.json().catch(() => null);
    console.log('\n--- RESPONSE ---');
    console.log('Status:', res.status);
    console.log('Body:', JSON.stringify(json, null, 2));

    if (res.status === 200) {
      console.log('\n✅ Webhook endpoint is working! Signature verified OK.');
    } else if (res.status === 401) {
      console.log('\n❌ Signature verification FAILED on the server!');
      console.log('   → Check that LINE_CHANNEL_SECRET in Vercel env matches your LINE channel.');
    } else {
      console.log('\n⚠️ Unexpected status code.');
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

test();
