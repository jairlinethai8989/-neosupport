import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body; // e.g., key: 'modules', value: ['A', 'B']

    const { error } = await supabaseAdmin
      .from('global_settings')
      .upsert({ key, value })
      .select();

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
