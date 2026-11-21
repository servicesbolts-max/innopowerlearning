-- 0006_user_name_optional: magic-link and OAuth sign-ups may arrive without a display name.
-- Forward-only: never edit after commit.
--
-- 0004 required 1-200 characters. Better Auth creates such users with an empty name; the app fills
-- in a default (the email's local part) in a user.create hook, and an empty name must not make the
-- sign-in fail with a constraint error.

ALTER TABLE users DROP CONSTRAINT users_name_check;
ALTER TABLE users ADD CONSTRAINT users_name_check CHECK (length(name) <= 200);
