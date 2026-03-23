import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
  });
}

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const TO = process.env.LINE_ADMIN_UID!;

async function sendPush() {
  console.log('Sending push message to:', TO);
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      to: TO,
      messages: [{ type: 'text', text: '✅ ทดสอบระบบ NEO Support\nWebhook เชื่อมต่อสำเร็จแล้วครับ! ระบบพร้อมใช้งาน 🚀' }]
    })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);

  if (res.status === 200) {
    console.log('\n✅ Push message sent! Check your LINE app.');
  } else {
    console.log('\n❌ Push message failed. Check LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_UID');
  }
}

sendPush();
