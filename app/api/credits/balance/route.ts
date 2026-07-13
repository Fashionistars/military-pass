import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/actions";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credits")
      .select("balance, total_purchased, total_used")
      .eq("user_id", user.id)
      .single();

    if (error) return NextResponse.json({ balance: 0, total_purchased: 0, total_used: 0 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, amount, sessionId } = await request.json();

    // Input validation
    if (typeof amount !== "number" || amount <= 0 || amount > 10000) {
      return NextResponse.json({ error: "Invalid amount. Must be a positive number up to 10000." }, { status: 400 });
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    if (action === "deduct") {
      // Use RPC for atomic credit deduction to prevent race conditions
      // Note: p_session_id is optional — older versions of the RPC don't accept it
      // but Supabase client will ignore extra params if the function doesn't use them
      const { data: result, error: rpcError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: amount,
        p_description: "Live transformation session",
        ...(sessionId ? { p_session_id: sessionId } : {}),
      });

      if (rpcError) {
        console.error("[credits] RPC error:", rpcError);
        return NextResponse.json({ error: "Failed to deduct credits. Please try again." }, { status: 500 });
      }

      if (!result || !result.success) {
        return NextResponse.json({ error: "Insufficient credits. Please top up to continue." }, { status: 402 });
      }

      return NextResponse.json({ balance: result.new_balance, success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[credits] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
