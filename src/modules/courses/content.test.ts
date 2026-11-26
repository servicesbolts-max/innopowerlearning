import { describe, expect, it } from "vitest";
import {
  gradeQuiz,
  parseBody,
  parseInline,
  progressPercent,
  publicQuiz,
  quizSchema,
  slugify,
  videoEmbedUrl,
  type Quiz,
} from "./content";
import { likePattern } from "./queries";
import { __test } from "./authoring";

describe("lesson body parser", () => {
  it("parses headings, paragraphs and lists into typed nodes", () => {
    expect(
      parseBody("## Intro\n\nHello **world**.\n\n- one\n- two\n\n1. first\n2. second"),
    ).toEqual([
      { type: "heading", level: 2, children: [{ type: "text", value: "Intro" }] },
      {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "strong", children: [{ type: "text", value: "world" }] },
          { type: "text", value: "." },
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [[{ type: "text", value: "one" }], [{ type: "text", value: "two" }]],
      },
      {
        type: "list",
        ordered: true,
        items: [[{ type: "text", value: "first" }], [{ type: "text", value: "second" }]],
      },
    ]);
  });

  it("keeps markup and script as literal text", () => {
    const nodes = parseBody('<script>alert(1)</script> <img src=x onerror="y">');
    expect(nodes).toEqual([
      {
        type: "paragraph",
        children: [{ type: "text", value: '<script>alert(1)</script> <img src=x onerror="y">' }],
      },
    ]);
  });

  it("only links https URLs", () => {
    expect(parseInline("[ok](https://example.org/a)")).toEqual([
      { type: "link", href: "https://example.org/a", text: "ok" },
    ]);
    expect(parseInline("[bad](javascript:alert(1))")).toEqual([
      { type: "text", value: "[bad](javascript:alert(1))" },
    ]);
    expect(parseInline("[bad](http://example.org)")[0]).toMatchObject({ type: "text" });
  });

  it("parses italic", () => {
    expect(parseInline("a *b* c")[1]).toEqual({
      type: "em",
      children: [{ type: "text", value: "b" }],
    });
  });
});

describe("video embeds", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    [
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871?dnt=1"],
    ["https://player.vimeo.com/video/76979871", "https://player.vimeo.com/video/76979871?dnt=1"],
  ])("%s", (url, embed) => expect(videoEmbedUrl(url)).toBe(embed));

  it.each([
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "javascript:alert(1)",
    "",
  ])("rejects %s", (url) => expect(videoEmbedUrl(url)).toBeNull());
});

const quiz: Quiz = {
  passMark: 50,
  questions: [
    {
      id: "q1",
      prompt: "One",
      kind: "single",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correct: ["a"],
    },
    {
      id: "q2",
      prompt: "Two",
      kind: "multiple",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      correct: ["a", "c"],
    },
  ],
};

describe("quizzes", () => {
  it("validates the answer key", () => {
    expect(quizSchema.safeParse(quiz).success).toBe(true);
    const twoForSingle = structuredClone(quiz);
    twoForSingle.questions[0]!.correct = ["a", "b"];
    expect(quizSchema.safeParse(twoForSingle).success).toBe(false);
    const unknown = structuredClone(quiz);
    unknown.questions[0]!.correct = ["z"];
    expect(quizSchema.safeParse(unknown).success).toBe(false);
  });

  it("grades all-or-nothing per question against the pass mark", () => {
    expect(gradeQuiz(quiz, { q1: ["a"], q2: ["c", "a"] })).toEqual({
      score: 100,
      passed: true,
      correctCount: 2,
      total: 2,
    });
    expect(gradeQuiz(quiz, { q1: ["a"], q2: ["a"] })).toMatchObject({ score: 50, passed: true });
    expect(gradeQuiz(quiz, { q1: ["b"], q2: ["a", "b", "c"] })).toMatchObject({
      score: 0,
      passed: false,
    });
  });

  it("never sends the answer key to learners", () => {
    expect(JSON.stringify(publicQuiz(quiz))).not.toContain("correct");
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("Intro to AI: Part 1!")).toBe("intro-to-ai-part-1");
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
    expect(slugify("!!!")).toBe("course");
  });

  it("escapes LIKE wildcards", () => {
    expect(likePattern("50%_a\\")).toBe("%50\\%\\_a\\\\%");
  });

  it("computes progress", () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(5, 4)).toBe(100);
  });

  it("swaps neighbours and refuses moves past the ends", () => {
    expect(__test.swapOrder(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(__test.swapOrder(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(__test.swapOrder(["a", "b"], "a", "up")).toBeNull();
    expect(__test.swapOrder(["a", "b"], "b", "down")).toBeNull();
  });
});
