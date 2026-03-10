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

    // 4. Handle Routing Logic
    if (!dbUser) {
      // New User -> Redirect to Registration with profile data in session or query (simplified here)
      const params = new URLSearchParams({
        uid: lineUid,
        name: lineDisplayName,
        pic: linePictureUrl || ''
      });
      return NextResponse.redirect(new URL(`/register/staff?${params.toString()}`, request.url));
    }

    if (dbUser.status === 'pending') {
      return NextResponse.redirect(new URL('/login?error=Account pending approval', request.url));
    }

    if (dbUser.status === 'rejected') {
      return NextResponse.redirect(new URL('/login?error=Account access denied', request.url));
    }

    // 5. User is Approved -> Log them in to Supabase Auth
    // Note: We use a custom auth mechanism or store the LINE token
    // For this demo, let's assume we use the LINE ID to sign them into a dedicated account
    const email = `${lineUid}@line.neosupport.local`;
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: lineUid // Using UID as fallback password for simple mapping
    });

    if (authError) {
      // If auth fails, maybe create the session for them (Magic Link or similar)
      console.error('Auth Error:', authError.message);
      return NextResponse.redirect(new URL('/login?error=Failed to create session', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));

  } catch (error: any) {
    console.error('LINE Callback Error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
