CREATE TABLE `stats_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_stats_request_url` ON `stats_requests` (`url`);--> statement-breakpoint
CREATE TABLE `visitor_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`ip_hash` text NOT NULL,
	`visit_date` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_visitor_log` ON `visitor_logs` (`username`,`ip_hash`,`visit_date`);