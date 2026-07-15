import Link from "next/link";

export const metadata = {
  title: "Contact — Military Pass",
  description: "Contact Military Pass support team.",
};

export default function ContactPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base, #0a0e1a)", color: "var(--text-primary, #e8eaf0)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>← Home</Link>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "linear-gradient(135deg, var(--accent-cyan, #22d3ee), var(--accent-purple, #a855f7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Contact Us</h1>

        <section style={{ marginBottom: "2rem" }}>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", fontSize: "1.1rem" }}>We're here to help. Reach out with any questions, feedback, or support needs.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Support</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Email: <a href="mailto:support@militarypass.com" style={{ color: "var(--accent-cyan, #22d3ee)" }}>support@militarypass.com</a></p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Response Time</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>We typically respond within 24 hours during business days. Priority support is available for Operative tier and above.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Social</h2>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <a href="#" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none" }}>𝕏 Twitter</a>
            <a href="#" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none" }}>🎵 TikTok</a>
            <a href="#" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none" }}>▶ YouTube</a>
            <a href="#" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none" }}>💬 Discord</a>
          </div>
        </section>
      </div>
    </main>
  );
}
