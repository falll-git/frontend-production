import { pathToFileURL } from "node:url";

export function validateE2eCredentials(env = process.env) {
  const username = String(env.E2E_USERNAME || "").trim();
  const password = String(env.E2E_PASSWORD || "");

  if (!username || !password) {
    throw new Error(
      "E2E_USERNAME dan E2E_PASSWORD wajib diisi; authenticated test tidak boleh di-skip.",
    );
  }

  return { usernamePresent: true, passwordPresent: true };
}

const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  try {
    const result = validateE2eCredentials();
    process.stdout.write(
      `${JSON.stringify({ status: "passed", ...result })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Validasi credential E2E gagal."}\n`,
    );
    process.exitCode = 1;
  }
}
