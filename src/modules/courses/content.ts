import { z } from "zod";

/**
 * Lesson content (MVP). Partners never inject HTML (CLAUDE.md): a lesson body is a small
 * Markdown subset that parses into typed nodes, which React renders as elements. Unknown syntax
 * stays literal text, so nothing an author types can become markup or script.
 *
 * Supported: `## heading`, `### subheading`, `- item` lists, `1. item` lists, paragraphs,
 * `**bold**`, `*italic*`, and `[text](https://…)` links (https only).
 */
export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "link"; href: string; text: string };

export type BlockNode =
  | { type: "heading"; level: 2 | 3; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

const INLINE = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]{1,200})\]\((https:\/\/[^\s)]{1,500})\)/g;

export function safeHttpsUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseInline(text: string, depth = 0): InlineNode[] {
  const out: InlineNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ type: "text", value: text.slice(last, index) });
    if (m[1] !== undefined) {
      out.push({
        type: "strong",
        children: depth < 2 ? parseInline(m[1], depth + 1) : [{ type: "text", value: m[1] }],
      });
    } else if (m[2] !== undefined) {
      out.push({
        type: "em",
        children: depth < 2 ? parseInline(m[2], depth + 1) : [{ type: "text", value: m[2] }],
      });
    } else {
      const href = safeHttpsUrl(m[4]!);
      out.push(href ? { type: "link", href, text: m[3]! } : { type: "text", value: m[0] });
    }
    last = index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

const UL = /^\s*[-*]\s+(.*)$/;
const OL = /^\s*\d{1,3}[.)]\s+(.*)$/;

export function parseBody(body: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const chunks = body.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    const first = lines[0]!;
    const heading = /^(#{1,3})\s+(.*)$/.exec(first);
    if (heading && lines.length === 1) {
      blocks.push({
        type: "heading",
        level: heading[1]!.length === 3 ? 3 : 2,
        children: parseInline(heading[2]!.trim()),
      });
      continue;
    }
    if (lines.every((l) => UL.test(l)) || lines.every((l) => OL.test(l))) {
      const ordered = OL.test(first);
      const re = ordered ? OL : UL;
      blocks.push({
        type: "list",
        ordered,
        items: lines.map((l) => parseInline(re.exec(l)![1]!.trim())),
      });
      continue;
    }
    blocks.push({ type: "paragraph", children: parseInline(lines.map((l) => l.trim()).join(" ")) });
  }
  return blocks;
}

/** YouTube or Vimeo watch URL → privacy-friendly embed URL; anything else → null. */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const YT_ID = /^[A-Za-z0-9_-]{11}$/;
  let id: string | null = null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live"].includes(parts[0] ?? "")) id = parts[1] ?? null;
  } else if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (id && YT_ID.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const num = host === "vimeo.com" ? parts[0] : parts[0] === "video" ? parts[1] : undefined;
    if (num && /^\d{1,12}$/.test(num)) return `https://player.vimeo.com/video/${num}?dnt=1`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Quizzes (single and multiple choice, pass mark).

const shortId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);

export const quizQuestionSchema = z
  .strictObject({
    id: shortId,
    prompt: z.string().trim().min(1).max(500),
    kind: z.enum(["single", "multiple"]),
    options: z
      .array(z.strictObject({ id: shortId, text: z.string().trim().min(1).max(300) }))
      .min(2)
      .max(10),
    correct: z.array(shortId).min(1).max(10),
  })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, {
    message: "duplicate_option",
  })
  .refine((q) => q.correct.every((c) => q.options.some((o) => o.id === c)), {
    message: "unknown_correct_option",
  })
  .refine((q) => q.kind === "multiple" || q.correct.length === 1, {
    message: "single_needs_one_correct",
  });

export const quizSchema = z
  .strictObject({
    passMark: z.number().int().min(0).max(100),
    questions: z.array(quizQuestionSchema).min(1).max(50),
  })
  .refine((q) => new Set(q.questions.map((x) => x.id)).size === q.questions.length, {
    message: "duplicate_question",
  });
export type Quiz = z.infer<typeof quizSchema>;

/** What a learner sees: no answer key. */
export interface PublicQuiz {
  passMark: number;
  questions: {
    id: string;
    prompt: string;
    kind: "single" | "multiple";
    options: { id: string; text: string }[];
  }[];
}

export function publicQuiz(quiz: Quiz): PublicQuiz {
  return {
    passMark: quiz.passMark,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      options: q.options,
    })),
  };
}

export const quizAnswersSchema = z.record(shortId, z.array(shortId).max(10));
export type QuizAnswers = z.infer<typeof quizAnswersSchema>;

export function gradeQuiz(
  quiz: Quiz,
  answers: QuizAnswers,
): { score: number; passed: boolean; correctCount: number; total: number } {
  let correctCount = 0;
  for (const q of quiz.questions) {
    const given = new Set(answers[q.id] ?? []);
    const expected = new Set(q.correct);
    if (given.size === expected.size && [...expected].every((c) => given.has(c))) correctCount++;
  }
  const total = quiz.questions.length;
  const score = Math.round((correctCount / total) * 100);
  return { score, passed: score >= quiz.passMark, correctCount, total };
}

// ---------------------------------------------------------------------------------------------

export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "course";
}

export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}
