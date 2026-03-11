import fs from 'fs';
import path from 'path';

// Manual ENV loading for .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const TOKEN = envContent.match(/LINE_CHANNEL_ACCESS_TOKEN=(.*)/)?.[1]?.trim();

const IMAGE_PATH = 'C:/Users/jairlinethai/.gemini/antigravity/brain/c45cd78c-32cb-455a-bb76-0c684a36b9c6/line_rich_menu_neohos_ipd_standard_compact_1773186491561.png';

async function setupRichMenu() {
  if (!TOKEN) {
    console.error("❌ Error: LINE_CHANNEL_ACCESS_TOKEN is missing in .env.local");
    return;
  }

  try {
    console.log("🚀 Starting Final Rich Menu Setup (2500x843)...");

    // 1. Define Rich Menu Structure
    const richMenuData = {
      size: { width: 2500, height: 843 },
      selected: true,
      name: "NeoHos IPD Standard Menu",
      chatBarText: "เมนูช่วยเหลือ",
      areas: [
        {
          bounds: { x: 0, y: 0, width: 1250, height: 843 },
          action: { type: "message", text: "ค้นหาวิธีแก้ไข" }
        },
        {
          bounds: { x: 1250, y: 0, width: 1250, height: 843 },
          action: { type: "message", text: "แจ้งซ่อม" }
        }
      ]
    };

    // 2. Create Rich Menu
    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(richMenuData)
    });

    const createData = await createRes.json();
    if (!createData.richMenuId) {
      console.error("❌ Full Error Response:", JSON.stringify(createData, null, 2));
      throw new Error("Failed to create rich menu: " + JSON.stringify(createData));
    }
    
    const richMenuId = createData.richMenuId;
    console.log(`✅ Created Rich Menu: ${richMenuId}`);

    // 3. Upload Image
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: imageBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("❌ Image Upload Error:", errText);
      throw new Error("Failed to upload image: " + errText);
    }
    console.log("✅ Uploaded Rich Menu Image");

    // 4. Set as Default
    const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!defaultRes.ok) throw new Error("Failed to set default menu: " + await defaultRes.text());
    console.log("✨ Rich Menu is now LIVE for all users!");

  } catch (error) {
    console.error("🔴 Setup Failed:", error);
  }
}

setupRichMenu();
