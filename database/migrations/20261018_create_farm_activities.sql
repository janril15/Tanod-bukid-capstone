CREATE TABLE IF NOT EXISTS `farm_activities` (
  `id` CHAR(36) NOT NULL,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `activity_type` ENUM('Crop Care', 'Livestock', 'Post-Harvest', 'Expense') NOT NULL,
  `activity_date` DATE NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `details` TEXT NOT NULL,
  `related_crop_animal` VARCHAR(200) NULL DEFAULT NULL,
  `cost` DECIMAL(12,2) NULL DEFAULT NULL,
  `legacy_key` CHAR(71) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_farm_activities_legacy_key` (`legacy_key`),
  KEY `idx_farm_activities_date` (`activity_date`, `created_at`),
  KEY `idx_farm_activities_user_date` (`user_id`, `activity_date`),
  CONSTRAINT `fk_farm_activities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
