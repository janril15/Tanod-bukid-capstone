<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

require_method('GET');

const CLIMATE_LOCATION = 'Sta. Maria, Bulacan, Philippines';
const CLIMATE_TIMEZONE = 'Asia/Manila';
const CLIMATE_REFRESH_INTERVAL = 600;
const CLIMATE_HISTORY_INTERVAL = 1800;
const CLIMATE_LATITUDE_DEFAULT = 14.797891;
const CLIMATE_LONGITUDE_DEFAULT = 120.921790;
const PAGASA_WARNINGS_URL = 'https://www.pagasa.dost.gov.ph/weather';

function climate_location_name(): string
{
    return trim(getenv('TANODBUKID_CLIMATE_LOCATION') ?: CLIMATE_LOCATION);
}

function climate_setting_number(string $name, float $default, float $minimum, float $maximum, bool $integer = false): float
{
    $configured = getenv($name);
    if ($configured === false || trim($configured) === '') {
        return $default;
    }
    if (!is_numeric($configured) || !is_finite((float) $configured)) {
        json_response(['success' => false, 'message' => "Climate configuration {$name} must be numeric."], 500);
    }
    $value = (float) $configured;
    if ($value < $minimum || $value > $maximum || ($integer && floor($value) !== $value)) {
        json_response(['success' => false, 'message' => "Climate configuration {$name} is outside its allowed range."], 500);
    }
    return $value;
}

function climate_refresh_interval_seconds(): int
{
    return (int) climate_setting_number('TANODBUKID_CLIMATE_REFRESH_SECONDS', CLIMATE_REFRESH_INTERVAL, 60, 3600, true);
}

function climate_risk_thresholds(): array
{
    $thresholds = [
        'high_probability_percent' => (int) climate_setting_number('TANODBUKID_CLIMATE_HIGH_RAIN_PROBABILITY', 70, 1, 100, true),
        'moderate_probability_percent' => (int) climate_setting_number('TANODBUKID_CLIMATE_MODERATE_RAIN_PROBABILITY', 40, 1, 100, true),
        'high_precipitation_mm' => climate_setting_number('TANODBUKID_CLIMATE_HIGH_RAIN_MM', 20, 0.1, 1000),
        'moderate_precipitation_mm' => climate_setting_number('TANODBUKID_CLIMATE_MODERATE_RAIN_MM', 5, 0.1, 1000),
    ];
    if ($thresholds['high_probability_percent'] < $thresholds['moderate_probability_percent']
        || $thresholds['high_precipitation_mm'] < $thresholds['moderate_precipitation_mm']
    ) {
        json_response(['success' => false, 'message' => 'High rainfall thresholds must be at least as strict as moderate thresholds.'], 500);
    }
    return $thresholds;
}

function climate_datetime(string $value): string
{
    try {
        return (new DateTimeImmutable($value, new DateTimeZone(CLIMATE_TIMEZONE)))->format('Y-m-d H:i:s');
    } catch (Throwable $error) {
        throw new UnexpectedValueException('Open-Meteo returned an invalid local date or time.', 0, $error);
    }
}

function climate_finite_number(mixed $value, string $field, ?float $minimum = null, ?float $maximum = null): ?float
{
    if ($value === null) {
        return null;
    }
    if (!is_numeric($value) || !is_finite((float) $value)) {
        throw new UnexpectedValueException("Open-Meteo returned an invalid {$field} value.");
    }

    $number = (float) $value;
    if (($minimum !== null && $number < $minimum) || ($maximum !== null && $number > $maximum)) {
        throw new UnexpectedValueException("Open-Meteo returned an out-of-range {$field} value.");
    }
    return $number;
}

function climate_fetch_open_meteo(float $latitude, float $longitude): array
{
    $query = http_build_query([
        'latitude' => $latitude,
        'longitude' => $longitude,
        'current' => implode(',', [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'precipitation',
            'rain',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
        ]),
        'hourly' => implode(',', [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation_probability',
            'precipitation',
            'wind_speed_10m',
            'weather_code',
        ]),
        'daily' => implode(',', [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_probability_max',
            'precipitation_sum',
        ]),
        'forecast_days' => 7,
        'timezone' => CLIMATE_TIMEZONE,
    ], '', '&', PHP_QUERY_RFC3986);
    $url = 'https://api.open-meteo.com/v1/forecast?' . $query;

    $curl = curl_init($url);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize the weather provider request.');
    }
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_USERAGENT => 'TanodBukid/1.0 weather dashboard',
    ]);
    $responseBody = curl_exec($curl);
    $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if (!is_string($responseBody) || $httpStatus < 200 || $httpStatus >= 300) {
        error_log('TanodBukid Open-Meteo request failed: HTTP ' . $httpStatus . ($curlError !== '' ? ' ' . $curlError : ''));
        throw new RuntimeException('Weather provider is temporarily unavailable.');
    }

    try {
        $payload = json_decode($responseBody, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        error_log('TanodBukid Open-Meteo response was invalid JSON: ' . $error->getMessage());
        throw new RuntimeException('Weather provider returned an invalid response.', 0, $error);
    }
    if (!is_array($payload)
        || ($payload['timezone'] ?? null) !== CLIMATE_TIMEZONE
        || !is_array($payload['current'] ?? null)
        || !is_array($payload['hourly'] ?? null)
        || !is_array($payload['daily'] ?? null)
    ) {
        throw new UnexpectedValueException('Weather provider response is missing required weather data.');
    }

    $current = $payload['current'];
    foreach (['time', 'temperature_2m', 'weather_code'] as $required) {
        if (!array_key_exists($required, $current)) {
            throw new UnexpectedValueException('Weather provider response is missing current weather measurements.');
        }
    }
    $hourly = $payload['hourly'];
    $daily = $payload['daily'];
    foreach (['time', 'temperature_2m', 'relative_humidity_2m', 'precipitation_probability', 'precipitation', 'wind_speed_10m', 'weather_code'] as $required) {
        if (!is_array($hourly[$required] ?? null)) {
            throw new UnexpectedValueException('Weather provider response is missing hourly forecast measurements.');
        }
    }
    foreach (['time', 'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'precipitation_sum'] as $required) {
        if (!is_array($daily[$required] ?? null)) {
            throw new UnexpectedValueException('Weather provider response is missing daily forecast measurements.');
        }
    }
    if (count($daily['time']) < 7) {
        throw new UnexpectedValueException('Weather provider returned fewer than seven daily forecast records.');
    }

    return $payload;
}

function climate_upsert(PDO $pdo, array $payload, float $latitude, float $longitude): void
{
    $current = $payload['current'];
    $hourly = $payload['hourly'];
    $daily = $payload['daily'];
    $fetchedAt = (new DateTimeImmutable('now', new DateTimeZone(CLIMATE_TIMEZONE)))->format('Y-m-d H:i:s');
    $currentTime = climate_datetime((string) $current['time']);
    $currentTimePoint = new DateTimeImmutable((string) $current['time'], new DateTimeZone(CLIMATE_TIMEZONE));
    $currentHourIndex = null;
    $smallestTimeDifference = PHP_INT_MAX;
    foreach ($hourly['time'] as $index => $hour) {
        try {
            $hourTimePoint = new DateTimeImmutable((string) $hour, new DateTimeZone(CLIMATE_TIMEZONE));
        } catch (Throwable $error) {
            throw new UnexpectedValueException('Open-Meteo returned an invalid hourly forecast timestamp.', 0, $error);
        }
        $timeDifference = abs($hourTimePoint->getTimestamp() - $currentTimePoint->getTimestamp());
        if ($timeDifference < $smallestTimeDifference) {
            $smallestTimeDifference = $timeDifference;
            $currentHourIndex = $index;
        }
    }
    if ($smallestTimeDifference > 1800) {
        $currentHourIndex = null;
    }
    $currentRainProbability = $currentHourIndex !== null
        ? climate_finite_number($hourly['precipitation_probability'][$currentHourIndex] ?? null, 'rain probability', 0, 100)
        : null;
    $currentWeatherCode = climate_finite_number($current['weather_code'], 'weather code', 0, 99);
    if ($currentWeatherCode === null || floor($currentWeatherCode) !== $currentWeatherCode) {
        throw new UnexpectedValueException('Open-Meteo returned an invalid current weather code.');
    }

    $pdo->beginTransaction();
    try {
        $currentStatement = $pdo->prepare(
            'INSERT INTO weather_current
                (location_name, latitude, longitude, temperature, apparent_temperature, relative_humidity,
                 precipitation, rain_probability, wind_speed, wind_direction, weather_code, observed_at, fetched_at)
             VALUES
                (:location_name, :latitude, :longitude, :temperature, :apparent_temperature, :relative_humidity,
                 :precipitation, :rain_probability, :wind_speed, :wind_direction, :weather_code, :observed_at, :fetched_at)
             ON DUPLICATE KEY UPDATE
                latitude = VALUES(latitude), longitude = VALUES(longitude), temperature = VALUES(temperature),
                apparent_temperature = VALUES(apparent_temperature), relative_humidity = VALUES(relative_humidity),
                precipitation = VALUES(precipitation), rain_probability = VALUES(rain_probability),
                wind_speed = VALUES(wind_speed), wind_direction = VALUES(wind_direction),
                weather_code = VALUES(weather_code), observed_at = VALUES(observed_at), fetched_at = VALUES(fetched_at)'
        );
        $currentStatement->execute([
            'location_name' => climate_location_name(),
            'latitude' => $latitude,
            'longitude' => $longitude,
            'temperature' => climate_finite_number($current['temperature_2m'], 'temperature', -100, 70),
            'apparent_temperature' => climate_finite_number($current['apparent_temperature'] ?? null, 'apparent temperature', -100, 80),
            'relative_humidity' => climate_finite_number($current['relative_humidity_2m'] ?? null, 'relative humidity', 0, 100),
            'precipitation' => climate_finite_number($current['precipitation'] ?? null, 'precipitation', 0, 1000),
            'rain_probability' => $currentRainProbability,
            'wind_speed' => climate_finite_number($current['wind_speed_10m'] ?? null, 'wind speed', 0, 500),
            'wind_direction' => climate_finite_number($current['wind_direction_10m'] ?? null, 'wind direction', 0, 360),
            'weather_code' => (int) $currentWeatherCode,
            'observed_at' => $currentTime,
            'fetched_at' => $fetchedAt,
        ]);

        $forecastStatement = $pdo->prepare(
            'INSERT INTO weather_forecasts
                (location_name, forecast_kind, forecast_at, temperature, temperature_min, temperature_max,
                 relative_humidity, precipitation, precipitation_probability, wind_speed, weather_code, fetched_at)
             VALUES
                (:location_name, :forecast_kind, :forecast_at, :temperature, :temperature_min, :temperature_max,
                 :relative_humidity, :precipitation, :precipitation_probability, :wind_speed, :weather_code, :fetched_at)
             ON DUPLICATE KEY UPDATE
                temperature = VALUES(temperature), temperature_min = VALUES(temperature_min),
                temperature_max = VALUES(temperature_max), relative_humidity = VALUES(relative_humidity),
                precipitation = VALUES(precipitation), precipitation_probability = VALUES(precipitation_probability),
                wind_speed = VALUES(wind_speed), weather_code = VALUES(weather_code), fetched_at = VALUES(fetched_at)'
        );

        $hourCount = count($hourly['time']);
        for ($index = 0; $index < $hourCount; $index++) {
            $forecastTime = (string) ($hourly['time'][$index] ?? '');
            if ($forecastTime === '') {
                throw new UnexpectedValueException('Open-Meteo returned an invalid hourly forecast timestamp.');
            }
            $forecastStatement->execute([
                'location_name' => climate_location_name(),
                'forecast_kind' => 'hourly',
                'forecast_at' => climate_datetime($forecastTime),
                'temperature' => climate_finite_number($hourly['temperature_2m'][$index] ?? null, 'hourly temperature', -100, 70),
                'temperature_min' => null,
                'temperature_max' => null,
                'relative_humidity' => climate_finite_number($hourly['relative_humidity_2m'][$index] ?? null, 'hourly relative humidity', 0, 100),
                'precipitation' => climate_finite_number($hourly['precipitation'][$index] ?? null, 'hourly precipitation', 0, 1000),
                'precipitation_probability' => climate_finite_number($hourly['precipitation_probability'][$index] ?? null, 'hourly rain probability', 0, 100),
                'wind_speed' => climate_finite_number($hourly['wind_speed_10m'][$index] ?? null, 'hourly wind speed', 0, 500),
                'weather_code' => climate_finite_number($hourly['weather_code'][$index] ?? null, 'hourly weather code', 0, 99),
                'fetched_at' => $fetchedAt,
            ]);
        }

        for ($index = 0; $index < count($daily['time']); $index++) {
            $forecastDate = (string) ($daily['time'][$index] ?? '');
            if ($forecastDate === '') {
                throw new UnexpectedValueException('Open-Meteo returned an invalid daily forecast date.');
            }
            $forecastStatement->execute([
                'location_name' => climate_location_name(),
                'forecast_kind' => 'daily',
                'forecast_at' => climate_datetime($forecastDate . 'T12:00'),
                'temperature' => null,
                'temperature_min' => climate_finite_number($daily['temperature_2m_min'][$index] ?? null, 'daily minimum temperature', -100, 70),
                'temperature_max' => climate_finite_number($daily['temperature_2m_max'][$index] ?? null, 'daily maximum temperature', -100, 70),
                'relative_humidity' => null,
                'precipitation' => climate_finite_number($daily['precipitation_sum'][$index] ?? null, 'daily precipitation', 0, 1000),
                'precipitation_probability' => climate_finite_number($daily['precipitation_probability_max'][$index] ?? null, 'daily rain probability', 0, 100),
                'wind_speed' => null,
                'weather_code' => climate_finite_number($daily['weather_code'][$index] ?? null, 'daily weather code', 0, 99),
                'fetched_at' => $fetchedAt,
            ]);
        }

        $historyStatement = $pdo->prepare(
            'INSERT IGNORE INTO weather_history
                (location_name, temperature, apparent_temperature, relative_humidity, precipitation,
                 wind_speed, wind_direction, weather_code, observed_at, fetched_at)
             SELECT :location_name, :temperature, :apparent_temperature, :relative_humidity, :precipitation,
                    :wind_speed, :wind_direction, :weather_code, :observed_at, :fetched_at
             WHERE NOT EXISTS (
                SELECT 1 FROM weather_history
                WHERE location_name = :history_location
                  AND fetched_at >= DATE_SUB(:history_cutoff, INTERVAL ' . CLIMATE_HISTORY_INTERVAL . ' SECOND)
             )'
        );
        $historyStatement->execute([
            'location_name' => climate_location_name(),
            'temperature' => climate_finite_number($current['temperature_2m'], 'temperature', -100, 70),
            'apparent_temperature' => climate_finite_number($current['apparent_temperature'] ?? null, 'apparent temperature', -100, 80),
            'relative_humidity' => climate_finite_number($current['relative_humidity_2m'] ?? null, 'relative humidity', 0, 100),
            'precipitation' => climate_finite_number($current['precipitation'] ?? null, 'precipitation', 0, 1000),
            'wind_speed' => climate_finite_number($current['wind_speed_10m'] ?? null, 'wind speed', 0, 500),
            'wind_direction' => climate_finite_number($current['wind_direction_10m'] ?? null, 'wind direction', 0, 360),
            'weather_code' => (int) $currentWeatherCode,
            'observed_at' => $currentTime,
            'fetched_at' => $fetchedAt,
            'history_location' => climate_location_name(),
            'history_cutoff' => $fetchedAt,
        ]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

function climate_load_database(PDO $pdo): array
{
    $currentStatement = $pdo->prepare('SELECT * FROM weather_current WHERE location_name = :location_name LIMIT 1');
    $currentStatement->execute(['location_name' => climate_location_name()]);
    $current = $currentStatement->fetch();
    if ($current !== false) {
        foreach (['temperature', 'apparent_temperature', 'precipitation', 'rain_probability', 'wind_speed'] as $numericField) {
            if ($current[$numericField] !== null) {
                $current[$numericField] = (float) $current[$numericField];
            }
        }
        foreach (['relative_humidity', 'wind_direction', 'weather_code'] as $integerField) {
            if ($current[$integerField] !== null) {
                $current[$integerField] = (int) $current[$integerField];
            }
        }
    }

    $localNow = new DateTimeImmutable('now', new DateTimeZone(CLIMATE_TIMEZONE));
    $now = $localNow->format('Y-m-d H:i:s');
    $today = $localNow->setTime(0, 0)->format('Y-m-d H:i:s');
    $until = $localNow->setTime(0, 0)->modify('+7 days')->format('Y-m-d H:i:s');
    $forecastStatement = $pdo->prepare(
        'SELECT forecast_kind, forecast_at, temperature, temperature_min, temperature_max, relative_humidity,
                precipitation, precipitation_probability, wind_speed, weather_code
         FROM weather_forecasts
         WHERE location_name = :location_name AND forecast_at < :until
           AND ((forecast_kind = :hourly_kind AND forecast_at >= :now)
             OR (forecast_kind = :daily_kind AND forecast_at >= :today))
         ORDER BY forecast_at ASC'
    );
    $forecastStatement->execute([
        'location_name' => climate_location_name(),
        'until' => $until,
        'hourly_kind' => 'hourly',
        'now' => $now,
        'daily_kind' => 'daily',
        'today' => $today,
    ]);
    $hourly = [];
    $daily = [];
    foreach ($forecastStatement->fetchAll() as $row) {
        foreach (['temperature', 'temperature_min', 'temperature_max', 'precipitation', 'precipitation_probability', 'wind_speed'] as $numericField) {
            if ($row[$numericField] !== null) {
                $row[$numericField] = (float) $row[$numericField];
            }
        }
        foreach (['relative_humidity', 'weather_code'] as $integerField) {
            if ($row[$integerField] !== null) {
                $row[$integerField] = (int) $row[$integerField];
            }
        }
        if ($row['forecast_kind'] === 'hourly') {
            $hourly[] = $row;
        } else {
            $daily[] = $row;
        }
    }

    $alertsStatement = $pdo->prepare(
        'SELECT id, title, description, severity, source, location, valid_from, valid_until
         FROM climate_alerts
         WHERE location = :location AND status = :status
           AND valid_from <= :now AND (valid_until IS NULL OR valid_until >= :valid_now)
         ORDER BY FIELD(severity, :severe, :watch, :advisory), valid_from DESC'
    );
    $alertsStatement->execute([
        'location' => climate_location_name(),
        'status' => 'active',
        'now' => $now,
        'valid_now' => $now,
        'severe' => 'severe',
        'watch' => 'watch',
        'advisory' => 'advisory',
    ]);

    return [
        'location' => ['name' => climate_location_name(), 'latitude' => (float) (getenv('TANODBUKID_CLIMATE_LATITUDE') ?: CLIMATE_LATITUDE_DEFAULT), 'longitude' => (float) (getenv('TANODBUKID_CLIMATE_LONGITUDE') ?: CLIMATE_LONGITUDE_DEFAULT), 'timezone' => CLIMATE_TIMEZONE],
        'current' => $current === false ? null : $current,
        'hourly' => $hourly,
        'daily' => $daily,
        'alerts' => $alertsStatement->fetchAll(),
        'official_alerts' => ['available' => false, 'source_name' => 'PAGASA', 'source_url' => PAGASA_WARNINGS_URL],
    ];
}

$location = climate_location_name();
$latitude = filter_var(getenv('TANODBUKID_CLIMATE_LATITUDE') ?: (string) CLIMATE_LATITUDE_DEFAULT, FILTER_VALIDATE_FLOAT);
$longitude = filter_var(getenv('TANODBUKID_CLIMATE_LONGITUDE') ?: (string) CLIMATE_LONGITUDE_DEFAULT, FILTER_VALIDATE_FLOAT);
if ($location === '' || mb_strlen($location, 'UTF-8') > 150 || $latitude === false || $longitude === false || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    json_response(['success' => false, 'message' => 'Climate location configuration is invalid.'], 500);
}
$refreshInterval = climate_refresh_interval_seconds();
$riskThresholds = climate_risk_thresholds();

try {
    $pdo = pdo_connection();
    $currentStatement = $pdo->prepare('SELECT fetched_at FROM weather_current WHERE location_name = :location_name LIMIT 1');
    $currentStatement->execute(['location_name' => climate_location_name()]);
    $lastFetched = $currentStatement->fetchColumn();
    $lastFetchTimestamp = is_string($lastFetched)
        ? (new DateTimeImmutable($lastFetched, new DateTimeZone(CLIMATE_TIMEZONE)))->getTimestamp()
        : false;
    $refreshDue = $lastFetchTimestamp === false || time() - $lastFetchTimestamp >= $refreshInterval;
    $refreshError = null;
    $refreshed = false;
    if ($refreshDue) {
        try {
            $payload = climate_fetch_open_meteo((float) $latitude, (float) $longitude);
            climate_upsert($pdo, $payload, (float) $latitude, (float) $longitude);
            $refreshed = true;
        } catch (Throwable $error) {
            error_log('TanodBukid climate refresh failed: ' . $error->getMessage());
            $refreshError = 'Live weather refresh failed. Showing the latest saved snapshot, if available.';
        }
    }

    $result = climate_load_database($pdo);
    if ($result['current'] === null) {
        json_response([
            'success' => false,
            'message' => $refreshError ?? 'No saved weather data is available yet. Check the PHP internet connection and try again.',
            'official_alerts' => $result['official_alerts'],
        ], 503);
    }

    $currentFetchedAt = (new DateTimeImmutable((string) $result['current']['fetched_at'], new DateTimeZone(CLIMATE_TIMEZONE)))->getTimestamp();
    $ageSeconds = $currentFetchedAt === false ? null : max(0, time() - $currentFetchedAt);
    json_response([
        'success' => true,
        ...$result,
        'risk_thresholds' => $riskThresholds,
        'provider' => 'Open-Meteo',
        'freshness' => [
            'fetched_at' => $result['current']['fetched_at'],
            'observed_at' => $result['current']['observed_at'],
            'age_seconds' => $ageSeconds,
            'stale' => $ageSeconds === null || $ageSeconds > $refreshInterval,
            'refreshed' => $refreshed,
            'refresh_error' => $refreshError,
            'refresh_interval_seconds' => $refreshInterval,
        ],
    ]);
} catch (PDOException $error) {
    error_log('TanodBukid climate database request failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'Unable to read or save climate data. Confirm that the climate database migration has been imported.'], 503);
} catch (Throwable $error) {
    error_log('TanodBukid climate request failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'Unable to load climate data right now. Please try again.'], 503);
}
