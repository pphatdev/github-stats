CREATE TABLE IF NOT EXISTS `visitor_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`ip_hash` text NOT NULL,
	`visit_date` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uq_visitor_log` ON `visitor_logs` (`username`,`ip_hash`,`visit_date`);
