import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET all hospitals with their ticket config
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .select('id, name, abbreviation, ticket_prefix, ticket_padding')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH to update hospital config
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ticket_prefix, ticket_padding, ticket_format_mode, next_number } = body;

    // 1. Update text fields if provided
    if (ticket_prefix !== undefined || ticket_padding !== undefined || ticket_format_mode !== undefined) {
      const updateData: any = {};
      if (ticket_prefix !== undefined) updateData.ticket_prefix = ticket_prefix;
      if (ticket_padding !== undefined) updateData.ticket_padding = ticket_padding;
      if (ticket_format_mode !== undefined) updateData.ticket_format_mode = ticket_format_mode;
      
      const { error: updateError } = await supabaseAdmin
        .from('hospitals')
        .update(updateData)
        .eq('id', id);
        
      if (updateError) throw updateError;
    }

    // 2. Update sequence if next_number is provided
    if (next_number !== undefined) {
      const { error: seqError } = await supabaseAdmin
        .rpc('set_hospital_ticket_sequence', { 
          p_hospital_id: id, 
          p_next_val: parseInt(next_number) 
        });
      
      if (seqError) throw seqError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST to bulk create hospitals
export async function POST(req: Request) {
  try {
    const { hospitals } = await req.json(); // Array of names
    if (!Array.isArray(hospitals)) throw new Error("Invalid data format");

    const insertData = hospitals.map(name => {
      // Simple abbreviation: first few letters or first chars of each word
      const abbreviation = name.split(' ').map((word: string) => word[0]).join('').toUpperCase().substring(0, 10);
      const prefix = abbreviation + "-";
      return {
        name,
        abbreviation: abbreviation || name.substring(0, 3).toUpperCase(),
        ticket_prefix: prefix,
        ticket_padding: 6,
        ticket_format_mode: 'default'
      };
    });

    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .insert(insertData)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
