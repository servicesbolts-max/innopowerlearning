/** Loads .env into process.env for CLI scripts (Next.js loads it itself for the app). */
export function loadEnv(): void {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env file: rely on the real environment (CI, hosted platforms).
  }
}
