import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // 1. Tickets by Status
    const { data: statusStats } = await supabaseAdmin
      .from("tickets")
      .select("status");
    
    const statusCounts = statusStats?.reduce((acc: any, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    // 2. Tickets by Hospital
    const { data: hospitalStats } = await supabaseAdmin
      .from("tickets")
      .select("hospital_id, hospitals(name)");
    
    const hospitalCounts = hospitalStats?.reduce((acc: any, t) => {
      const name = t.hospitals?.name || "Unknown";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    // 3. Trends (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: trendStats } = await supabaseAdmin
      .from("tickets")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString());
    
    const trendCounts = trendStats?.reduce((acc: any, t) => {
      const date = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      statusData: Object.entries(statusCounts || {}).map(([name, value]) => ({ name, value })),
      hospitalData: Object.entries(hospitalCounts || {}).map(([name, value]) => ({ name, value })),
      trendData: Object.entries(trendCounts || {}).map(([name, value]) => ({ name, value })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
