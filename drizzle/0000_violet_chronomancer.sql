CREATE TABLE `appeals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nickname` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`decision` text
);
--> statement-breakpoint
CREATE INDEX `idx_appeals_created_at` ON `appeals` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_appeals_pending_user` ON `appeals` (`user_id`) WHERE "appeals"."status" = 'pending';