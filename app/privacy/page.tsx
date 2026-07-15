import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Military Pass",
  description: "Privacy Policy for Military Pass platform.",
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base, #0a0e1a)", color: "var(--text-primary, #e8eaf0)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>← Home</Link>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "linear-gradient(135deg, var(--accent-cyan, #22d3ee), var(--accent-purple, #a855f7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Privacy Policy</h1>
        <p style={{ color: "var(--text-secondary, #94a3b8)", marginBottom: "2rem" }}>Last updated: July 2026</p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>1. Data We Collect</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>We collect your email address, operator callsign, and usage data (credits, sessions, avatars). Uploaded images and voice samples are processed in real-time and are not permanently stored on our servers.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>2. How We Use Your Data</h2>
          <ul style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.5rem" }}>
            <li>To provide and improve the AI transformation service</li>
            <li>To process payments and manage credits</li>
            <li>To send service notifications and updates</li>
            <li>To prevent abuse and ensure platform security</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>3. Data Storage</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Account data is stored securely via Supabase (PostgreSQL). AI processing occurs on Hugging Face ZeroGPU infrastructure. We do not sell or share your data with third parties.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>4. Your Rights</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:support@militarypass.com" style={{ color: "var(--accent-cyan, #22d3ee)" }}>support@militarypass.com</a> to exercise these rights.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>5. Cookies</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>We use essential cookies for authentication and session management. Analytics cookies (PostHog) help us understand usage patterns to improve the platform.</p>
        </section>
      </div>
    </main>
  );
}
