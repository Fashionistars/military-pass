import { redirect } from "next/navigation";
import { getUser, getUserVoiceProfiles } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import VoicesClient from "./VoicesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice Profiles — Military Pass",
  description: "Manage preset voices and trained RVC models for your live tactical transformation sessions.",
};

export default async function VoicesPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const [creditsRes, voices] = await Promise.all([
    supabase.from("credits").select("balance").eq("user_id", user.id).single(),
    getUserVoiceProfiles(user.id),
  ]);

  return (
    <VoicesClient
      userId={user.id}
      initialBalance={creditsRes.data?.balance ?? 0}
      initialVoices={voices}
    />
  );
}
