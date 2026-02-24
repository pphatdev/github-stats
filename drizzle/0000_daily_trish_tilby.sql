CREATE TABLE IF NOT EXISTS `badges` (
	`username` text PRIMARY KEY NOT NULL,
	`visitors` integer DEFAULT 0 NOT NULL,
	`repositories` integer,
	`organization` integer,
	`languages` integer,
	`followers` integer,
	`total_stars` integer,
	`total_contributors` integer,
	`total_commits` integer,
	`total_code_reviews` integer,
	`total_issues` integer,
	`total_pull_requests` integer,
	`total_joined_years` integer,
	`updated_at` integer
);
