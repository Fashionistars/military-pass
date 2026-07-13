"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);

      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.badge}>🔐 ADMIN</span>
          <h1 className={styles.title}>Admin Access</h1>
          <p className={styles.subtitle}>
            Authorized personnel only. All access is logged.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              ⚠️ {error}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Admin Email</label>
            <input
              type="email"
              name="email"
              required
              className={styles.input}
              placeholder="admin@militarypass.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              required
              className={styles.input}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? "Authenticating…" : "🔐 Access Admin Dashboard"}
          </button>
        </form>

        <div className={styles.footer}>
          <a href="/auth/login" className={styles.userLink}>
            ← User Login
          </a>
        </div>
      </div>
    </div>
  );
}
