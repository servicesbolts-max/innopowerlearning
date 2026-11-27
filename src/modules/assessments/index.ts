// Public API of the assessments module. Other modules import only from this file.
export {
  attemptSummary,
  countAttempts,
  QUIZ_MAX_ATTEMPTS,
  recordAttempt,
  type AttemptSummary,
} from "./quiz";
