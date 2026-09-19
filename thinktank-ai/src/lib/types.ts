export type PeerId =
  | "explorer"
  | "challenger"
  | "critic"
  | "mentor"
  | "devils_advocate";

export interface PeerInfo {
  id: PeerId;
  name: string;
  tagline: string;
  description: string;
}

export const PEERS: Record<PeerId, PeerInfo> = {
  explorer: {
    id: "explorer",
    name: "Explorer",
    tagline: "Finds different ways to approach the problem.",
    description:
      "Helps you discover possibilities instead of handing you the destination. Expect questions, not answers.",
  },
  challenger: {
    id: "challenger",
    name: "Challenger",
    tagline: "Questions your reasoning.",
    description:
      "Pokes at assumptions and asks for evidence — never to be difficult, always to sharpen your thinking.",
  },
  critic: {
    id: "critic",
    name: "Critic",
    tagline: "Looks for mistakes.",
    description:
      "Reads your reasoning closely for logical gaps and edge cases, and explains what it finds gently.",
  },
  mentor: {
    id: "mentor",
    name: "Mentor",
    tagline: "Helps when you're stuck.",
    description:
      "Gives progressively stronger hints — small nudges first, never the full solution right away.",
  },
  devils_advocate: {
    id: "devils_advocate",
    name: "Devil's Advocate",
    tagline: "Argues the other side.",
    description:
      "Builds the strongest reasonable opposing case so you learn to defend — or revise — your position.",
  },
};

export interface ChatMessage {
  id: string;
  role: "student" | "peer" | "system";
  persona?: PeerId;
  answerMode?: AnswerMode;
  text: string;
  timestamp: number;
}

export interface Mistake {
  id: string;
  topic: string;
  misconception: string;
  cause: string;
  date: string;
  status: "needs-practice" | "corrected";
}

export interface UsageStats {
  hintsRequested: number;
  directAnswersRequested: number;
  independentlySolved: number;
  aiAssistedAttempts: number;
}

export interface ThinkingScore {
  reasoning: number;
  analysis: number;
  questioning: number;
  creativity: number;
  selfCorrection: number;
  independence: number;
}

export const DEFAULT_SCORE: ThinkingScore = {
  reasoning: 60,
  analysis: 60,
  questioning: 55,
  creativity: 58,
  selfCorrection: 55,
  independence: 60,
};

export const DEFAULT_USAGE: UsageStats = {
  hintsRequested: 0,
  directAnswersRequested: 0,
  independentlySolved: 0,
  aiAssistedAttempts: 0,
};

export type ExplainStyle =
  | "simple"
  | "example"
  | "meme"
  | "story"
  | "cinema"
  | "tanglish";

export type AnswerMode =
  | "direct"
  | "guided"
  | "hint"
  | "challenge"
  | "counter"
  | "analogy";

export interface AnswerModeOption {
  id: AnswerMode;
  label: string;
  tagline: string;
  badge: string;
  iconName: string;
  peer: PeerId;
}

export const ANSWER_MODES: Record<AnswerMode, AnswerModeOption> = {
  direct: {
    id: "direct",
    label: "Direct Explanation",
    tagline: "Crystal-clear breakdown with concepts, mechanism, and code/examples.",
    badge: "Clear Breakdown",
    iconName: "BookOpen",
    peer: "explorer",
  },
  guided: {
    id: "guided",
    label: "Guided Discovery",
    tagline: "Think it through together — asks guiding questions to build intuition.",
    badge: "Socratic",
    iconName: "Compass",
    peer: "explorer",
  },
  hint: {
    id: "hint",
    label: "Progressive Hints",
    tagline: "Gentle step-by-step clues without giving away the full answer.",
    badge: "Coaching",
    iconName: "Lightbulb",
    peer: "mentor",
  },
  challenge: {
    id: "challenge",
    label: "Socratic Challenge",
    tagline: "Tests your reasoning, edge cases, and architectural trade-offs.",
    badge: "Deep Probe",
    iconName: "BrainCircuit",
    peer: "challenger",
  },
  counter: {
    id: "counter",
    label: "Devil's Advocate",
    tagline: "Argues the opposing side and questions common assumptions.",
    badge: "Counter-view",
    iconName: "ShieldAlert",
    peer: "devils_advocate",
  },
  analogy: {
    id: "analogy",
    label: "Everyday Analogy",
    tagline: "Explain it simply like I'm 10 using a vivid real-life metaphor.",
    badge: "Intuitive",
    iconName: "Sparkles",
    peer: "explorer",
  },
};
