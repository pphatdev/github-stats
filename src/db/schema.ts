import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const visitorLogs = sqliteTable(
    "visitor_logs",
    {
        id:         integer("id").primaryKey({ autoIncrement: true }),
        username:   text("username").notNull(),
        ip_hash:    text("ip_hash").notNull(),
        visit_date: text("visit_date").notNull(), // YYYY-MM-DD
        created_at: integer("created_at"),
    },
    (table) => ({
        uqVisitorLog: uniqueIndex("uq_visitor_log").on(
            table.username,
            table.ip_hash,
            table.visit_date,
        ),
    }),
);

export const badges = sqliteTable("badges", {
  username: text("username").primaryKey(),
  visitors: integer("visitors").notNull().default(0),
  repositories: integer("repositories"),
  organization: integer("organization"),
  languages: integer("languages"),
  followers: integer("followers"),
  total_stars: integer("total_stars"),
  total_contributors: integer("total_contributors"),
  total_commits: integer("total_commits"),
  total_code_reviews: integer("total_code_reviews"),
  total_issues: integer("total_issues"),
  total_pull_requests: integer("total_pull_requests"),
  total_joined_years: integer("total_joined_years"),
  updated_at: integer("updated_at"),
});
