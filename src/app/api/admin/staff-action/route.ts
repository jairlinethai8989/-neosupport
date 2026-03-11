import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { setRichMenuForUser } from '@/lib/line';

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

    // 2. Get user info first for LINE UID
    const { data: targetUser } = await supabase
      .from('users')
      .select('line_uid')
      .eq('id', userId)
      .single();

    // 3. Update user status and is_staff flag
    const { error } = await supabase
      .from('users')
      .update({ 
        status, 
        is_staff: status === 'approved' 
      })
      .eq('id', userId);

    if (error) throw error;

    // 4. If approved, ensure they have a Supabase Auth account
    if (status === 'approved' && targetUser?.line_uid) {
      const { supabaseAdmin } = await import('@/lib/supabase');
      const email = `${targetUser.line_uid}@line.neosupport.local`;
      
      // Check if auth user already exists
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuth = authUsers.users.find(u => u.email === email);

      if (!existingAuth) {
        console.log(`Creating auth account for approved staff: ${email}`);
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: targetUser.line_uid,
          email_confirm: true,
          user_metadata: { line_uid: targetUser.line_uid }
        });
        if (createError) console.error('Error creating auth user:', createError.message);
      }
    }

    // 5. If approved, switch to Staff Rich Menu
    if (status === 'approved' && targetUser?.line_uid && process.env.LINE_STAFF_RICH_MENU_ID) {
      await setRichMenuForUser(targetUser.line_uid, process.env.LINE_STAFF_RICH_MENU_ID);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Staff Action Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
