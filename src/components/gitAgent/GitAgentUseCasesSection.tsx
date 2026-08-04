import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheck, Brain, MessagesSquare, Mic, FileText, Plus } from "lucide-react";

const moreExamples = ["Internal Ops Copilot", "Self-Improving Incident Responder", "Multi-Agent Engineering Team", "Safe Migration Runner"];

const useCases = [
  { icon: ShieldCheck, tag: "Code", accent: "#8C5A3C", title: "Code Review Agent", desc: "Hand it any external codebase and it clones it, reads through the changes, flags bugs and security issues, and writes up a structured review. Its own personality and rules never mix with the code it's reviewing. You decide whether it needs your approval before posting anything back." },
  { icon: Brain, tag: "Memory", accent: "#4A6B5A", title: "Personal Assistant with Memory", desc: "Everything it learns about you is saved permanently and automatically versioned — nothing is lost if it restarts, and there's no database to manage. Give each person or project its own completely separate, independently evolving memory." },
  { icon: MessagesSquare, tag: "Support", accent: "#4A5A73", title: "Customer Support Agent", desc: "Give it a defined personality, clear boundaries on what it can and can't say, and your help docs as its knowledge base. Tell it exactly when to hand off to a human instead of leaving it to guess. Anything it explicitly remembers is saved and versioned automatically." },
  { icon: Mic, tag: "Voice", accent: "#8A5F8C", title: "Voice Assistant", desc: "Turn the same assistant into a real-time voice experience — talk to it and it talks back, with camera and screen sharing built in. It remembers everything the same way the text version does, so it feels like one continuous assistant." },
  { icon: FileText, tag: "Research", accent: "#B5883A", title: "Automated Research & Report Writer", desc: "Give it a topic and a format, and it researches, cross-references sources, and writes the report for you, with every draft saved along the way. Set it to run automatically on a schedule, like a weekly market summary that just shows up ready to read." },
];

function MoreCard({ i }: { i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.05 }}
      className="relative overflow-hidden p-6 sm:p-7 h-full flex flex-col rounded-lg border border-dashed border-border/60 bg-transparent"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground bg-muted/40">
          <Plus className="w-[18px] h-[18px]" />
        </span>
        <h3 className="text-base font-heading font-bold text-foreground leading-tight">And more</h3>
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground font-body mb-4">
        Anything you can describe as a task, an agent can be built around:
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {moreExamples.map((ex) => (
          <span
            key={ex}
            className="text-[11px] font-body text-muted-foreground border border-border/70 rounded-full px-2.5 py-1"
          >
            {ex}
          </span>
        ))}
      </div>

      <Link
        to="/docs/sdk/cookbooks/refactor-repo"
        className="mt-auto text-[13px] font-body text-primary hover:underline w-fit"
      >
        See a full worked example in the cookbooks →
      </Link>
    </motion.div>
  );
}

function UseCaseCard({ u, i }: { u: (typeof useCases)[number]; i: number }) {
  const Icon = u.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.05 }}
      className="paper-card relative overflow-hidden p-6 sm:p-7 h-full flex flex-col"
    >
      {/* Accent bar */}
      <span className="absolute inset-x-0 top-0 h-1 z-10" style={{ background: u.accent }} />

      {/* Category tag */}
      <span
        className="inline-block w-fit text-[10px] uppercase tracking-wider font-body rounded-full px-2 py-0.5 mb-3 relative z-10"
        style={{ color: u.accent, background: `${u.accent}1F` }}
      >
        {u.tag}
      </span>

      {/* Head: icon badge + title */}
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ color: u.accent, background: `${u.accent}29` }}
        >
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <h3 className="text-base font-heading font-bold text-foreground leading-tight">{u.title}</h3>
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground font-body relative z-10">
        {u.desc}
      </p>
    </motion.div>
  );
}

export function GitAgentUseCasesSection() {
  return (
    <section id="use-cases" className="py-20 px-6 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <span className="text-[10px] text-muted-foreground/40 font-body tracking-widest uppercase mb-1 block">
            06 — Use Cases
          </span>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            What you can build
          </h2>
          <p className="text-sm text-muted-foreground font-body max-w-2xl leading-relaxed">
            One git-native framework, many agents — from autonomous repo agents to an SDK embedded in your product.
          </p>
        </motion.div>

        {/* Clean 3x2 grid: 5 real use cases + a 6th "more" tile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((u, i) => (
            <UseCaseCard key={u.title} u={u} i={i} />
          ))}
          <MoreCard i={useCases.length} />
        </div>
      </div>
    </section>
  );
}
