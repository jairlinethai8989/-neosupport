import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const { rating, feedback } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Update ticket with rating
    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        rating,
        rating_feedback: feedback,
        rated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error rating ticket:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
