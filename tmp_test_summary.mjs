import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSummary() {
  // Use the local URL or production URL if provided in env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${appUrl}/api/cron/daily-summary`;
  
  console.log(`🚀 Triggering Test Summary at: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Check your LINE group.');
      console.log('Metrics:', JSON.stringify(data.metrics, null, 2));
    } else {
      console.log('❌ Failed:', data.error || response.statusText);
    }
  } catch (error) {
    console.error('💥 Request Error:', error.message);
  }
}

testSummary();
