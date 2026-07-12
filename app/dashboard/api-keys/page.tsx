"use client";
import { useState } from "react";
import styles from "./api-keys.module.css";

interface APIKey {
  id: string;
  name: string;
  key: string;
  created: string;
}

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([
    { id: "1", name: "Default Live Key", key: "mp_live_b7d8c6e2a9f4c3a1b0d2e5f6a7c8e9f0", created: "2026-06-28" },
    { id: "2", name: "OBS Stream Server", key: "mp_live_5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d", created: "2026-07-01" },
  ]);

  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recentlyCreatedKey, setRecentlyCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    // Generate random mock key
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const generatedKey = `mp_live_${randomHex}`;

    const newAPIKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: generatedKey,
      created: new Date().toISOString().split("T")[0],
    };

    setKeys([newAPIKey, ...keys]);
    setRecentlyCreatedKey(generatedKey);
    setNewKeyName("");
    setShowCreateModal(false);
  };

  const handleDeleteKey = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (keyStr: string) => {
    const prefix = keyStr.substring(0, 8);
    const suffix = keyStr.substring(keyStr.length - 4);
    return `${prefix}************************${suffix}`;
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Developer <span className="text-gradient">API Keys</span></h1>
          <p className={styles.sub}>
            Integrate Military Pass realtime transformation into your external streams, applications, or OBS controllers.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowCreateModal(true);
            setRecentlyCreatedKey(null);
          }}
        >
          ➕ Generate New Key
        </button>
      </div>

      {/* Warning Alert */}
      <div className={styles.warningBox}>
        ⚠️ <strong>Security Advisory:</strong> Keep your API keys private. Do not commit them to GitHub or expose them in client-side code. Exposing keys allows others to consume your credits.
      </div>

      {/* Newly Created Key Display */}
      {recentlyCreatedKey && (
        <div className={styles.successBanner}>
          <div className={styles.successHeader}>
            <span>🔑 API Key Generated Successfully!</span>
            <button className={styles.closeSuccess} onClick={() => setRecentlyCreatedKey(null)}>×</button>
          </div>
          <p className={styles.successSub}>
            Make sure to copy your API key now. For security reasons, you won&apos;t be able to see it again.
          </p>
          <div className={styles.keyDisplayRow}>
            <code className={styles.fullKey}>{recentlyCreatedKey}</code>
            <button
              className="btn btn-ghost"
              style={{ padding: "8px 16px", fontSize: "0.8rem" }}
              onClick={() => handleCopy("recently_created", recentlyCreatedKey)}
            >
              {copiedId === "recently_created" ? "Copied! ✓" : "Copy to Clipboard"}
            </button>
          </div>
        </div>
      )}

      {/* Keys Table Card */}
      <div className={`card ${styles.tableCard}`}>
        <p className={styles.widgetLabel}>Active API Keys</p>
        {keys.length === 0 ? (
          <p className={styles.emptyText}>No API keys found. Generate one to get started.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>API Key</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className={styles.keyName}>{k.name}</td>
                    <td className={styles.keyCreated}>{k.created}</td>
                    <td>
                      <code className={styles.maskedKey}>{maskKey(k.key)}</code>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className={styles.actionsWrap}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                          onClick={() => handleCopy(k.id, k.key)}
                        >
                          {copiedId === k.id ? "Copied! ✓" : "Copy"}
                        </button>
                        <button
                          className={`btn btn-ghost ${styles.deleteBtn}`}
                          style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                          onClick={() => handleDeleteKey(k.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Generate Developer API Key</h3>
            <form onSubmit={handleCreateKey} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Key Description / Name</label>
                <input
                  type="text"
                  placeholder="e.g., Production Server, OBS Plugin"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Code Integration Guide */}
      <div className={styles.guideSection}>
        <h2 className={styles.guideTitle}>Quick Integration Guide</h2>
        
        <div className={styles.guideGrid}>
          {/* Node.js integration */}
          <div className={`card ${styles.guideCard}`}>
            <p className={styles.guideCardTitle}>Node.js SDK</p>
            <pre className={styles.guideCode}>
              <code>{`import { createClient } from "@militarypass/sdk";

const mp = createClient({
  apiKey: "mp_live_..." 
});

const outputStream = await mp.transform({
  video: webcamStream,
  avatar: "ghost",
  voice: "operative"
});`}</code>
            </pre>
          </div>

          {/* cURL integration */}
          <div className={`card ${styles.guideCard}`}>
            <p className={styles.guideCardTitle}>cURL REST API</p>
            <pre className={styles.guideCode}>
              <code>{`curl -X POST https://api.militarypass.com/v1/transform \\
  -H "Authorization: Bearer mp_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "data:image/jpeg;base64,...",
    "avatar_id": "ghost_preset"
  }'`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
