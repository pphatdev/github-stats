CREATE TABLE `stats_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_stats_request_url` ON `stats_requests` (`url`);
--> statement-breakpoint