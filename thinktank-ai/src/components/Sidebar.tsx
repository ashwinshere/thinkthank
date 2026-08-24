"use client";

import { useState } from "react";
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
  KeyRound,
} from "lucide-react";
import { ApiKeyModal } from "./ApiKeyModal";
import { getStoredApiKey } from "@/lib/api";

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
  const [openSettings, setOpenSettings] = useState(false);
  const hasKey = Boolean(getStoredApiKey());

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-line bg-surface/60 h-screen sticky top-0 py-6 px-4">
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl2 bg-accent flex items-center justify-center">
              <Home className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <div>
              <p className="font-display font-semibold text-[15px] leading-tight">ThinkTank AI</p>
              <p className="text-[11px] text-subink leading-tight">Learn by thinking</p>
            </div>
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

        <div className="mt-auto space-y-3">
          <button
            onClick={() => setOpenSettings(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-line bg-paper/60 hover:bg-paper hover:border-accent text-xs font-medium text-ink transition"
          >
            <span className="flex items-center gap-2">
              <KeyRound size={14} className="text-accent-dark" />
              AI Model Engine
            </span>
            <span className="text-[10px] uppercase font-semibold text-accent-dark px-2 py-0.5 rounded-full bg-accent-light">
              {hasKey ? "Live Gemini" : "Smart Mock"}
            </span>
          </button>

          <div className="px-3 py-3 rounded-xl bg-paper border border-line text-[11px] text-subink leading-relaxed">
            You didn&apos;t just get the answer. You learned how to think through the problem.
          </div>
        </div>
      </aside>

      <ApiKeyModal isOpen={openSettings} onClose={() => setOpenSettings(false)} />
    </>
  );
}

export function MobileNav({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <>
      <nav className="md:hidden sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-line overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 min-w-max items-center">
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
          <button
            onClick={() => setOpenSettings(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border border-line bg-paper text-accent-dark font-medium"
            title="Configure Gemini API Key"
          >
            <KeyRound size={12} />
          </button>
        </div>
      </nav>

      <ApiKeyModal isOpen={openSettings} onClose={() => setOpenSettings(false)} />
    </>
  );
}

