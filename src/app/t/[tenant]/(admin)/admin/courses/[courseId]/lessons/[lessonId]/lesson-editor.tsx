"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Banner, Button, Checkbox, Icon, Switch, TextArea, TextField } from "@/design-system";
import type { Quiz } from "@/modules/courses";
import { ActionForm } from "../../../../../../../../_components/action-form";
import type { removeLessonAction, updateLessonAction } from "../../../actions";

type Question = Quiz["questions"][number];

let seq = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

function blankQuestion(): Question {
  return {
    id: newId("q"),
    prompt: "",
    kind: "single",
    options: [
      { id: newId("o"), text: "" },
      { id: newId("o"), text: "" },
    ],
    correct: [],
  };
}

function quizIsComplete(questions: Question[]): boolean {
  return (
    questions.length > 0 &&
    questions.every(
      (q) =>
        q.prompt.trim() !== "" &&
        q.options.length >= 2 &&
        q.options.every((o) => o.text.trim() !== "") &&
        q.correct.length >= 1 &&
        (q.kind === "multiple" || q.correct.length === 1),
    )
  );
}

function QuizBuilder({ initial }: { initial: Quiz | null }) {
  const t = useTranslations("lms.authoring.lesson");
  const [passMark, setPassMark] = useState(String(initial?.passMark ?? 70));
  const [questions, setQuestions] = useState<Question[]>(initial?.questions ?? [blankQuestion()]);

  const update = (i: number, change: (q: Question) => Question) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? change(q) : q)));

  const value = JSON.stringify({ passMark: Number(passMark), questions });
  const complete = quizIsComplete(questions);

  return (
    <section aria-labelledby="quiz-heading" className="flex flex-col gap-4">
      <h2 id="quiz-heading" className="text-title3">
        {t("quiz")}
      </h2>
      <input type="hidden" name="quiz" value={value} />
      <TextField
        label={t("passMark")}
        type="number"
        inputMode="numeric"
        value={passMark}
        onChange={setPassMark}
        className="max-w-48"
      />
      {!complete && <Banner tone="warning" title={t("quizInvalid")} />}
      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <li key={q.id} className="flex flex-col gap-3 rounded-card bg-bg-secondary p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-headline">{t("question", { n: i + 1 })}</h3>
              <Button
                size="small"
                variant="gray"
                destructive
                aria-label={t("removeQuestion", { n: i + 1 })}
                isDisabled={questions.length === 1}
                onPress={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
              >
                <Icon icon={Trash2} size={16} />
              </Button>
            </div>
            <TextArea
              label={t("prompt")}
              value={q.prompt}
              onChange={(prompt) => update(i, (x) => ({ ...x, prompt }))}
              rows={2}
              maxLength={500}
            />
            <Switch
              isSelected={q.kind === "multiple"}
              onChange={(multiple) =>
                update(i, (x) => ({
                  ...x,
                  kind: multiple ? "multiple" : "single",
                  correct: multiple ? x.correct : x.correct.slice(0, 1),
                }))
              }
            >
              {t("multiple")}
            </Switch>
            <ul className="flex flex-col gap-2">
              {q.options.map((o, k) => (
                <li key={o.id} className="flex flex-wrap items-end gap-2">
                  <TextField
                    label={t("option", { n: k + 1 })}
                    value={o.text}
                    onChange={(text) =>
                      update(i, (x) => ({
                        ...x,
                        options: x.options.map((y) => (y.id === o.id ? { ...y, text } : y)),
                      }))
                    }
                    maxLength={300}
                    className="min-w-0 flex-1"
                  />
                  <Checkbox
                    isSelected={q.correct.includes(o.id)}
                    onChange={(on) =>
                      update(i, (x) => ({
                        ...x,
                        correct: on
                          ? x.kind === "single"
                            ? [o.id]
                            : [...x.correct, o.id]
                          : x.correct.filter((c) => c !== o.id),
                      }))
                    }
                    className="min-h-touch"
                  >
                    {t("correct")}
                  </Checkbox>
                  <Button
                    size="small"
                    variant="gray"
                    aria-label={t("removeOption", { n: k + 1 })}
                    isDisabled={q.options.length <= 2}
                    onPress={() =>
                      update(i, (x) => ({
                        ...x,
                        options: x.options.filter((y) => y.id !== o.id),
                        correct: x.correct.filter((c) => c !== o.id),
                      }))
                    }
                  >
                    <Icon icon={Trash2} size={16} />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="plain"
              size="small"
              isDisabled={q.options.length >= 10}
              onPress={() =>
                update(i, (x) => ({ ...x, options: [...x.options, { id: newId("o"), text: "" }] }))
              }
              className="self-start"
            >
              <Icon icon={Plus} size={16} />
              {t("addOption")}
            </Button>
          </li>
        ))}
      </ol>
      <Button
        variant="tinted"
        isDisabled={questions.length >= 50}
        onPress={() => setQuestions((qs) => [...qs, blankQuestion()])}
        className="self-start"
      >
        <Icon icon={Plus} size={16} />
        {t("addQuestion")}
      </Button>
    </section>
  );
}

export function LessonEditor({
  courseId,
  lesson,
  updateAction,
  removeAction,
}: {
  courseId: string;
  lesson: {
    id: string;
    title: string;
    kind: "content" | "quiz";
    body: string;
    videoUrl: string | null;
    pdfUrl: string | null;
    quiz: Quiz | null;
  };
  updateAction: typeof updateLessonAction;
  removeAction: typeof removeLessonAction;
}) {
  const t = useTranslations("lms");
  const ids = { courseId, lessonId: lesson.id };
  return (
    <div className="flex flex-col gap-6">
      <ActionForm action={updateAction} successMessage={t("common.saved")}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="kind" value={lesson.kind} />
        <TextField
          name="title"
          label={t("authoring.lessonTitle")}
          defaultValue={lesson.title}
          isRequired
          maxLength={160}
        />
        <TextArea
          name="body"
          label={t("authoring.lesson.body")}
          description={t("authoring.lesson.bodyHelp")}
          defaultValue={lesson.body}
          rows={lesson.kind === "quiz" ? 4 : 12}
          maxLength={50000}
        />
        {lesson.kind === "content" ? (
          <>
            <TextField
              name="videoUrl"
              type="url"
              label={t("authoring.lesson.videoUrl")}
              description={t("authoring.lesson.videoUrlHelp")}
              defaultValue={lesson.videoUrl ?? ""}
              maxLength={500}
            />
            <TextField
              name="pdfUrl"
              type="url"
              label={t("authoring.lesson.pdfUrl")}
              description={t("authoring.lesson.pdfUrlHelp")}
              defaultValue={lesson.pdfUrl ?? ""}
              maxLength={500}
            />
          </>
        ) : (
          <QuizBuilder initial={lesson.quiz} />
        )}
        <Button type="submit" className="self-start">
          {t("common.save")}
        </Button>
      </ActionForm>
      <ActionForm
        action={removeAction}
        confirm={t("authoring.lesson.removeConfirm")}
        redirectTo={`/admin/courses/${courseId}`}
      >
        {Object.entries(ids).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <Button type="submit" variant="gray" destructive className="self-start">
          {t("authoring.lesson.remove")}
        </Button>
      </ActionForm>
    </div>
  );
}
