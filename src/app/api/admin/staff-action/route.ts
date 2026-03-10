import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // 1. Check admin session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, status } = await request.json();

    if (!userId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 2. Update user status and is_staff flag
    const { error } = await supabase
      .from('users')
      .update({ 
        status, 
        is_staff: status === 'approved' 
      })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Staff Action Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
