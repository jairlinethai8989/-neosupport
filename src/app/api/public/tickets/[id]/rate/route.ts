import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

// POST /api/public/tickets/[id]/rate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rating } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Update ticket rating in database
    const { error } = await supabaseAdmin
      .from("tickets")
      .update({ 
        rating, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) {
      logger.error("Failed to update ticket rating:", error);
      return NextResponse.json(
        { error: "Failed to submit rating" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Submit rating error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
