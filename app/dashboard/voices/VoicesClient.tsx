"use client";
import { useState, useTransition } from "react";
import { setDefaultVoice } from "@/lib/actions";
import styles from "./voices.module.css";

interface VoiceProfile {
  id: string;
  name: string;
  style?: string;
  pitch_shift?: number;
  speed_factor?: number;
  is_preset: boolean;
  is_default: boolean;
  created_at?: string;
}

interface VoicesClientProps {
  userId: string;
  initialBalance: number;
  initialVoices: VoiceProfile[];
}

const STYLE_ICONS: Record<string, string> = {
  "military-deep":   "🎖️",
  "ghost-whisper":   "👻",
  "tactical-clear":  "📡",
  "recon-sharp":     "🔭",
  "ranger-gruff":    "🪖",
};

export default function VoicesClient({ userId, initialBalance, initialVoices }: VoicesClientProps) {
  const [voices, setVoices] = useState<VoiceProfile[]>(initialVoices);
  const [isPending, startTransition] = useTransition();

  const handleSetDefault = async (voiceId: string) => {
    startTransition(async () => {
      const res = await setDefaultVoice(voiceId, userId);
      if (res.success) {
        setVoices(voices.map((v) => ({
          ...v,
          is_default: v.id === voiceId,
        })));
      }
    });
  };

  const presetVoices = voices.filter((v) => v.is_preset);
  const customVoices = voices.filter((v) => !v.is_preset);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Voice <span className="text-gradient">Profiles</span></h1>
          <p className={styles.sub}>
            Configure and select default vocal presets or custom-trained RVC models for your live stream sessions.
          </p>
        </div>
        <a href="/dashboard/voice-training" className="btn btn-primary">
          🧠 Train Custom Voice
        </a>
      </div>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Left Side: Preset Voices */}
        <div className={`card ${styles.listCard}`}>
          <p className={styles.cardLabel}>Built-in Presets</p>
          <div className={styles.voiceList}>
            {presetVoices.map((voice) => (
              <div
                key={voice.id}
                className={`${styles.voiceItem} ${voice.is_default ? styles.activeVoice : ""}`}
              >
                <div className={styles.voiceIconWrap}>
                  <span>{STYLE_ICONS[voice.style ?? ""] ?? "🎙️"}</span>
                </div>
                <div className={styles.voiceMeta}>
                  <div className={styles.nameRow}>
                    <span className={styles.voiceName}>{voice.name}</span>
                    {voice.is_default && <span className={styles.defaultBadge}>Default</span>}
                  </div>
                  <span className={styles.voiceDetails}>
                    Pitch shift: {voice.pitch_shift ?? 0 > 0 ? "+" : ""}{voice.pitch_shift ?? 0} semitones · Speed: {voice.speed_factor ?? 1.0}x
                  </span>
                </div>
                <div className={styles.voiceActions}>
                  {!voice.is_default ? (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                      onClick={() => handleSetDefault(voice.id)}
                      disabled={isPending}
                    >
                      Make Default
                    </button>
                  ) : (
                    <span className={styles.activeCheck}>✓ Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Custom Models & Stats */}
        <div className={styles.rightCol}>
          {/* Custom Voices Card */}
          <div className={`card ${styles.listCard}`}>
            <p className={styles.cardLabel}>Your Custom RVC Models</p>
            {customVoices.length === 0 ? (
              <div className={styles.emptyCustom}>
                <span className={styles.emptyIcon}>🧠</span>
                <p className={styles.emptyTitle}>No Trained Voices Yet</p>
                <p className={styles.emptyText}>
                  Train a personalized RVC model using samples of your own or another target voice.
                </p>
                <a href="/dashboard/voice-training" className="btn btn-ghost" style={{ marginTop: "12px" }}>
                  Train Model
                </a>
              </div>
            ) : (
              <div className={styles.voiceList}>
                {customVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`${styles.voiceItem} ${voice.is_default ? styles.activeVoice : ""}`}
                  >
                    <div className={styles.voiceIconWrap} style={{ background: "rgba(124,58,237,0.15)", borderColor: "rgba(124,58,237,0.3)" }}>
                      <span>🎙️</span>
                    </div>
                    <div className={styles.voiceMeta}>
                      <div className={styles.nameRow}>
                        <span className={styles.voiceName}>{voice.name}</span>
                        {voice.is_default && <span className={styles.defaultBadge}>Default</span>}
                      </div>
                      <span className={styles.voiceDetails}>
                        Trained personal voice model
                      </span>
                    </div>
                    <div className={styles.voiceActions}>
                      {!voice.is_default ? (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                          onClick={() => handleSetDefault(voice.id)}
                          disabled={isPending}
                        >
                          Make Default
                        </button>
                      ) : (
                        <span className={styles.activeCheck}>✓ Selected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <div className={`card ${styles.infoCard}`}>
            <p className={styles.cardLabel}>Transform Details</p>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Latency Target</span>
              <span className={styles.infoVal} style={{ color: "var(--accent-green)" }}>&lt;200ms</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Sample Rate</span>
              <span className={styles.infoVal}>16 kHz Mono</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Active Session Cost</span>
              <span className={styles.infoVal}>6 credits / min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
