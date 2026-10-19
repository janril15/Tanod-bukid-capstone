CREATE TABLE IF NOT EXISTS `reports` (
  `id` CHAR(36) NOT NULL,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `author_name` VARCHAR(150) NOT NULL,
  `author_avatar_url` VARCHAR(255) NULL DEFAULT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('pest', 'flood', 'weather', 'tips') NOT NULL,
  `location` VARCHAR(200) NOT NULL,
  `image_url` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_category_created` (`category`, `created_at`),
  KEY `idx_reports_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
