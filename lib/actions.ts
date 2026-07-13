"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/* ─── Supabase config guard ──────────────────────────────── */
function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.startsWith("http://") || url.startsWith("https://");
}

async function safeClient() {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient();
}

/* ─── AUTH ──────────────────────────────────────────────── */
export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured())
    return { error: "Supabase not configured. Add credentials to .env.local" };

  const supabase = await createClient();
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  redirect("/dashboard?welcome=1");
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured())
    return { error: "Supabase not configured. Add credentials to .env.local" };

  const supabase = await createClient();
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/* ─── USER ──────────────────────────────────────────────── */
export async function getUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch { return null; }
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  } catch { return null; }
}

export async function updateProfile(userId: string, updates: {
  username?: string;
  display_name?: string;
  bio?: string;
  website?: string;
}) {
  try {
    const supabase = await safeClient();
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Service unavailable" }; }
}

/* ─── CREDITS ───────────────────────────────────────────── */
export async function getUserCredits(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("credits")
      .select("balance, total_purchased, total_used")
      .eq("user_id", userId)
      .single();
    return data;
  } catch { return null; }
}

export async function getCreditTransactions(userId: string, limit = 20) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  } catch { return []; }
}

/* ─── AVATARS ───────────────────────────────────────────── */
function parseEmbedding(raw: unknown): number[] | null {
  if (!raw) return null;
  // Already a number array
  if (Array.isArray(raw) && raw.length === 512 && typeof raw[0] === "number") return raw;
  // JSON string that needs parsing
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 512) return parsed;
    } catch { /* not JSON */ }
  }
  // Object with array inside (some JSONB formats)
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.embedding) && obj.embedding.length === 512) return obj.embedding as number[];
  }
  return null;
}

function generateDeterministicEmbedding(seed: string): number[] {
  // Generate a deterministic 512-dim embedding from a string seed
  // Uses a simple hash-based PRNG — not a real face embedding, but
  // gives the AI backend a consistent vector to work with for presets
  const embedding: number[] = new Array(512);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash | 0;
  }
  let state = Math.abs(hash) || 1;
  for (let i = 0; i < 512; i++) {
    state = (state * 16807) % 2147483647;
    embedding[i] = (state / 1073741823.5) - 1; // normalize to [-1, 1]
  }
  return embedding;
}

export async function getUserAvatars(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("avatars")
      .select("*")
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order("is_preset", { ascending: false })
      .order("created_at", { ascending: false });
    if (!data) return [];
    // Ensure every avatar has a valid 512-dim embedding
    return data.map((avatar) => {
      let embedding = parseEmbedding(avatar.embedding);
      if (!embedding) {
        // Generate deterministic embedding for presets or missing embeddings
        const seed = avatar.is_preset ? `preset-${avatar.name}` : `avatar-${avatar.id}`;
        embedding = generateDeterministicEmbedding(seed);
      }
      return { ...avatar, embedding };
    });
  } catch { return []; }
}

export async function setDefaultAvatar(avatarId: string, userId: string) {
  try {
    const supabase = await safeClient();
    await supabase.from("avatars").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("avatars").update({ is_default: true }).eq("id", avatarId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to set default avatar" }; }
}

export async function deleteAvatar(avatarId: string, userId: string) {
  try {
    const supabase = await safeClient();
    const { error } = await supabase
      .from("avatars")
      .delete()
      .eq("id", avatarId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to delete avatar" }; }
}

/* ─── VOICE PROFILES ────────────────────────────────────── */
export async function getUserVoiceProfiles(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("voice_profiles")
      .select("*")
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order("is_preset", { ascending: false })
      .order("created_at", { ascending: false });
    return data || [];
  } catch { return []; }
}

export async function setDefaultVoice(voiceId: string, userId: string) {
  try {
    const supabase = await safeClient();
    await supabase.from("voice_profiles").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("voice_profiles").update({ is_default: true }).eq("id", voiceId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to set default voice" }; }
}

/* ─── SESSIONS ──────────────────────────────────────────── */
export async function getRecentSessions(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("transform_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    return data || [];
  } catch { return []; }
}

export async function getAllSessions(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("transform_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  } catch { return []; }
}

export async function createSession(params: {
  userId: string;
  avatarId?: string;
  voiceProfileId?: string;
}) {
  try {
    const supabase = await safeClient();
    const { data, error } = await supabase
      .from("transform_sessions")
      .insert({
        user_id: params.userId,
        avatar_id: params.avatarId ?? null,
        voice_profile_id: params.voiceProfileId ?? null,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { error: error.message };
    return { session: data };
  } catch (err) {
    console.error("[actions] createSession error:", err);
    return { error: "Failed to create session" };
  }
}

export async function endSession(sessionId: string, stats: {
  duration_seconds: number;
  credits_used: number;
  frames_processed: number;
  avg_latency_ms?: number;
}) {
  try {
    const supabase = await safeClient();

    // Try atomic RPC first (if it exists in the database)
    const { data: session } = await supabase
      .from("transform_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!session?.user_id) {
      console.error("[actions] endSession: Session not found:", sessionId);
      return { error: "Session not found" };
    }

    // Try the atomic RPC (credits already deducted by CreditMeter during session,
    // so p_credits_used=0 to avoid double deduction — just record the stats)
    try {
      const { data: result, error: rpcError } = await supabase.rpc("end_session_atomic", {
        p_session_id: sessionId,
        p_user_id: session.user_id,
        p_duration_seconds: stats.duration_seconds,
        p_credits_used: 0, // Credits already deducted during session by CreditMeter
        p_frames_processed: stats.frames_processed,
        p_avg_latency_ms: stats.avg_latency_ms ?? 0,
      });

      if (!rpcError && result?.success) {
        return { success: true, final_balance: result.final_balance };
      }
    } catch {
      // RPC doesn't exist yet — fall through to simple update
    }

    // Fallback: simple session update (credits already deducted by CreditMeter)
    const { error: updateError } = await supabase
      .from("transform_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: stats.duration_seconds,
        credits_used: stats.credits_used,
        frames_processed: stats.frames_processed,
        avg_latency_ms: stats.avg_latency_ms ?? 0,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("[actions] endSession update error:", updateError);
      return { error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[actions] endSession error:", err);
    return { error: "Failed to end session" };
  }
}

/* ─── PAYMENTS ──────────────────────────────────────────── */
export async function getPaymentHistory(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return data || [];
  } catch { return []; }
}
