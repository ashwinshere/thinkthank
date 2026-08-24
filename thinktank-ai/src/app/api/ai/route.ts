import { NextRequest, NextResponse } from "next/server";
import { generateJSON, generatePeerReply, isGeminiConfigured } from "@/lib/gemini";
import { ORCHESTRATOR_NOTE, PEER_SYSTEM_PROMPTS } from "@/lib/prompts";
import { decide, OrchestratorInput } from "@/lib/orchestrator";
import { PeerId } from "@/lib/types";
import {
  mockDebate,
  mockDebateEvaluation,
  mockExplain,
  mockInsight,
  mockMistakeAnalysis,
  mockNoAiEvaluation,
  mockPeerReply,
  mockTeachEvaluation,
  mockTeachFollowup,
} from "@/lib/mock";

export const runtime = "nodejs";

async function safe<T>(fn: () => Promise<T>, fallback: () => T): Promise<{ data: T; usedMock: boolean }> {
  if (!isGeminiConfigured()) return { data: fallback(), usedMock: true };
  try {
    return { data: await fn(), usedMock: false };
  } catch (err) {
    console.error("Gemini call failed, using fallback:", err);
    return { data: fallback(), usedMock: true };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, payload } = body;

  switch (action) {
    case "peer_message": {
      const {
        history,
        studentMessage,
        turnIndex,
        usage,
        priorMistakeTopics,
        mode,
        forcePeer,
      } = payload as {
        history: { role: "student" | "peer"; text: string }[];
        studentMessage: string;
        turnIndex: number;
        usage: any;
        priorMistakeTopics: string[];
        mode: "learning" | "debate" | "teach" | "noai";
        forcePeer?: PeerId;
      };

      const decision = forcePeer
        ? { peer: forcePeer, hintLevel: 1 as const, shouldFlagMisconception: false, shouldSuggestNoAiRound: false, reason: "Requested directly" }
        : decide({
            turnIndex,
            studentMessage,
            usage,
            priorMistakeTopics,
            mode,
          } as OrchestratorInput);

      const systemInstruction = `${ORCHESTRATOR_NOTE}\n${PEER_SYSTEM_PROMPTS[decision.peer]}${
        decision.peer === "mentor"
          ? `\nCurrent hint level: ${decision.hintLevel} of 3 (1 = smallest nudge, 3 = strongest hint short of the answer).`
          : ""
      }`;

      const { data: reply, usedMock } = await safe(
        () => generatePeerReply(systemInstruction, history, studentMessage),
        () => mockPeerReply(decision.peer)
      );

      return NextResponse.json({ decision, reply, usedMock });
    }

    case "mistake_analysis": {
      const { topic, studentReasoning } = payload as {
        topic: string;
        studentReasoning: string;
      };

      const { data, usedMock } = await safe(
        () =>
          generateJSON<{
            understood: string;
            wentWrong: string;
            misconception: string;
            smallerQuestion: string;
          }>(
            `${ORCHESTRATOR_NOTE}\nYou analyze a student's reasoning kindly and precisely, for a feature called Mistake Analysis. Never use words like "wrong" or "failed".`,
            `Topic: ${topic}\nStudent's reasoning: "${studentReasoning}"\n\nReturn JSON with keys: understood (what they got right, 1 sentence), wentWrong (where the reasoning slipped, 1 sentence, gentle), misconception (the likely underlying misconception, 1 sentence), smallerQuestion (a smaller, easier question that helps fix it, 1 sentence).`
          ),
        () => mockMistakeAnalysis(topic)
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "debate_generate": {
      const { topic } = payload as { topic: string };

      const { data, usedMock } = await safe(
        () =>
          generateJSON<{
            viewpointA: { persona: "explorer"; argument: string };
            viewpointB: { persona: "challenger"; argument: string };
          }>(
            `${ORCHESTRATOR_NOTE}\nYou generate two reasonable, opposing viewpoints for a student debate exercise.`,
            `Debate topic (a claim the student made): "${topic}"\n\nReturn JSON: { "viewpointA": { "persona": "explorer", "argument": "..." }, "viewpointB": { "persona": "challenger", "argument": "..." } }. viewpointA supports the claim, viewpointB reasonably challenges it. Each argument 1-2 sentences, concrete, no hedging filler.`
          ),
        () => mockDebate(topic)
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "debate_evaluate": {
      const { topic, chosenViewpoint, studentReasoning } = payload as {
        topic: string;
        chosenViewpoint: string;
        studentReasoning: string;
      };

      const { data, usedMock } = await safe(
        () =>
          generateJSON<{
            verdict: string;
            strengthScore: number;
            feedback: string;
          }>(
            `${ORCHESTRATOR_NOTE}\nYou evaluate a student's explanation for why they picked a side in a debate. IMPORTANT: do not reward them just for picking the "correct" side — evaluate the quality of their reasoning, evidence, and specificity.`,
            `Topic: "${topic}"\nStudent chose: "${chosenViewpoint}"\nStudent's explanation for why: "${studentReasoning}"\n\nReturn JSON: { "verdict": one of "weak"|"reasonable"|"strong", "strengthScore": 0-100, "feedback": "1-2 sentences of specific, encouraging feedback on the REASONING quality" }.`
          ),
        () => mockDebateEvaluation()
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "teach_followup": {
      const { topic, conversation } = payload as {
        topic: string;
        conversation: { role: "student" | "peer"; text: string }[];
      };

      const { data, usedMock } = await safe(
        () =>
          generateJSON<{ reply: string; done: boolean }>(
            `${ORCHESTRATOR_NOTE}\nYou are a curious peer being TAUGHT by the student about "${topic}". Ask short, genuine follow-up questions that probe for depth (mechanism, edge cases, examples) — like a smart classmate who wants to really get it. After 3-4 exchanges, or once the explanation covers the mechanism, an edge case, and an example, set done=true.`,
            `Conversation so far:\n${conversation
              .map((c) => `${c.role === "student" ? "Student" : "You"}: ${c.text}`)
              .join("\n")}\n\nReturn JSON: { "reply": "your next short follow-up question or closing acknowledgement", "done": boolean }.`
          ),
        () => mockTeachFollowup()
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "teach_evaluate": {
      const { topic, conversation } = payload as {
        topic: string;
        conversation: { role: "student" | "peer"; text: string }[];
      };

      const { data, usedMock } = await safe(
        () =>
          generateJSON<{
            conceptAccuracy: number;
            clarity: number;
            missingDetails: string;
            exampleGiven: boolean;
            summary: string;
          }>(
            `${ORCHESTRATOR_NOTE}\nYou evaluate how well a student taught the concept "${topic}" to a peer.`,
            `Full teaching conversation:\n${conversation
              .map((c) => `${c.role === "student" ? "Student" : "Peer"}: ${c.text}`)
              .join("\n")}\n\nReturn JSON: { "conceptAccuracy": 0-100, "clarity": 0-100, "missingDetails": "1 short sentence on what's missing, or 'Nothing major' if complete", "exampleGiven": boolean, "summary": "1-2 sentences starting with 'Your explanation is strong because...' or similarly warm framing" }.`
          ),
        () => mockTeachEvaluation()
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "noai_evaluate": {
      const { problem, studentSolution } = payload as {
        problem: string;
        studentSolution: string;
      };

      const { data, usedMock } = await safe(
        () =>
          generateJSON<{
            independentReasoning: number;
            conceptUnderstanding: number;
            selfCorrection: number;
            feedback: string;
          }>(
            `${ORCHESTRATOR_NOTE}\nYou evaluate an independent (no-AI-help) problem attempt. This should feel confidence-building, never like an exam grade.`,
            `Problem: "${problem}"\nStudent's solution/reasoning: "${studentSolution}"\n\nReturn JSON: { "independentReasoning": 0-100, "conceptUnderstanding": 0-100, "selfCorrection": 0-100, "feedback": "2 warm, specific sentences" }.`
          ),
        () => mockNoAiEvaluation()
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "explain_my_way": {
      const { doubt, style } = payload as { doubt: string; style: string };

      const styleGuides: Record<string, string> = {
        simple: "Explain it as simply as possible using one everyday analogy.",
        example: "Explain it through one concrete worked example, step by step.",
        meme: "Explain it in a light, funny, meme-adjacent, student-friendly voice. Keep it good-natured.",
        story: "Explain it as a very short 3-4 sentence story with characters.",
        cinema: "Explain it as a short dramatic movie-scene description, cinematic but still accurate.",
        tanglish: "Explain it in casual Tanglish (Tamil + English mix, written in Latin script), the way a friend would explain it in Chennai.",
      };

      const { data, usedMock } = await safe(
        async () => {
          const text = await generatePeerReply(
            `${ORCHESTRATOR_NOTE}\nYou explain a concept in a specific requested style, for a feature called "Explain it my way". ${styleGuides[style] || styleGuides.simple} Keep it under 5 sentences. Stay factually accurate even while being playful.`,
            [],
            `Explain: ${doubt}`
          );
          return { explanation: text };
        },
        () => ({ explanation: mockExplain(style, doubt) })
      );

      return NextResponse.json({ ...data, usedMock });
    }

    case "insight": {
      const { summary } = payload as { summary: string };

      const { data, usedMock } = await safe(
        async () => {
          const text = await generatePeerReply(
            `${ORCHESTRATOR_NOTE}\nYou give ONE short, specific, encouraging insight (max 2 sentences) about a student's learning habits based on a summary of their recent session. This is about reasoning habits, never an IQ or intelligence judgement.`,
            [],
            `Session summary: ${summary}\n\nGive one short insight, in the voice of a supportive mentor.`
          );
          return { insight: text };
        },
        () => ({ insight: mockInsight() })
      );

      return NextResponse.json({ ...data, usedMock });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
