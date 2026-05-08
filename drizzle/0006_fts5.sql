CREATE VIRTUAL TABLE `entity_search` USING fts5(
  entity_id UNINDEXED,
  plan_id   UNINDEXED,
  kind      UNINDEXED,
  content,
  tokenize = 'unicode61 remove_diacritics 1'
);
--> statement-breakpoint
CREATE TRIGGER `entity_search_plans_delete`
AFTER DELETE ON `plans`
BEGIN
  DELETE FROM `entity_search` WHERE plan_id = OLD.id;
END;
