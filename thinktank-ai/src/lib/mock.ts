import { PeerId } from "./types";

/** Deterministic, topic-agnostic fallback lines per peer, used only when
 * Gemini is unavailable. Keeps the demo fully functional offline / without
 * an API key.
 */
const FALLBACK_LINES: Record<PeerId, string[]> = {
  explorer: [
    "Let's start simple — what do you think is actually happening here, in your own words?",
    "Interesting starting point. What's another way you could look at this?",
    "What would happen if you tried the smallest possible version of this problem?",
  ],
  challenger: [
    "What makes you confident about that? What's the evidence behind it?",
    "That's one assumption baked into your answer — where does it come from?",
    "Would that still hold true in every case, or just the one you're picturing?",
  ],
  critic: [
    "There's a small gap in that reasoning — what happens at the edge case?",
    "You're close. One step in that chain doesn't quite connect yet — which one do you think it is?",
    "Let's look at the reasoning together: what would break this if it were true?",
  ],
  mentor: [
    "You're closer than you think. Here's a small nudge: focus on what has to be true for this to stop.",
    "Try naming the one condition that changes between the first step and the last.",
    "Here's a slightly bigger hint — think about what makes this case different from a smaller one.",
  ],
  devils_advocate: [
    "Here's the strongest case against your position: what if the opposite were more efficient in practice?",
    "I'd push back — your argument assumes the common case, but what about the rare one?",
    "Fair point, actually — that's a stronger reason than I expected. Can you push it further?",
  ],
};

let counter = 0;
export function mockPeerReply(peer: PeerId): string {
  const lines = FALLBACK_LINES[peer];
  const line = lines[counter % lines.length];
  counter += 1;
  return line;
}

export function mockMistakeAnalysis(topic: string) {
  return {
    understood: `You have a solid grip on the basic idea behind ${topic}.`,
    wentWrong:
      "The reasoning skips the step that explains when the process should stop or change.",
    misconception:
      "It's easy to assume the mechanism 'just knows' when to stop, rather than being told explicitly.",
    smallerQuestion:
      "Try this: what is the smallest input where the answer is obvious without any steps at all?",
  };
}

export function mockDebate(topic: string) {
  return {
    viewpointA: {
      persona: "explorer" as const,
      argument: `There's a strong practical case here — it's the option that's simpler to reason about and works well for the common case in "${topic}".`,
    },
    viewpointB: {
      persona: "challenger" as const,
      argument: `But that argument assumes the common case is what matters most — under different constraints in "${topic}", the trade-offs flip.`,
    },
  };
}

export function mockDebateEvaluation() {
  return {
    verdict: "reasonable",
    strengthScore: 70,
    feedback:
      "You picked a side and backed it with a real reason rather than just intuition — that's the important part. Try adding one concrete example next time to make it airtight.",
  };
}

export function mockTeachFollowup() {
  return {
    reply: "Got it — and what tells it when to stop, exactly?",
    done: false,
  };
}

export function mockTeachEvaluation() {
  return {
    conceptAccuracy: 78,
    clarity: 72,
    missingDetails: "You explained the mechanism but not the stopping condition.",
    exampleGiven: false,
    summary:
      "Your explanation is strong because you described the core mechanism clearly. Adding a concrete example would make it even easier to follow.",
  };
}

export function mockNoAiEvaluation() {
  return {
    independentReasoning: 82,
    conceptUnderstanding: 88,
    selfCorrection: 74,
    feedback:
      "You worked through this without hints and your reasoning held together well. The small wobble was in the middle step — worth a second look next time.",
  };
}

export function mockExplain(style: string, doubt: string) {
  const byStyle: Record<string, string> = {
    simple: `Think of it like stacking plates: the last plate you put down is the first one you take off. That's the core idea behind "${doubt}".`,
    example: `Say you're undoing a to-do list one item at a time, always undoing the most recent item first — that's the pattern behind "${doubt}".`,
    meme: `It's giving "last one in, first one out" energy — the diva who just arrived and demands to leave first. That's basically "${doubt}".`,
    story: `Imagine a narrow hallway where only one person can enter or exit at a time — the last person in has to leave first before anyone else can. That's the shape of "${doubt}".`,
    cinema: `Picture a heist crew descending one by one into a vault through a single rope — to climb back out, the last one down has to be the first one up. That's "${doubt}", cinematic edit.`,
    tanglish: `Andha concept romba simple da — last-a vந்தது dhaan first-a poidum, matter enna na "${doubt}" idhu maadhiri thaan work aagum.`,
  };
  return byStyle[style] || byStyle.simple;
}

export function mockInsight(): string {
  return "You're good at reaching a working answer. Try explaining WHY it works next — that's the muscle that grows fastest with practice.";
}
