import { motion } from "framer-motion";
import { CodeBlock } from "@/components/gitAgent/CodeBlock";

const agentYaml = `# agent.yaml
mcp_servers:
  filesystem:                                   # local server, launched over stdio (default)
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/data"]
    env:
      LOG_LEVEL: "\${MCP_LOG_LEVEL}"              # \${VAR} is interpolated from your shell env
    timeoutMs: 30000                             # connect + list-tools timeout, default 30000ms

  analytics:                                     # remote server over Streamable HTTP
    type: http
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer \${ANALYTICS_TOKEN}"

  legacy:                                        # legacy SSE transport (deprecated upstream)
    type: sse
    url: "https://old.example.com/sse"`;

const sdkCode = `import { query } from "@open-gitagent/gitagent";

for await (const msg of query({
  prompt: "Summarize last week's signups from the database",
  mcpServers: {
    postgres: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", process.env.DB_URL!],
    },
  },
})) {
  if (msg.type === "tool_use") console.log(\`calling \${msg.toolName}\`);
}`;

const configFields = [
  { field: "command / args / env / cwd", applies: "stdio", notes: "How to launch a local server as a child process" },
  { field: "type: http | sse + url + headers", applies: "remote", notes: "Connect to a server over the network" },
  { field: "timeoutMs", applies: "both", notes: "Connect + listTools() timeout, default 30000ms" },
];

const runtimeSteps = [
  { step: 1, text: "On startup, GitAgent connects to every configured server in parallel." },
  { step: 2, text: "It calls listTools() on each (following pagination cursors if the server paginates)." },
  { step: 3, text: "Every discovered tool is registered as <server>__<tool>, sanitized to match provider naming rules (^[a-zA-Z0-9_-]{1,64}$) — e.g. filesystem__read_file, postgres__query." },
  { step: 4, text: "When the agent calls one of these tools, GitAgent forwards the call to the real MCP server and flattens the result (text/image/audio/resource blocks) into a string the model can read. Binary content is summarized, not inlined, to protect the token budget." },
  { step: 5, text: "On session end, every server connection is closed automatically (idempotent — safe even if called twice)." },
];

const behaviors = [
  { label: "Fail-soft by design", desc: "If one server fails to connect, times out, or errors while listing tools, GitAgent logs a warning and skips just that server — everything else (other MCP servers, built-in tools) keeps working." },
  { label: "Lazy", desc: "If you configure zero MCP servers, the @modelcontextprotocol/sdk package is never even imported — no cost for agents that don't use it." },
];

const tryFsYaml = `# agent.yaml
mcp_servers:
  fs:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/your/agent"]`;

const tryRunCmd = `gitagent -d /path/to/your/agent \\
  --prompt "List every tool you have available, including any starting with fs__"`;

const tryUseCmd = `gitagent -d /path/to/your/agent \\
  --prompt "Use the fs tool to list the contents of the skills directory"`;

const brokenYaml = `# agent.yaml
mcp_servers:
  broken:
    command: definitely-not-a-real-binary-xyz`;

const troubleshooting = [
  { q: "Tool not showing up?", a: "Check stderr for a [mcp:<name>] failed to connect or failed to list tools warning — the connection and listTools() call are fail-soft, so problems are logged, not thrown." },
  { q: "${VAR} came through empty?", a: "GitAgent warns [mcp] env var VAR is not set; substituting empty string if the referenced env var isn't set in your shell — make sure it's exported before running." },
  { q: "Tool name collision?", a: "If an MCP tool's sanitized name collides with an existing tool (built-in or another server's), GitAgent logs a warning and skips the colliding one rather than silently overwriting it." },
  { q: "Timeout too short for a slow server?", a: "Raise timeoutMs in that server's config block (default is 30000ms for both connect and listTools())." },
];

export function GitAgentMCP() {
  return (
    <section id="mcp" className="py-16 px-0 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">
            MCP Client
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-2">
            GitAgent is an <span className="text-foreground font-medium">MCP client</span>: point it at any{" "}
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MCP server</a>{" "}
            (filesystem, GitHub, Postgres, Slack, fetch, and more) and that server's tools are automatically discovered and handed to your agent — no integration code needed.
          </p>
          <p className="text-[11px] text-muted-foreground/70 font-body">
            Current limitation: only MCP <span className="text-foreground/80">tools</span> are supported today. Resources and prompts (other MCP primitives) are not yet exposed.
          </p>
        </motion.div>

        {/* A. Configure in agent.yaml */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Configure in agent.yaml — persistent, per-agent
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
                  <code className="text-[11px] text-primary font-body font-semibold shrink-0 w-52 break-all">{f.field}</code>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-body shrink-0 mt-0.5">{f.applies}</span>
                  <p className="text-[11px] text-muted-foreground font-body leading-relaxed">{f.notes}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* B. Configure via SDK */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Configure via the SDK — per-call, programmatic
          </h3>
          <CodeBlock code={sdkCode} filename="mcp-example.ts" className="mb-3" />
          <p className="text-[11px] text-muted-foreground font-body">
            SDK <code className="text-primary text-xs">mcpServers</code> are <span className="text-foreground/80">merged</span> with any <code className="text-primary text-xs">agent.yaml</code> <code className="text-primary text-xs">mcp_servers</code> — if the same key exists in both, the SDK value wins.
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
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed relative z-10">{s.text}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {behaviors.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="paper-card p-4 border-primary/30 hover:border-primary/50 transition-colors"
              >
                <p className="text-xs font-semibold text-foreground font-heading mb-1 relative z-10">{b.label}</p>
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed relative z-10">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* D. Try it yourself */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 font-body">
            Try it yourself — a real, no-setup server
          </h3>
          <p className="text-[11px] text-muted-foreground font-body mb-4 leading-relaxed">
            The easiest server to test against is <code className="text-primary text-xs">@modelcontextprotocol/server-filesystem</code> (official, no API keys needed).
          </p>

          <p className="text-[11px] text-foreground/80 font-body mb-2 font-medium">Step 1 — point a server at an agent directory in its <code className="text-primary text-xs">agent.yaml</code>:</p>
          <CodeBlock code={tryFsYaml} filename="agent.yaml" className="mb-5" />

          <p className="text-[11px] text-foreground/80 font-body mb-2 font-medium">Step 2 — run it and watch the tool discovery:</p>
          <CodeBlock code={tryRunCmd} filename="terminal" className="mb-2" />
          <p className="text-[11px] text-muted-foreground font-body mb-5 leading-relaxed">
            You should see <code className="text-primary text-xs">fs__read_file</code>, <code className="text-primary text-xs">fs__list_directory</code>, <code className="text-primary text-xs">fs__search_files</code>, etc. in the tool list GitAgent prints on startup — confirming the server connected and its tools were namespaced correctly.
          </p>

          <p className="text-[11px] text-foreground/80 font-body mb-2 font-medium">Step 3 — actually use one:</p>
          <CodeBlock code={tryUseCmd} filename="terminal" className="mb-2" />
          <p className="text-[11px] text-muted-foreground font-body mb-5 leading-relaxed">
            Watch for a <code className="text-primary text-xs">tool_use</code> event calling <code className="text-primary text-xs">fs__list_directory</code> (or similar) in the output — that's the MCP round-trip actually happening, not the model just describing what it would do.
          </p>

          <p className="text-[11px] text-foreground/80 font-body mb-2 font-medium">Step 4 — test the fail-soft behavior (optional): point a server at a command that doesn't exist and confirm GitAgent still starts fine:</p>
          <CodeBlock code={brokenYaml} filename="agent.yaml" className="mb-2" />
          <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
            Run the same command again — you'll see a <code className="text-primary text-xs">[mcp:broken] failed to connect: … — skipping</code> warning in stderr, but the agent still starts and the <code className="text-primary text-xs">fs</code> server (if still configured) still works.
          </p>
        </motion.div>

        {/* E. Troubleshooting */}
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
