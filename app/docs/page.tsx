import Link from "next/link";

export const metadata = {
  title: "Documentation — Military Pass",
  description: "Documentation and guides for Military Pass platform.",
};

export default function DocsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base, #0a0e1a)", color: "var(--text-primary, #e8eaf0)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>← Home</Link>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "linear-gradient(135deg, var(--accent-cyan, #22d3ee), var(--accent-purple, #a855f7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Documentation</h1>

        <section style={{ marginBottom: "2rem" }}>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", fontSize: "1.1rem" }}>Welcome to the Military Pass documentation. Get started with our AI face and voice transformation platform.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Quick Start</h2>
          <ol style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.5rem" }}>
            <li>Create an account at <Link href="/auth/signup" style={{ color: "var(--accent-cyan, #22d3ee)" }}>Sign Up</Link></li>
            <li>Choose an avatar from the preset gallery or upload your own</li>
            <li>Select a voice preset (Commander, Ghost, Operative, Recon, or Ranger)</li>
            <li>Open the <Link href="/studio" style={{ color: "var(--accent-cyan, #22d3ee)" }}>Studio</Link> and start transforming</li>
          </ol>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Credits System</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>6 credits = 1 minute of live transformation. New accounts get 1,000 free credits (~166 minutes). Purchase more at <Link href="/pricing" style={{ color: "var(--accent-cyan, #22d3ee)" }}>Pricing</Link>.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>API Access</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>API keys are available for Ghost Unit tier subscribers. Manage your keys in the <Link href="/dashboard/api-keys" style={{ color: "var(--accent-cyan, #22d3ee)" }}>API Keys dashboard</Link>.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Support</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Need help? Check our <Link href="/faq" style={{ color: "var(--accent-cyan, #22d3ee)" }}>FAQ</Link> or contact <a href="mailto:support@militarypass.com" style={{ color: "var(--accent-cyan, #22d3ee)" }}>support@militarypass.com</a></p>
        </section>
      </div>
    </main>
  );
}
