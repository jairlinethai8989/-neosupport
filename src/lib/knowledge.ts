import { supabaseAdmin } from "./supabase";

/**
 * Search the knowledge base for relevant articles
 */
export async function searchKnowledgeBase(query: string) {
  // Simple search: match tags or title
  const { data, error } = await supabaseAdmin
    .from('knowledge_base')
    .select('*')
    // Search in title OR content OR tags
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(3);

  if (error) {
    console.error("KB Search Error:", error);
    return [];
  }

  return data || [];
}
