import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Invalid LINE code', request.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/line/callback`,
        client_id: process.env.LINE_LOGIN_CLIENT_ID || '',
        client_secret: process.env.LINE_LOGIN_CLIENT_SECRET || '',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Token exchange failed');

    // 2. Get User Profile from LINE
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    
    const lineUid = profile.userId;
    const lineDisplayName = profile.displayName;
    const linePictureUrl = profile.pictureUrl;

    // 3. Check if user exists in our DB
    const supabase = await createClient();
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('line_uid', lineUid)
      .maybeSingle();

    if (dbError) throw dbError;

    // 4. Handle Routing Logic & Permissions
    if (!dbUser) {
      // If it's a new user trying to login via web, redirect to registration info
      return NextResponse.redirect(new URL('/login?error=คุณยังไม่ได้ลงทะเบียนในระบบ กรุณาลงทะเบียนผ่าน LINE OA ก่อนครับ', request.url));
    }

    // 🔥 CRITICAL: Only Staff and Admin can access the Web Dashboard
    if (dbUser.role !== 'Staff' && dbUser.role !== 'Admin') {
      return NextResponse.redirect(new URL('/login?error=พื้นที่นี้สำหรับเจ้าหน้าที่ IT เท่านั้นครับ ลูกค้าแจ้งงานผ่าน LINE OA ได้เลย!', request.url));
    }

    if (dbUser.status === 'pending') {
      return NextResponse.redirect(new URL('/login?error=บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ', request.url));
    }

    if (dbUser.status === 'rejected') {
      return NextResponse.redirect(new URL('/login?error=บัญชีของคุณถูกปฏิเสธการเข้าถึง', request.url));
    }

    // 5. User is Approved -> Log them in to Supabase Auth
    const email = `${lineUid}@line.neosupport.local`;
    
    // Attempt sign in
    let { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: lineUid
    });
    
    // Fallback: If sign in fails, the Auth account might not exist yet
    // (for users approved before the recent fix). Create it on the fly.
    if (authError && authError.message.includes('Invalid login credentials')) {
      console.log(`Fallback: Creating missing auth account for: ${email}`);
      const { supabaseAdmin } = await import('@/lib/supabase');
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: lineUid,
        email_confirm: true,
        user_metadata: { line_uid: lineUid }
      });

      if (!createError) {
        // Try sign in again after creation
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password: lineUid
        });
        authError = retryError;
      } else {
        console.error('Auto-create auth user failed:', createError.message);
      }
    }

    if (authError) {
      console.error('Auth Error finally:', authError.message);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(authError.message)}`, request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));

  } catch (error: any) {
    console.error('LINE Callback Error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
