import { motion } from "framer-motion";
import { CodeBlock } from "@/components/gitAgent/CodeBlock";

const agentYaml = `# agent.yaml
a2a_agents:
  research-agent:
    url: https://research.example.com        # base URL; Agent Card resolved from
                                              # /.well-known/agent-card.json by default
    headers:                                  # optional; \${VAR} interpolated from your shell env
      Authorization: "Bearer \${RESEARCH_TOKEN}"
    timeoutMs: 30000                          # optional; connect + per-call timeout (default 30000)
    stream: true                              # optional; use SSE streaming when supported (default true)
    cardPath: /.well-known/agent-card.json    # optional; override the Agent Card path`;

const sdkCode = `import { query } from "@open-gitagent/gitagent";

for await (const msg of query({
  prompt: "Get the research agent's take on this",
  a2aAgents: {
    "research-agent": { url: "https://research.example.com" },
  },
})) {
  if (msg.type === "tool_use") console.log(\`calling \${msg.toolName}\`);
}`;

const configFields = [
  { field: "url", required: "yes", notes: "Base URL of the remote agent; agents without a url are skipped with a warning." },
  { field: "headers", required: "no", notes: "Sent on every request (e.g. auth); ${VAR} values are interpolated from process.env." },
  { field: "timeoutMs", required: "no", notes: "Default 30000ms — wraps the connect step (the one real Agent Card fetch) and each subsequent call." },
  { field: "stream", required: "no", notes: "Default true — only actually streams if the remote agent's card advertises capabilities.streaming: true." },
  { field: "cardPath", required: "no", notes: "Override if the agent doesn't serve its card at the well-known path." },
];

const runtimeSteps = [
  { step: 1, label: "Discovery (startup)", text: "GitAgent fetches each configured agent's Agent Card via a single GET <url>/.well-known/agent-card.json request (or cardPath if set). From the card it reads the agent's name, description, and declared skills." },
  { step: 2, label: "Tool registration", text: "Each skill becomes one tool named <agent>__<skill>, where both halves are sanitized to [a-zA-Z0-9_] (non-matching characters, including -, become _). So a research-agent key produces research_agent__web_search — worth knowing if you use kebab-case keys. An agent that declares zero skills is exposed as a single tool named after the sanitized agent key. Every A2A tool takes one parameter: message (free-text task/question for the remote agent)." },
  { step: 3, label: "Delegation (runtime)", text: "When the model calls one of these tools, GitAgent sends message to the remote agent — via SSE streaming (message/stream) if stream !== false locally and the card advertises capabilities.streaming: true, otherwise a blocking call (message/send). Streaming partial output is surfaced live as it arrives." },
  { step: 4, label: "Result handling", text: "For a completed task, GitAgent prefers the task's returned artifacts, falling back to its status message. File/binary parts are summarized (e.g. [file: report.pdf]), not inlined, to protect the token budget; data parts are rendered as pretty-printed JSON." },
];

const nonFatal = [
  { label: "Missing url", desc: "That agent is skipped with a warning — others still load." },
  { label: "Connection / card-fetch failure", desc: "Bad URL, timeout, or server down → skipped with a warning; the rest of the session works normally." },
  { label: "Per-call failure", desc: "A remote agent that errors mid-task is returned to the model as text (A2A call to \"<agent>\" failed: <reason>), not thrown — so the agent can see the failure and react." },
  { label: "Tool name collision", desc: "A tool name colliding with an existing tool is skipped with a warning rather than silently overwritten." },
];

const differences = [
  { label: "No teardown", desc: "A2A holds no persistent connection between calls — each call opens its own request/stream — so there's nothing to close on session end. Don't expect a teardown log line the way you might see for a persistent connection." },
  { label: "Silent env substitution", desc: "A2A's ${VAR} interpolation silently substitutes an empty string for an unset variable and does not print a warning. If a header looks empty at runtime, check your env directly rather than watching for a log message." },
];

const tryYaml = `# agent.yaml
a2a_agents:
  research-agent:
    url: https://your-real-a2a-agent.example.com`;

const tryRunCmd = `gitagent -d /path/to/your/agent \\
  --prompt "List every tool you have available, including any starting with research_agent__"`;

const troubleshooting = [
  { q: "Agent's tools not showing up?", a: "Check stderr for [a2a:<name>] connection failed: … — skipping or [a2a:<name>] missing \"url\" — skipping." },
  { q: "${VAR} came through empty in a header?", a: "No warning is logged for this (unlike MCP) — verify the env var is actually exported in your shell." },
  { q: "Tool name collision?", a: "Look for [a2a:<name>] tool \"<name>\" collides — skipping in stderr." },
  { q: "Streaming not showing partial output?", a: "Confirm the remote agent's Agent Card actually advertises capabilities.streaming: true — if not, GitAgent silently falls back to a blocking call regardless of your local stream: true setting." },
  { q: "Slow remote agent timing out?", a: "Raise timeoutMs in that agent's config block (default 30000ms) — it wraps the connect step (the one real Agent Card fetch) and each subsequent call; the post-connect card read is already-cached and effectively instant." },
];

export function GitAgentA2A() {
  return (
    <section id="a2a" className="py-16 px-0 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">
            A2A Client
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-2">
            GitAgent can <span className="text-foreground font-medium">call other AI agents</span> that speak the{" "}
            <a href="https://a2a-protocol.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">A2A (Agent2Agent) protocol</a>{" "}
            — the Linux Foundation's agent-interop standard. Delegate a task to an agent built on a completely different framework (LangGraph, CrewAI, Google ADK, …) and fold the result back into GitAgent's own reasoning.
          </p>
          <p className="text-sm text-muted-foreground font-body">
            <span className="text-foreground font-medium">Distinction from MCP:</span> A2A is <span className="text-foreground/80">outbound-only</span> — GitAgent never runs a server. It connects out to a remote agent's public Agent Card like any HTTP client. With nothing configured, zero network calls happen and the default CLI is unchanged.
          </p>
          <div className="paper-card p-3 mt-4 border-primary/30">
            <p className="text-[11px] text-muted-foreground font-body leading-relaxed relative z-10">
              <span className="text-foreground/80 font-medium">Mental model:</span> local tools give the agent <span className="text-foreground/80">capabilities</span>; A2A gives it <span className="text-foreground/80">peers</span>. Once connected, delegating to a remote agent looks exactly like calling any other tool.
            </p>
          </div>
        </motion.div>

        {/* A. Configure in agent.yaml */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Configure a remote agent in agent.yaml
          </h3>
          <CodeBlock code={agentYaml} filename="agent.yaml" className="mb-4" />
          <div className="space-y-2">
            {configFields.map((f, i) => (
              <motion.div
                key={f.field}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="paper-card p-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3 relative z-10">
                  <code className="text-[11px] text-primary font-body font-semibold shrink-0 w-24">{f.field}</code>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-body shrink-0 mt-0.5 ${f.required === "yes" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {f.required === "yes" ? "required" : "optional"}
                  </span>
                  <p className="text-[11px] text-muted-foreground font-body leading-relaxed">{f.notes}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* B. Via the SDK */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Via the SDK
          </h3>
          <CodeBlock code={sdkCode} filename="a2a-example.ts" className="mb-3" />
          <p className="text-[11px] text-muted-foreground font-body">
            SDK <code className="text-primary text-xs">a2aAgents</code> are <span className="text-foreground/80">merged</span> with <code className="text-primary text-xs">agent.yaml</code>'s <code className="text-primary text-xs">a2a_agents</code> — the SDK value wins on a key collision (same merge convention as <code className="text-primary text-xs">mcpServers</code>).
          </p>
        </motion.div>

        {/* C. What happens at runtime */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            What happens at runtime
          </h3>
          <div className="space-y-2 mb-4">
            {runtimeSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -4 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="paper-card p-3 flex items-start gap-3"
              >
                <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 font-body shrink-0 relative z-10">
                  {s.step}
                </span>
                <div className="relative z-10">
                  <span className="text-[11px] text-foreground font-semibold font-body">{s.label}</span>
                  <p className="text-[11px] text-muted-foreground font-body leading-relaxed mt-0.5">{s.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-3 font-body">Non-fatal by design</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nonFatal.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="paper-card p-4 hover:border-primary/40 transition-colors"
              >
                <p className="text-xs font-semibold text-foreground font-heading mb-1 relative z-10">{b.label}</p>
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed relative z-10">{b.desc}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70 font-body mt-4">
            Opt-in: with no <code className="text-primary text-xs">a2a_agents</code> configured, no network calls happen and A2A setup returns immediately.
          </p>
        </motion.div>

        {/* D. Differences from MCP */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Differences from MCP worth knowing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {differences.map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="paper-card p-4 border-primary/30 hover:border-primary/50 transition-colors"
              >
                <p className="text-xs font-semibold text-foreground font-heading mb-1 relative z-10">{d.label}</p>
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed relative z-10">{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* E. Try it yourself */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Try it yourself
          </h3>
          <p className="text-[11px] text-muted-foreground font-body mb-4 leading-relaxed">
            Unlike MCP (which has a trivial, official, no-auth public test server), there isn't an equivalent zero-setup public A2A agent to point at. The realistic path is to point GitAgent at a real A2A agent you or your team has deployed — for example, one exposed via LangGraph's or Google ADK's A2A support.
          </p>
          <p className="text-[11px] text-foreground/80 font-body mb-2 font-medium">Add it to a test agent's <code className="text-primary text-xs">agent.yaml</code> with its real URL:</p>
          <CodeBlock code={tryYaml} filename="agent.yaml" className="mb-5" />
          <p className="text-[11px] text-foreground/80 font-body mb-2 font-medium">Then confirm the remote skills show up namespaced correctly:</p>
          <CodeBlock code={tryRunCmd} filename="terminal" className="mb-2" />
          <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
            You should see the remote agent's skills registered as <code className="text-primary text-xs">research_agent__&lt;skill&gt;</code> tools — exactly like the MCP walkthrough, but calling out to a peer agent instead of a local server.
          </p>
        </motion.div>

        {/* F. Troubleshooting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Troubleshooting checklist
          </h3>
          <div className="space-y-2">
            {troubleshooting.map((t, i) => (
              <motion.div
                key={t.q}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="paper-card p-3 hover:border-primary/40 transition-colors"
              >
                <p className="text-xs font-semibold text-foreground font-body mb-1 relative z-10">{t.q}</p>
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed relative z-10">{t.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
