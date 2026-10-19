-- Select tanodbukid_db in phpMyAdmin, open the Import tab, and import this file.
-- The existing PHP API reads MySQL credentials from TANODBUKID_DB_* variables.
-- This migration only creates the climate tables; it does not insert demo alerts or remove data.
-- Successful provider refreshes write a history snapshot at most once every 30 minutes.
-- Forecast rows are upserted by location, forecast type, and Philippine-local timestamp.
CREATE TABLE IF NOT EXISTS `weather_current` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_name` VARCHAR(150) NOT NULL,
  `latitude` DECIMAL(9,6) NOT NULL,
  `longitude` DECIMAL(9,6) NOT NULL,
  `temperature` DECIMAL(5,2) NOT NULL,
  `apparent_temperature` DECIMAL(5,2) NULL DEFAULT NULL,
  `relative_humidity` TINYINT UNSIGNED NULL DEFAULT NULL,
  `precipitation` DECIMAL(7,2) NULL DEFAULT NULL,
  `rain_probability` TINYINT UNSIGNED NULL DEFAULT NULL,
  `wind_speed` DECIMAL(6,2) NULL DEFAULT NULL,
  `wind_direction` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `weather_code` SMALLINT UNSIGNED NOT NULL,
  `observed_at` DATETIME NOT NULL,
  `fetched_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weather_current_location` (`location_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `weather_forecasts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_name` VARCHAR(150) NOT NULL,
  `forecast_kind` ENUM('hourly', 'daily') NOT NULL,
  `forecast_at` DATETIME NOT NULL,
  `temperature` DECIMAL(5,2) NULL DEFAULT NULL,
  `temperature_min` DECIMAL(5,2) NULL DEFAULT NULL,
  `temperature_max` DECIMAL(5,2) NULL DEFAULT NULL,
  `relative_humidity` TINYINT UNSIGNED NULL DEFAULT NULL,
  `precipitation` DECIMAL(7,2) NULL DEFAULT NULL,
  `precipitation_probability` TINYINT UNSIGNED NULL DEFAULT NULL,
  `wind_speed` DECIMAL(6,2) NULL DEFAULT NULL,
  `weather_code` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `fetched_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weather_forecasts_location_time` (`location_name`, `forecast_kind`, `forecast_at`),
  KEY `idx_weather_forecasts_time` (`location_name`, `forecast_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `weather_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_name` VARCHAR(150) NOT NULL,
  `temperature` DECIMAL(5,2) NOT NULL,
  `apparent_temperature` DECIMAL(5,2) NULL DEFAULT NULL,
  `relative_humidity` TINYINT UNSIGNED NULL DEFAULT NULL,
  `precipitation` DECIMAL(7,2) NULL DEFAULT NULL,
  `wind_speed` DECIMAL(6,2) NULL DEFAULT NULL,
  `wind_direction` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `weather_code` SMALLINT UNSIGNED NOT NULL,
  `observed_at` DATETIME NOT NULL,
  `fetched_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weather_history_snapshot` (`location_name`, `observed_at`),
  KEY `idx_weather_history_fetched` (`location_name`, `fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `climate_alerts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `severity` ENUM('advisory', 'watch', 'severe') NOT NULL,
  `source` VARCHAR(150) NOT NULL,
  `location` VARCHAR(150) NOT NULL,
  `valid_from` DATETIME NOT NULL,
  `valid_until` DATETIME NULL DEFAULT NULL,
  `status` ENUM('active', 'expired', 'withdrawn') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_climate_alerts_location_status_validity` (`location`, `status`, `valid_from`, `valid_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
