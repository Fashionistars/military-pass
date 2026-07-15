import Link from "next/link";

export const metadata = {
  title: "About — Military Pass",
  description: "About Military Pass platform.",
};

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base, #0a0e1a)", color: "var(--text-primary, #e8eaf0)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent-cyan, #22d3ee)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>← Home</Link>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "linear-gradient(135deg, var(--accent-cyan, #22d3ee), var(--accent-purple, #a855f7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>About Military Pass</h1>

        <section style={{ marginBottom: "2rem" }}>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", fontSize: "1.1rem" }}>Military Pass is a cloud-powered AI identity transformation platform that enables real-time face swap and voice conversion for streamers, creators, and virtual operators. No GPU required — everything runs in the cloud on Hugging Face ZeroGPU infrastructure.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Our Mission</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>To democratize AI-powered identity transformation, making it accessible to everyone without expensive hardware or technical expertise. Transform. Operate. Dominate.</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Technology</h2>
          <ul style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", paddingLeft: "1.5rem" }}>
            <li>Next.js 16 frontend with React Server Components</li>
            <li>Hugging Face ZeroGPU for AI inference</li>
            <li>InsightFace for face detection and swapping</li>
            <li>RVC v2 for voice conversion</li>
            <li>Supabase for authentication and data storage</li>
            <li>Upstash Redis for rate limiting</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--accent-cyan, #22d3ee)" }}>Contact</h2>
          <p style={{ lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)" }}>Email: <a href="mailto:support@militarypass.com" style={{ color: "var(--accent-cyan, #22d3ee)" }}>support@militarypass.com</a></p>
        </section>
      </div>
    </main>
  );
}
