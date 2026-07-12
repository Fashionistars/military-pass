import { redirect } from "next/navigation";
import {
  getUser,
  getUserCredits,
  getUserAvatars,
  getUserVoiceProfiles,
  getRecentSessions,
} from "@/lib/actions";
import CreditWidget from "@/components/dashboard/CreditWidget";
import AvatarGallery from "@/components/dashboard/AvatarGallery";
import VoiceSelector from "@/components/dashboard/VoiceSelector";
import RecentSessions from "@/components/dashboard/RecentSessions";
import QuickStart from "@/components/dashboard/QuickStart";
import styles from "./dashboard.module.css";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const isWelcome = params?.welcome === "1";

  // Parallel data fetch
  const [credits, avatars, voices, sessions] = await Promise.all([
    getUserCredits(user.id),
    getUserAvatars(user.id),
    getUserVoiceProfiles(user.id),
    getRecentSessions(user.id),
  ]);

  const displayName =
    user.user_metadata?.username ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Operator";

  return (
    <div className={styles.page}>
      {/* Welcome Banner */}
      {isWelcome && (
        <div className={styles.welcomeBanner}>
          🎖️ Welcome to Military Pass, <strong>{displayName}</strong>!
          You&apos;ve received{" "}
          <span style={{ color: "var(--accent-cyan)" }}>50 free credits</span> to get started.
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            Operator <span className="text-gradient">Command Center</span>
          </h1>
          <p className={styles.pageSubtitle}>
            Welcome back, <span style={{ color: "var(--accent-cyan)" }}>{displayName}</span>
          </p>
        </div>
        <a href="/studio" className={`btn btn-primary ${styles.launchBtn}`}>
          ▶ Launch Studio
        </a>
      </div>

      {/* Decart-Style Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroLeft}>
          <h2 className={styles.heroTitle}>Real-time AI Became Real</h2>
          <p className={styles.heroText}>
            Military Pass&apos;s cutting-edge cloud infrastructure transforms video and audio at
            unprecedented speed. What once took hours now takes seconds, letting you stream
            with a completely transformed identity, explore new styles, and go live without delay.
          </p>
          <div className={styles.heroActions}>
            <a href="/studio" className="btn btn-primary">⚡ Try Real-time</a>
            <a href="https://platform.decart.ai/docs" target="_blank" rel="noreferrer" className="btn btn-secondary">Quick Start Guide</a>
          </div>
        </div>
        
        {/* Code Editor Panel */}
        <div className={styles.codeContainer}>
          <div className={styles.codeHeader}>
            <span className={styles.codeTab}>TypeScript</span>
            <button className={styles.copyBtn} title="Copy Code">
              📋
            </button>
          </div>
          <pre className={styles.codeBlock}>
            <code>{`import { createClient, models } from "@militarypass/sdk";

const client = createClient({
  apiKey: process.env.MILITARY_PASS_API_KEY,
});

const model = models.realtime("ghost-3.0");
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    frameRate: model.fps,
    width: model.width,
    height: model.height
  }
});`}</code>
          </pre>
        </div>
      </div>

      {/* Watermark Banner */}
      <div className={styles.watermarkBanner}>
        <div className={styles.watermarkInfo}>
          <span className={styles.watermarkIcon}>ℹ️</span>
          <span>Your realtime output carries a tactical watermark. Apply for removal in a couple of clicks.</span>
        </div>
        <a href="/pricing" className={styles.watermarkBtn}>Apply to remove ↗</a>
      </div>

      {/* Real-time Models Section */}
      <div className={styles.modelsSection}>
        <h3 className={styles.sectionHeader}>Real-time Models</h3>
        <div className={styles.modelsGrid}>
          <div className={styles.modelCard}>
            <div className={styles.modelImageWrapper}>
              <div className={styles.modelTag}>REALTIME VIDEO EDITING</div>
              <div className={styles.modelEmoji}>👻</div>
            </div>
            <div className={styles.modelInfo}>
              <h4 className={styles.modelName}>Ghost</h4>
              <p className={styles.modelDesc}>Dark, mysterious operative voice and stealth visual transformation.</p>
            </div>
          </div>
          <div className={styles.modelCard}>
            <div className={styles.modelImageWrapper}>
              <div className={styles.modelTag}>AUTHORITATIVE TARGETING</div>
              <div className={styles.modelEmoji}>🎖️</div>
            </div>
            <div className={styles.modelInfo}>
              <h4 className={styles.modelName}>Commander</h4>
              <p className={styles.modelDesc}>Deep, commanding presence with high-authority face swap.</p>
            </div>
          </div>
          <div className={styles.modelCard}>
            <div className={styles.modelImageWrapper}>
              <div className={styles.modelTag}>TACTICAL SWAPPING</div>
              <div className={styles.modelEmoji}>🔫</div>
            </div>
            <div className={styles.modelInfo}>
              <h4 className={styles.modelName}>Operative</h4>
              <p className={styles.modelDesc}>Standard field operative profile optimized for raw processing speed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Row */}
      <div className={styles.topRow}>
        <CreditWidget credits={credits} />
        <QuickStart />
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        <div className={styles.leftCol}>
          <AvatarGallery avatars={avatars} />
          <VoiceSelector voices={voices} />
        </div>
        <div className={styles.rightCol}>
          <RecentSessions sessions={sessions} />
          <div className={styles.statsRow}>
            <div className="card">
              <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Total Sessions</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                {sessions.length}
              </p>
            </div>
            <div className="card">
              <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Credits Remaining</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-green)" }}>
                {credits?.balance ?? 0}
              </p>
            </div>
            <div className="card">
              <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Avatars Saved</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-purple)" }}>
                {avatars.filter((a: { is_preset: boolean }) => !a.is_preset).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
