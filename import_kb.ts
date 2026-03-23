import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse CSV manually handling quotes
function parseCSVRow(text: string) {
  const result: string[] = [];
  let currentString = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentString += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentString);
      currentString = '';
    } else {
      currentString += char;
    }
  }
  result.push(currentString);
  return result;
}

async function main() {
  // Load env variables
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    });
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const csvPath = path.join(__dirname, 'neohos_qa_knowledge_base.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  // Handle carriage returns and split into lines
  const lines = fileContent.replace(/\r/g, '').split('\n').filter(line => line.trim().length > 0);
  
  // Skip header
  const dataLines = lines.slice(1);
  
  console.log(`Found ${dataLines.length} rows to import...`);
  
  let validRows = 0;
  const batchSize = 100;
  let currentBatch = [];
  
  try {
    // Clear existing data from the test
    const { error: delError } = await supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared table for fresh import');
    
    for (let i = 0; i < dataLines.length; i++) {
      const row = parseCSVRow(dataLines[i]);
      if (row.length < 4) continue;
      
      let moduleName = row[1]?.trim() || 'General';
      let question = row[2]?.trim();
      const answer = row[3]?.trim();
      
      if (!question || !answer) continue;
      
      // Truncate title to 255 chars
      if (question.length > 250) question = question.substring(0, 250) + '...';
      if (moduleName.length > 250) moduleName = moduleName.substring(0, 250);
      
      currentBatch.push({
        title: question,
        content: answer,
        category: moduleName,
        tags: [moduleName]
      });
      validRows++;
      
      if (currentBatch.length >= batchSize || i === dataLines.length - 1) {
        const { error } = await supabase.from('knowledge_base').insert(currentBatch);
        if (error) {
          console.error(`Error inserting batch at row ${i}:`, error.message);
        } else {
          console.log(`Successfully inserted batch. Total inserted so far: ${validRows}`);
        }
        currentBatch = [];
      }
    }
    
    console.log(`\nImport complete! Processed ${validRows} valid Q&A entries.`);
  } catch (error) {
    console.error("Fatal error during import:", error);
  }
}

main();
