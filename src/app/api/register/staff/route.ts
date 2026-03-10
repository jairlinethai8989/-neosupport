import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { 
      lineUid, 
      displayName, 
      pictureUrl, 
      fullName, 
      hospitalId, 
      department 
    } = await request.json();

    if (!lineUid || !fullName || !hospitalId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create or Update user record
    const { data, error } = await supabase
      .from('users')
      .upsert({
        line_uid: lineUid,
        display_name: displayName,
        line_picture_url: pictureUrl,
        full_name: fullName,
        hospital_id: hospitalId,
        department: department,
        status: 'pending', // Explicitly set to pending for review
        is_staff: false    // Will become true upon approval
      }, { onConflict: 'line_uid' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
