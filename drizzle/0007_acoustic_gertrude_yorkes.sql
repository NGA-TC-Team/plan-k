ALTER TABLE `chat_sessions` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `chat_sessions_visible_idx` ON `chat_sessions` (`plan_id`,`hidden`,`updated_at`);