"use client";

import { useState } from "react";
import { Card, SectionHeader, ScoreBar } from "./ui/Card";
import { callAI } from "@/lib/api";
import { loadUsage, saveUsage, nudgeScore } from "@/lib/storage";
import { ShieldOff, RotateCcw } from "lucide-react";

const PROBLEMS = [
  "You have a sorted list of 1,000 numbers and need to find one value. Would you scan it one by one, or is there a faster way? Explain your reasoning.",
  "A friend says 'more RAM always makes a program run faster.' Is that true? Explain your reasoning.",
  "Why might a recursive function that works perfectly for small inputs suddenly crash for large ones?",
];

interface Result {
  independentReasoning: number;
  conceptUnderstanding: number;
  selfCorrection: number;
  feedback: string;
}

export function NoAIRound() {
  const [active, setActive] = useState(false);
  const [problem, setProblem] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function begin() {
    const p = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
    setProblem(p);
    setActive(true);
    setResult(null);
    setAnswer("");
  }

  async function submit() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await callAI<Result>("noai_evaluate", { problem, studentSolution: answer.trim() });
      setResult(res);
      const usage = loadUsage();
      saveUsage({ ...usage, independentlySolved: usage.independentlySolved + 1 });
      nudgeScore({
        independence: 4,
        reasoning: 2,
        selfCorrection: Math.round((res.selfCorrection - 60) / 10),
      });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setActive(false);
    setProblem("");
    setAnswer("");
    setResult(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SectionHeader
        eyebrow="Confidence Builder"
        title="Think on Your Own"
        description="A short challenge with AI help paused. Not a test — a chance to notice how far your own reasoning already gets you."
      />

      {!active ? (
        <Card className="p-8 text-center">
          <ShieldOff className="mx-auto text-accent-dark mb-3" size={26} />
          <p className="font-display text-lg text-ink mb-1">Ready for a No-AI Round?</p>
          <p className="text-sm text-subink max-w-sm mx-auto mb-5">
            You'll get one problem. No hints, no peers — just your own reasoning. We'll reflect on
            it together afterward.
          </p>
          <button
            onClick={begin}
            className="px-5 py-2.5 rounded-full bg-accent text-white text-sm font-semibold hover:bg-accent-dark transition-colors"
          >
            Start challenge
          </button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-peer-challenger bg-peer-challengerBg border border-peer-challenger/25 rounded-full px-3 py-1.5 w-fit">
            <ShieldOff size={13} /> AI help is paused for this challenge
          </div>
          <p className="font-display text-lg text-ink mb-4 leading-snug">{problem}</p>

          {!result ? (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                placeholder="Work through it here..."
                className="w-full text-sm rounded-lg border border-line px-3 py-2.5 bg-paper focus:border-accent focus:bg-white outline-none transition-colors"
              />
              <button
                onClick={submit}
                disabled={loading || !answer.trim()}
                className="mt-3 px-5 py-2.5 rounded-full bg-accent text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent-dark transition-colors"
              >
                {loading ? "Reviewing..." : "Submit my reasoning"}
              </button>
            </>
          ) : (
            <div className="animate-fadeUp space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <ScoreBar label="Independent reasoning" value={result.independentReasoning} colorClass="bg-peer-explorer" />
                <ScoreBar label="Concept understanding" value={result.conceptUnderstanding} colorClass="bg-peer-mentor" />
                <ScoreBar label="Self-correction" value={result.selfCorrection} colorClass="bg-peer-critic" />
              </div>
              <p className="text-sm text-ink leading-relaxed bg-accent-light border border-accent/25 rounded-xl2 p-4">
                {result.feedback}
              </p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-line hover:border-accent transition-colors"
              >
                <RotateCcw size={12} /> Try another round
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
