import { defineConfig } from "drizzle-kit";

const env = (
    globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
    }
).process?.env ?? {};

const cloudflareAccountId = env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareDatabaseId = env.CLOUDFLARE_D1_DATABASE_ID;
const cloudflareApiToken = env.CLOUDFLARE_API_TOKEN;

const useCloudflareD1 = Boolean(
    cloudflareAccountId && cloudflareDatabaseId && cloudflareApiToken,
);

export default defineConfig(
    useCloudflareD1
        ? {
            schema: "./src/db/schema.ts",
            out: "./drizzle",
            dialect: "sqlite",
            driver: "d1-http",
            dbCredentials: {
                accountId: cloudflareAccountId!,
                databaseId: cloudflareDatabaseId!,
                token: cloudflareApiToken!,
            },
        }
        : {
            schema: "./src/db/schema.ts",
            out: "./drizzle",
            dialect: "sqlite",
            dbCredentials: {
                url: "./data/stats.db",
            },
        },
);
