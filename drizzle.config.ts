/// <reference types="node" />

import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    driver: "d1-http",
    dbCredentials: {
        // Database ID from wrangler.toml [[d1_databases]]
        databaseId: "a2b03b75-e470-480a-acd4-89bad0b42794",
        // Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_D1_TOKEN in your environment
        // or .env file before running drizzle-kit migrate / generate.
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,
    },
});
