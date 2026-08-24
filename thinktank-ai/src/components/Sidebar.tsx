"use client";

import {
  BrainCircuit,
  Home,
  MessagesSquare,
  Swords,
  Archive,
  GraduationCap,
  Target,
  Sparkles,
  LineChart,
} from "lucide-react";

export type Section =
  | "session"
  | "team"
  | "debate"
  | "museum"
  | "teach"
  | "noai"
  | "explain"
  | "growth";

const NAV: { id: Section; label: string; icon: any }[] = [
  { id: "session", label: "Learning Session", icon: MessagesSquare },
  { id: "team", label: "AI Peer Team", icon: BrainCircuit },
  { id: "debate", label: "AI Debate", icon: Swords },
  { id: "museum", label: "Mistake Museum", icon: Archive },
  { id: "teach", label: "Teach the AI", icon: GraduationCap },
  { id: "noai", label: "Think on Your Own", icon: Target },
  { id: "explain", label: "Explain It My Way", icon: Sparkles },
  { id: "growth", label: "My Growth", icon: LineChart },
];

export function Sidebar({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-line bg-surface/60 h-screen sticky top-0 py-6 px-4">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl2 bg-accent flex items-center justify-center">
          <Home className="w-4.5 h-4.5 text-white" size={18} />
        </div>
        <div>
          <p className="font-display font-semibold text-[15px] leading-tight">ThinkTank AI</p>
          <p className="text-[11px] text-subink leading-tight">Learn by thinking</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              active === id
                ? "bg-accent-light text-accent-dark"
                : "text-subink hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-3 py-4 rounded-xl2 bg-paper border border-line text-[12px] text-subink leading-relaxed">
        You didn&apos;t just get the answer. You learned how to think through the problem.
      </div>
    </aside>
  );
}

export function MobileNav({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <nav className="md:hidden sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-line overflow-x-auto">
      <div className="flex gap-1 px-3 py-2 min-w-max">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap ${
              active === id ? "bg-accent-light text-accent-dark" : "text-subink"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
