"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Banner, Button, Checkbox, CheckboxGroup, Radio, RadioGroup } from "@/design-system";
import type { PublicQuiz } from "@/modules/courses";
import { useActionErrorMessage } from "../../../../../../_components/action-form";
import type { submitQuizAction } from "../../actions";

type Result = { score: number; passed: boolean; courseCompleted: boolean };

/** A quiz without its answer key; the server grades the submitted option ids. */
export function QuizForm({
  courseId,
  lessonId,
  quiz,
  action,
}: {
  courseId: string;
  lessonId: string;
  quiz: PublicQuiz;
  action: typeof submitQuizAction;
}) {
  const t = useTranslations("lms.quiz");
  const router = useRouter();
  const message = useActionErrorMessage();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await action({ courseId, lessonId, answers });
      if (!res.ok) {
        setError(message(res));
        return;
      }
      setResult(res.data);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} aria-busy={pending} className="flex flex-col gap-6">
      <p className="text-subheadline text-label-secondary">
        {t("passMark", { value: quiz.passMark })}
      </p>
      <ol className="flex flex-col gap-6">
        {quiz.questions.map((q, i) => (
          <li key={q.id} className="rounded-card bg-bg-secondary p-4">
            {q.kind === "single" ? (
              <RadioGroup
                label={`${i + 1}. ${q.prompt}`}
                description={t("chooseOne")}
                value={answers[q.id]?.[0] ?? null}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: [v] }))}
                isDisabled={pending}
              >
                {q.options.map((o) => (
                  <Radio key={o.id} value={o.id}>
                    {o.text}
                  </Radio>
                ))}
              </RadioGroup>
            ) : (
              <CheckboxGroup
                label={`${i + 1}. ${q.prompt}`}
                description={t("chooseMany")}
                value={answers[q.id] ?? []}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                isDisabled={pending}
              >
                {q.options.map((o) => (
                  <Checkbox key={o.id} value={o.id}>
                    {o.text}
                  </Checkbox>
                ))}
              </CheckboxGroup>
            )}
          </li>
        ))}
      </ol>
      {error && <Banner tone="danger" title={error} />}
      {result && (
        <Banner
          tone={result.passed ? "success" : "warning"}
          title={`${t("result", { score: result.score })} ${result.passed ? t("passed") : ""}`.trim()}
        >
          {!result.passed && t("failed")}
        </Banner>
      )}
      <Button type="submit" size="large" isDisabled={pending} className="self-start">
        {result && !result.passed ? t("retry") : t("submit")}
      </Button>
    </form>
  );
}
