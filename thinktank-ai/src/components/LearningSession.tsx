"use client";

import { useEffect, useRef, useState } from "react";
import {
  Lightbulb,
  SendHorizonal,
  Sparkles,
  RotateCcw,
  BookOpen,
  KeyRound,
  Compass,
  BrainCircuit,
  ShieldAlert,
  Check,
} from "lucide-react";
import { Card, SectionHeader } from "./ui/Card";
import { PeerBadge } from "./PeerBadge";
import { ChatMessage, Mistake, PeerId, UsageStats, AnswerMode, ANSWER_MODES } from "@/lib/types";
import { callAI, getStoredApiKey } from "@/lib/api";
import { loadUsage, saveUsage, saveMistake, nudgeScore } from "@/lib/storage";
import { PEER_STYLES } from "@/lib/peerStyles";
import { ApiKeyModal } from "./ApiKeyModal";

const STARTER_PROMPTS = [
  "I don't understand recursion.",
  "Why does a stack use LIFO?",
  "I'm confused about time complexity.",
  "Arrays vs linked lists — I don't get the trade-off.",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface MistakeAnalysis {
  understood: string;
  wentWrong: string;
  misconception: string;
  smallerQuestion: string;
}

export function LearningSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<AnswerMode>("direct");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [trail, setTrail] = useState<PeerId[]>([]);
  const [usage, setUsage] = useState<UsageStats>(loadUsage());
  const [analysis, setAnalysis] = useState<MistakeAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [savedMistake, setSavedMistake] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [reflectionAnswer, setReflectionAnswer] = useState("");
  const [reflectionDone, setReflectionDone] = useState(false);
  const [usedMockOnce, setUsedMockOnce] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, analysis, reflecting]);

  function persistUsage(next: UsageStats) {
    setUsage(next);
    saveUsage(next);
  }

  async function sendMessage(
    text: string,
    opts?: {
      forcePeer?: PeerId;
      isHintRequest?: boolean;
      isDirectRequest?: boolean;
      answerMode?: AnswerMode;
    }
  ) {
    if (!text.trim() || loading) return;
    const activeMode = opts?.answerMode || selectedMode;
    const isFirst = messages.length === 0;
    const activeTopic = isFirst ? text.trim() : topic;
    if (isFirst) setTopic(text.trim());

    const studentMsg: ChatMessage = {
      id: uid(),
      role: "student",
      text: text.trim(),
      timestamp: Date.now(),
    };
    const nextMessages = [...messages, studentMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setAnalysis(null);

    let nextUsage = usage;
    if (opts?.isHintRequest || activeMode === "hint") {
      nextUsage = { ...usage, hintsRequested: usage.hintsRequested + 1 };
      persistUsage(nextUsage);
    } else if (opts?.isDirectRequest || activeMode === "direct") {
      nextUsage = { ...usage, directAnswersRequested: usage.directAnswersRequested + 1 };
      persistUsage(nextUsage);
    }

    try {
      const history = nextMessages
        .slice(0, -1)
        .map((m) => ({ role: m.role === "student" ? "student" : "peer", text: m.text } as const));

      const res = await callAI<{ decision: { peer: PeerId }; reply: string; usedMock: boolean }>(
        "peer_message",
        {
          history,
          studentMessage: studentMsg.text,
          turnIndex: trail.length,
          usage: nextUsage,
          priorMistakeTopics: [],
          mode: "learning",
          forcePeer: opts?.forcePeer,
          isDirectRequest: opts?.isDirectRequest || activeMode === "direct",
          answerMode: activeMode,
          topic: activeTopic,
        }
      );

      if (res.usedMock) setUsedMockOnce(true);

      const peerMsg: ChatMessage = {
        id: uid(),
        role: "peer",
        persona: res.decision.peer,
        answerMode: activeMode,
        text: res.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, peerMsg]);
      setTrail((prev) => [...prev, res.decision.peer]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "system",
          text: "Something went wrong reaching the AI peer. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runMistakeAnalysis() {
    const lastStudentMsg = [...messages].reverse().find((m) => m.role === "student");
    if (!topic || !lastStudentMsg) return;
    setAnalysisLoading(true);
    try {
      const res = await callAI<MistakeAnalysis & { usedMock: boolean }>("mistake_analysis", {
        topic,
        studentReasoning: lastStudentMsg.text,
      });
      setAnalysis(res);
      setSavedMistake(false);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function saveToMuseum() {
    if (!analysis || !topic) return;
    const mistake: Mistake = {
      id: uid(),
      topic,
      misconception: analysis.misconception,
      cause: analysis.wentWrong,
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      status: "needs-practice",
    };
    saveMistake(mistake);
    setSavedMistake(true);
    nudgeScore({ selfCorrection: 2, analysis: 2 });
  }

  async function finishReflection() {
    if (!reflectionAnswer.trim()) return;
    setReflectionDone(true);
    nudgeScore({ reasoning: 3, independence: 2, questioning: 1 });
    persistUsage({ ...usage, independentlySolved: usage.independentlySolved + 1 });
  }

  function resetSession() {
    setMessages([]);
    setTopic(null);
    setTrail([]);
    setAnalysis(null);
    setSavedMistake(false);
    setReflecting(false);
    setReflectionAnswer("");
    setReflectionDone(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader
          eyebrow="Learning Session"
          title="What are you trying to understand?"
          description="Bring a question or a half-formed idea. Your AI peer team will explain the intuition and think it through with you."
        />
        <button
          onClick={() => setShowKeyModal(true)}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-paper hover:border-accent text-ink transition shrink-0 self-start mt-2"
        >
          <KeyRound size={13} className="text-accent-dark" />
          {getStoredApiKey() ? "⚡ Live AI" : "🧠 Smart Mock"}
        </button>
      </div>

      {messages.length === 0 ? (
        <Card className="p-6 md:p-8">
          <StarterInput
            onSend={(t, mode) => sendMessage(t, { answerMode: mode })}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
          />
          <div className="mt-6 pt-5 border-t border-line">
            <p className="text-xs font-semibold text-subink uppercase tracking-wider mb-2.5">
              Or choose a starter question
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p, { answerMode: selectedMode })}
                  className="text-left text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-paper/80 border border-line hover:border-accent hover:bg-accent/5 hover:text-accent-dark transition-all flex items-center justify-between group"
                >
                  <span className="font-medium text-ink group-hover:text-accent-dark">{p}</span>
                  <span className="text-subink/40 group-hover:text-accent group-hover:translate-x-0.5 transition-transform text-xs font-bold">→</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col h-[70vh] overflow-hidden">
          {trail.length > 0 && (
            <div className="px-5 py-3 border-b border-line bg-paper/60 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-subink shrink-0">
                    Reasoning trail
                  </span>
                  {trail.map((p, i) => (
                    <span key={i} className="flex items-center gap-2 shrink-0">
                      {i > 0 && <span className="text-subink/50 text-xs">→</span>}
                      <PeerBadge peer={p} size="sm" />
                    </span>
                  ))}
                </div>

                <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-line text-xs">
                  <span className="text-[10px] uppercase font-bold text-subink/80">Mode:</span>
                  <span className="text-xs font-semibold text-accent-dark bg-accent-light px-2.5 py-0.5 rounded-full border border-accent/20 flex items-center gap-1">
                    <ModeIcon mode={selectedMode} size={12} />
                    {ANSWER_MODES[selectedMode]?.label}
                  </span>
                </div>
              </div>

              <button
                onClick={resetSession}
                className="text-[11px] text-subink hover:text-accent-dark transition flex items-center gap-1 shrink-0 font-medium"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-subink text-sm pl-1">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-subink animate-pulseDot" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-subink animate-pulseDot" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-subink animate-pulseDot" style={{ animationDelay: "0.3s" }} />
                </span>
                thinking with you in {ANSWER_MODES[selectedMode]?.label} mode...
              </div>
            )}

            {analysisLoading && (
              <p className="text-sm text-subink pl-1">Looking closely at the reasoning...</p>
            )}

            {analysis && (
              <div className="animate-fadeUp bg-peer-criticBg border border-peer-critic/25 rounded-xl2 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-peer-critic mb-1">
                  Mistake Analysis
                </p>
                <p className="text-sm text-ink"><span className="font-semibold">What you got right: </span>{analysis.understood}</p>
                <p className="text-sm text-ink"><span className="font-semibold">Where it slipped: </span>{analysis.wentWrong}</p>
                <p className="text-sm text-ink"><span className="font-semibold">Likely misconception: </span>{analysis.misconception}</p>
                <p className="text-sm text-ink"><span className="font-semibold">Try this smaller question: </span>{analysis.smallerQuestion}</p>
                <div className="pt-1">
                  {savedMistake ? (
                    <span className="text-xs font-medium text-accent-dark">Saved to Mistake Museum ✓</span>
                  ) : (
                    <button
                      onClick={saveToMuseum}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-peer-critic/30 text-peer-critic hover:bg-peer-criticBg transition-colors"
                    >
                      Save to Mistake Museum
                    </button>
                  )}
                </div>
              </div>
            )}

            {reflecting && !reflectionDone && (
              <div className="animate-fadeUp bg-accent-light border border-accent/25 rounded-xl2 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Quick reflection</p>
                <p className="text-sm text-ink">What helped you understand this?</p>
                <textarea
                  value={reflectionAnswer}
                  onChange={(e) => setReflectionAnswer(e.target.value)}
                  rows={2}
                  className="w-full text-sm rounded-lg border border-line px-3 py-2 bg-white focus:border-accent outline-none"
                  placeholder="e.g. Breaking it into the smallest possible case made it click."
                />
                <button
                  onClick={finishReflection}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors"
                >
                  Save reflection
                </button>
              </div>
            )}

            {reflectionDone && (
              <div className="animate-fadeUp text-center py-4">
                <p className="font-display text-lg text-ink">
                  You didn&apos;t just get the answer.
                </p>
                <p className="font-display text-lg text-accent-dark">You learned how to think through it.</p>
                <button
                  onClick={resetSession}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-line hover:border-accent transition-colors"
                >
                  <RotateCcw size={12} /> Start a new topic
                </button>
              </div>
            )}
          </div>

          {!reflectionDone && (
            <div className="border-t border-line p-4 bg-surface">
              {/* Quick action chips */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <button
                  disabled={loading || messages.length === 0}
                  onClick={() => {
                    setSelectedMode("direct");
                    sendMessage("Can you explain this concept clearly with an example?", {
                      forcePeer: "explorer",
                      isDirectRequest: true,
                      answerMode: "direct",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-accent-light text-accent-dark border border-accent/25 disabled:opacity-40 hover:brightness-95 transition"
                >
                  <BookOpen size={13} /> Explain concept
                </button>
                <button
                  disabled={loading || messages.length === 0}
                  onClick={() => {
                    setSelectedMode("hint");
                    sendMessage("I don't know, can you give me a hint?", {
                      forcePeer: "mentor",
                      isHintRequest: true,
                      answerMode: "hint",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-peer-mentorBg text-peer-mentor border border-peer-mentor/25 disabled:opacity-40 hover:brightness-95 transition"
                >
                  <Lightbulb size={13} /> I need a hint
                </button>
                <button
                  disabled={loading || messages.length === 0}
                  onClick={runMistakeAnalysis}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-peer-criticBg text-peer-critic border border-peer-critic/25 disabled:opacity-40 hover:brightness-95 transition"
                >
                  Analyze my reasoning
                </button>
                <button
                  disabled={loading || messages.length < 2}
                  onClick={() => setReflecting(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-paper text-ink border border-line disabled:opacity-40 hover:border-accent transition"
                >
                  <Sparkles size={13} /> Wrap up &amp; reflect
                </button>
              </div>

              {/* Dynamic Answering Mode Selector Bar for follow-ups */}
              <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subink shrink-0 mr-1">
                  Answer Mode:
                </span>
                {(Object.keys(ANSWER_MODES) as AnswerMode[]).map((modeKey) => {
                  const mode = ANSWER_MODES[modeKey];
                  const isSelected = selectedMode === modeKey;
                  return (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => setSelectedMode(modeKey)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                        isSelected
                          ? "bg-accent text-white shadow-xs font-semibold"
                          : "bg-paper border border-line text-subink hover:text-ink hover:border-line-dark"
                      }`}
                      title={mode.tagline}
                    >
                      <ModeIcon mode={modeKey} size={12} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input, { answerMode: selectedMode });
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask follow-up in ${ANSWER_MODES[selectedMode]?.label || "selected"} mode...`}
                  className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm bg-paper focus:border-accent focus:bg-white outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:bg-accent-dark transition-colors shrink-0 shadow-sm"
                  aria-label="Send"
                >
                  <SendHorizonal size={16} />
                </button>
              </form>
            </div>
          )}
        </Card>
      )}

      {usedMockOnce && !getStoredApiKey() && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-subink">
          <span>Running on ThinkTank Smart Knowledge Engine.</span>
          <button
            onClick={() => setShowKeyModal(true)}
            className="text-accent-dark font-medium underline hover:text-accent"
          >
            Add Gemini API key for live AI
          </button>
        </div>
      )}

      <ApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </div>
  );
}

function ModeIcon({ mode, size = 14 }: { mode: AnswerMode; size?: number }) {
  switch (mode) {
    case "direct":
      return <BookOpen size={size} />;
    case "guided":
      return <Compass size={size} />;
    case "hint":
      return <Lightbulb size={size} />;
    case "challenge":
      return <BrainCircuit size={size} />;
    case "counter":
      return <ShieldAlert size={size} />;
    case "analogy":
      return <Sparkles size={size} />;
  }
}

function StarterInput({
  onSend,
  selectedMode,
  onSelectMode,
}: {
  onSend: (text: string, mode: AnswerMode) => void;
  selectedMode: AnswerMode;
  onSelectMode: (mode: AnswerMode) => void;
}) {
  const [value, setValue] = useState("");
  const defaultPrompt = "I don't understand recursion.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = value.trim() || defaultPrompt;
    onSend(textToSend, selectedMode);
  };

  return (
    <div className="space-y-6">
      {/* 1. Mode Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            <span>Choose How the AI Answers</span>
          </label>
          <span className="text-xs text-subink font-medium">Select your preferred style</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(Object.keys(ANSWER_MODES) as AnswerMode[]).map((modeKey) => {
            const mode = ANSWER_MODES[modeKey];
            const isSelected = selectedMode === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                onClick={() => onSelectMode(modeKey)}
                className={`text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative group ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-2 ring-accent/20 shadow-sm"
                    : "border-line bg-paper/60 hover:border-accent/40 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1.5 rounded-xl transition-colors ${
                          isSelected
                            ? "bg-accent text-white"
                            : "bg-paper border border-line text-subink group-hover:text-accent group-hover:border-accent/30"
                        }`}
                      >
                        <ModeIcon mode={modeKey} size={15} />
                      </span>
                      <span
                        className={`text-xs font-bold tracking-tight ${
                          isSelected ? "text-accent-dark" : "text-ink group-hover:text-accent-dark"
                        }`}
                      >
                        {mode.label}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-subink leading-snug line-clamp-2 mt-1">
                    {mode.tagline}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                      isSelected
                        ? "bg-white border-accent/30 text-accent-dark shadow-2xs"
                        : "bg-paper border-line text-subink/80"
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Question Input Form */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-ink mb-2.5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[11px] font-bold">
            2
          </span>
          <span>Ask Your Question or Topic</span>
        </label>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. I don't understand recursion..."
              className="w-full rounded-2xl border border-line px-5 py-3.5 text-[15px] bg-paper focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15 outline-none transition-all"
            />
            {!value.trim() && (
              <button
                type="button"
                onClick={() => setValue(defaultPrompt)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-accent hover:underline bg-paper px-2 py-1 rounded-md border border-line/60"
              >
                Use example
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-12 px-5 rounded-2xl bg-accent text-white flex items-center gap-2 hover:bg-accent-dark transition-all shrink-0 shadow-sm font-semibold text-sm active:scale-95"
            aria-label="Start"
          >
            <span>Ask</span>
            <SendHorizonal size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "system") {
    return <p className="text-xs text-center text-subink italic">{message.text}</p>;
  }
  if (message.role === "student") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-accent text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed animate-fadeUp">
          {message.text}
        </div>
      </div>
    );
  }
  const style = message.persona ? PEER_STYLES[message.persona] : PEER_STYLES.explorer;
  return (
    <div className="flex flex-col items-start gap-1.5 animate-fadeUp">
      <div className="flex items-center gap-2 flex-wrap">
        {message.persona && <PeerBadge peer={message.persona} size="sm" />}
        {message.answerMode && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-line text-subink inline-flex items-center gap-1 shadow-2xs">
            <ModeIcon mode={message.answerMode} size={10} />
            <span>{ANSWER_MODES[message.answerMode]?.label || message.answerMode}</span>
          </span>
        )}
      </div>
      <div
        className={`max-w-[90%] ${style.bg} border ${style.border} rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-ink leading-relaxed shadow-xs`}
      >
        <FormattedText text={message.text} />
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  // Simple markdown renderer for bold, code blocks, inline code, and paragraphs
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const content = part.replace(/^```[a-z]*\n?|```$/g, "");
          return (
            <pre
              key={idx}
              className="bg-paper/80 border border-line rounded-xl p-3 text-xs font-mono overflow-x-auto text-ink"
            >
              <code>{content}</code>
            </pre>
          );
        }

        const paragraphs = part.split("\n\n");
        return (
          <div key={idx} className="space-y-2">
            {paragraphs.map((para, pIdx) => {
              if (!para.trim()) return null;
              // Format bold and inline code
              const formattedPara = formatInline(para);
              return (
                <p key={pIdx} className="leading-relaxed">
                  {formattedPara}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatInline(text: string) {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\n)/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-paper border border-line px-1.5 py-0.5 rounded text-xs font-mono text-accent-dark"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token === "\n") {
      return <br key={i} />;
    }
    return token;
  });
}



