import Link from "next/link";

export const metadata = {
  title: "Refund Policy — Military Pass",
  description: "Refund Policy for Military Pass platform.",
};

export default function RefundPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base, #0a0e1a)", color: "var(--text-primary, #e8eaf0)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>← Home</Link>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "linear-gradient(135deg, var(--accent-cyan, #22d3ee), var(--accent-purple, #a855f7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Refund Policy</h1>
        <p style={{ color: "var(--text-secondary, #94a3b8)", marginBottom: "2rem" }}>Last updated: July 2026</p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>1. Unused Credits</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Credits purchased but not yet consumed are eligible for a full refund within 14 days of purchase. Credits do not expire and can be used at any time.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>2. Used Credits</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Credits that have been partially consumed are eligible for a prorated refund of the remaining unused balance within 14 days of purchase.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>3. How to Request a Refund</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Email <a href="mailto:support@militarypass.com" style={{ color: "var(--accent-cyan, #22d3ee)" }}>support@militarypass.com</a> with your account email and transaction ID. Refunds are processed within 5-10 business days to the original payment method.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>4. Non-Refundable Cases</h2>
          <ul style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.5rem" }}>
            <li>Credits purchased more than 14 days ago</li>
            <li>Credits fully consumed before refund request</li>
            <li>Accounts terminated for Terms of Service violations</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
