<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($requestMethod, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    json_response(['success' => false, 'message' => 'Method not allowed.'], 405);
}

start_app_session();
$sessionUser = session_user();
if ($sessionUser === null) {
    json_response(['success' => false, 'message' => 'Authentication is required.'], 401);
}

$pdo = pdo_connection();
$allowedTypes = ['Crop Care', 'Livestock', 'Post-Harvest', 'Expense'];

function farm_activity_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function farm_activity_legacy_key(string $legacyId): string
{
    return 'legacy:' . hash('sha256', $legacyId);
}

function normalize_farm_activity(array $data, array $allowedTypes): array
{
    $type = trim(is_string($data['activity_type'] ?? $data['type'] ?? null) ? ($data['activity_type'] ?? $data['type']) : '');
    $date = trim(is_string($data['activity_date'] ?? $data['date'] ?? null) ? ($data['activity_date'] ?? $data['date']) : '');
    $title = trim(is_string($data['title'] ?? null) ? $data['title'] : '');
    $details = trim(is_string($data['details'] ?? null) ? $data['details'] : '');
    $related = trim(is_string($data['related_crop_animal'] ?? $data['related'] ?? null) ? ($data['related_crop_animal'] ?? $data['related']) : '');
    $costInput = trim(is_string($data['cost'] ?? null) || is_numeric($data['cost'] ?? null) ? (string) $data['cost'] : '');
    $normalizedCost = str_replace(['₱', ',', ' '], '', $costInput);
    $wholeCost = explode('.', $normalizedCost, 2)[0];

    $errors = [];
    if (!in_array($type, $allowedTypes, true)) {
        $errors['activity_type'] = 'Choose a valid activity type.';
    }
    $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if ($parsedDate === false || $parsedDate->format('Y-m-d') !== $date) {
        $errors['activity_date'] = 'Enter a valid activity date.';
    }
    if ($title === '' || mb_strlen($title, 'UTF-8') > 160) {
        $errors['title'] = 'Enter an activity title (up to 160 characters).';
    }
    if (mb_strlen($details, 'UTF-8') > 5000) {
        $errors['details'] = 'Activity details must be 5000 characters or fewer.';
    }
    if (mb_strlen($related, 'UTF-8') > 200) {
        $errors['related_crop_animal'] = 'Related crop or animal must be 200 characters or fewer.';
    }
    if ($costInput !== '' && (
        preg_match('/^₱?\s*(?:\d{1,3}(?:,\d{3})*|\d{1,10})(?:\.\d{1,2})?$/uD', $costInput) !== 1
        || strlen($wholeCost) > 10
    )) {
        $errors['cost'] = 'Enter a valid non-negative cost with up to two decimal places.';
    }

    if ($errors !== []) {
        json_response(['success' => false, 'message' => 'Please correct the activity details.', 'errors' => $errors], 422);
    }

    return [
        'activity_type' => $type,
        'activity_date' => $date,
        'title' => $title,
        'details' => $details,
        'related_crop_animal' => $related !== '' ? $related : null,
        'cost' => $costInput !== '' ? number_format((float) $normalizedCost, 2, '.', '') : null,
    ];
}

function farm_activity_response_row(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'user_id' => (int) $row['user_id'],
        'author_name' => (string) $row['author_name'],
        'activity_type' => (string) $row['activity_type'],
        'activity_date' => (string) $row['activity_date'],
        'title' => (string) $row['title'],
        'details' => (string) $row['details'],
        'related_crop_animal' => $row['related_crop_animal'] !== null ? (string) $row['related_crop_animal'] : '',
        'cost' => $row['cost'] !== null ? (string) $row['cost'] : '',
        'created_at' => (string) $row['created_at'],
        'updated_at' => (string) $row['updated_at'],
    ];
}

if ($requestMethod === 'GET') {
    $today = new DateTimeImmutable('today');
    $demoActivities = [
        [
            'id' => 'd6b2fa22-299c-4ae9-8ee5-b2b4e9f91a01',
            'legacy_key' => farm_activity_legacy_key('sample-fertilizer'),
            'activity_type' => 'Crop Care',
            'activity_date' => $today->modify('+7 days')->format('Y-m-d'),
            'title' => 'Applied fertilizer — Urea 46-0-0',
            'details' => 'Field A, 2.5 ha, 3 bags.',
        ],
        [
            'id' => 'd6b2fa22-299c-4ae9-8ee5-b2b4e9f91a02',
            'legacy_key' => farm_activity_legacy_key('sample-watering'),
            'activity_type' => 'Crop Care',
            'activity_date' => $today->modify('+2 days')->format('Y-m-d'),
            'title' => 'Watering — North Field',
            'details' => 'Scheduled irrigation for Palay.',
        ],
        [
            'id' => 'd6b2fa22-299c-4ae9-8ee5-b2b4e9f91a03',
            'legacy_key' => farm_activity_legacy_key('sample-vaccination'),
            'activity_type' => 'Livestock',
            'activity_date' => $today->modify('-3 days')->format('Y-m-d'),
            'title' => 'FMD vaccination — 5 heads cattle',
            'details' => 'DA-facilitated vaccination.',
        ],
    ];

    try {
        $seed = $pdo->prepare(
            'INSERT IGNORE INTO farm_activities
                (id, user_id, activity_type, activity_date, title, details, legacy_key)
             VALUES
                (:id, :user_id, :activity_type, :activity_date, :title, :details, :legacy_key)'
        );
        foreach ($demoActivities as $activity) {
            $seed->execute([
                'id' => $activity['id'],
                'user_id' => $sessionUser['id'],
                'activity_type' => $activity['activity_type'],
                'activity_date' => $activity['activity_date'],
                'title' => $activity['title'],
                'details' => $activity['details'],
                'legacy_key' => $activity['legacy_key'],
            ]);
        }

        $statement = $pdo->query(
            'SELECT a.id, a.user_id, u.full_name AS author_name, a.activity_type, a.activity_date,
                    a.title, a.details, a.related_crop_animal, a.cost, a.created_at, a.updated_at
             FROM farm_activities AS a
             INNER JOIN users AS u ON u.id = a.user_id
             ORDER BY a.activity_date DESC, a.created_at DESC, a.id DESC'
        );
        $activities = array_map('farm_activity_response_row', $statement->fetchAll());
    } catch (PDOException $error) {
        error_log('TanodBukid farm activities lookup failed: ' . $error->getMessage());
        json_response(['success' => false, 'message' => 'Unable to load farm activities. Check that the farm_activities database migration has been applied.'], 503);
    }

    json_response(['success' => true, 'activities' => $activities]);
}

$data = read_json_request();
if (($data['action'] ?? '') === 'import-legacy') {
    $legacyActivities = $data['activities'] ?? null;
    if (!is_array($legacyActivities) || count($legacyActivities) > 100) {
        json_response(['success' => false, 'message' => 'Legacy farm activity data is invalid.'], 422);
    }

    $normalizedActivities = [];
    foreach ($legacyActivities as $activity) {
        if (!is_array($activity) || !is_string($activity['id'] ?? null) || $activity['id'] === '') {
            json_response(['success' => false, 'message' => 'Legacy farm activity data is invalid.'], 422);
        }
        $normalizedActivities[] = [
            'legacy_key' => farm_activity_legacy_key($activity['id']),
            ...normalize_farm_activity($activity, $allowedTypes),
        ];
    }

    try {
        $pdo->beginTransaction();
        $insert = $pdo->prepare(
            'INSERT IGNORE INTO farm_activities
                (id, user_id, activity_type, activity_date, title, details, related_crop_animal, cost, legacy_key)
             VALUES
                (:id, :user_id, :activity_type, :activity_date, :title, :details, :related_crop_animal, :cost, :legacy_key)'
        );
        foreach ($normalizedActivities as $activity) {
            $insert->execute([
                'id' => farm_activity_uuid(),
                'user_id' => $sessionUser['id'],
                'activity_type' => $activity['activity_type'],
                'activity_date' => $activity['activity_date'],
                'title' => $activity['title'],
                'details' => $activity['details'],
                'related_crop_animal' => $activity['related_crop_animal'],
                'cost' => $activity['cost'],
                'legacy_key' => $activity['legacy_key'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('TanodBukid legacy farm activity import failed: ' . $error->getMessage());
        json_response(['success' => false, 'message' => 'Unable to preserve older farm activities. Please try again.'], 503);
    }

    json_response(['success' => true, 'message' => 'Older farm activities were preserved.']);
}

$activity = normalize_farm_activity($data, $allowedTypes);
try {
    $id = farm_activity_uuid();
    $statement = $pdo->prepare(
        'INSERT INTO farm_activities
            (id, user_id, activity_type, activity_date, title, details, related_crop_animal, cost)
         VALUES
            (:id, :user_id, :activity_type, :activity_date, :title, :details, :related_crop_animal, :cost)'
    );
    $statement->execute([
        'id' => $id,
        'user_id' => $sessionUser['id'],
        ...$activity,
    ]);

    $lookup = $pdo->prepare(
        'SELECT a.id, a.user_id, u.full_name AS author_name, a.activity_type, a.activity_date,
                a.title, a.details, a.related_crop_animal, a.cost, a.created_at, a.updated_at
         FROM farm_activities AS a
         INNER JOIN users AS u ON u.id = a.user_id
         WHERE a.id = :id LIMIT 1'
    );
    $lookup->execute(['id' => $id]);
    $row = $lookup->fetch();
    if ($row === false) {
        throw new RuntimeException('The saved farm activity could not be read back.');
    }
} catch (PDOException $error) {
    error_log('TanodBukid farm activity save failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'Unable to save this farm activity. Please try again.'], 503);
} catch (RuntimeException $error) {
    error_log('TanodBukid farm activity lookup after save failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'The activity was saved, but its details could not be loaded. Refresh Farm Logs to check it.'], 503);
}

json_response(['success' => true, 'activity' => farm_activity_response_row($row)], 201);
