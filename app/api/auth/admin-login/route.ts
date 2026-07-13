import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/admin-login
 * Authenticates admin users and verifies is_admin flag on profile.
 * Returns 403 if user is not an admin.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your email and password." },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Authentication failed. No user returned." },
        { status: 401 }
      );
    }

    // Check is_admin flag on profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      // Sign out the non-profile user
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Profile not found. Please contact support." },
        { status: 403 }
      );
    }

    if (!profile.is_admin) {
      // Sign out the non-admin user
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email: authData.user.email },
    });
  } catch (err) {
    console.error("[admin-login] Error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
