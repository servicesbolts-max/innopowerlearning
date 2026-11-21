import { createAuthFixtures, removeAuthFixtures } from "./auth-fixtures";

/** Creates the auth test data and hands it to the workers through the environment. */
export default async function globalSetup() {
  const fixtures = await createAuthFixtures();
  process.env.E2E_AUTH_FIXTURES = JSON.stringify(fixtures);
  return async () => {
    await removeAuthFixtures(fixtures);
  };
}
