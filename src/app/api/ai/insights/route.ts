import { NextRequest, NextResponse } from 'next/server';
import { generateDashboardInsights } from "@/lib/ai";

export async function POST() {
  try {
    const result = await generateDashboardInsights();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
     const { supabaseAdmin } = await import("@/lib/supabase");
     const { data } = await supabaseAdmin
       .from('ai_insights')
       .select('*')
       .order('report_date', { ascending: false })
       .limit(1)
       .maybeSingle();
       
     return NextResponse.json(data?.content || { message: "No insights found" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
