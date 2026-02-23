import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const visitors = sqliteTable("visitors", {
  username: text("username").primaryKey(),
  count: integer("count").notNull().default(0),
});
