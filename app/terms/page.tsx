import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Military Pass",
  description: "Terms of Service for Military Pass platform.",
};

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base, #0a0e1a)", color: "var(--text-primary, #e8eaf0)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>← Home</Link>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "linear-gradient(135deg, var(--accent-cyan, #22d3ee), var(--accent-purple, #a855f7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Terms of Service</h1>
        <p style={{ color: "var(--text-secondary, #94a3b8)", marginBottom: "2rem" }}>Last updated: July 2026</p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>1. Acceptance of Terms</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>By accessing or using Military Pass, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>2. Use of Service</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Military Pass provides AI-powered face and voice transformation tools. You agree to use the service responsibly and not for deceptive, fraudulent, or harmful purposes. You are solely responsible for content you create.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>3. Credits and Payments</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Credits are consumed at a rate of 6 credits per minute of operation. Credits do not expire. All payments are processed securely via Paystack or Stripe. Refunds are subject to our Refund Policy.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>4. Prohibited Uses</h2>
          <ul style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.5rem" }}>
            <li>Impersonating real individuals without consent</li>
            <li>Creating deceptive or fraudulent content</li>
            <li>Harassment, bullying, or defamation</li>
            <li>Any illegal activity</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>5. Limitation of Liability</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Military Pass is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from use of the platform.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>6. Contact</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Questions? Email <a href="mailto:support@militarypass.com" style={{ color: "var(--accent-cyan, #22d3ee)" }}>support@militarypass.com</a></p>
        </section>
      </div>
    </main>
  );
}
