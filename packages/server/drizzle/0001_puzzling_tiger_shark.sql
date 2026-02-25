ALTER TABLE `media_links` ADD `sort_order` integer;--> statement-breakpoint
ALTER TABLE `media_links` ADD `caption` text;--> statement-breakpoint
ALTER TABLE `media_links` ADD `is_primary` integer DEFAULT false;--> statement-breakpoint
CREATE INDEX `idx_media_links_entity` ON `media_links` (`linked_entity_type`,`linked_entity_id`);