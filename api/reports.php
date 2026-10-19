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
$allowedCategories = ['pest', 'flood', 'weather', 'tips'];

function report_image_url(mixed $path): ?string
{
    if (!is_string($path) || preg_match('#^uploads/reports/[a-f0-9]{32}\.(?:jpg|png|webp)$#D', $path) !== 1) {
        return null;
    }

    return '/' . $path;
}

function report_author_avatar_url(mixed $path): ?string
{
    if (!is_string($path) || preg_match('#^uploads/profile/[a-f0-9]{32}\.(?:jpg|png|webp)$#D', $path) !== 1) {
        return null;
    }

    return $path;
}

function report_response_row(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'user_id' => (int) $row['user_id'],
        'title' => (string) $row['title'],
        'description' => (string) $row['description'],
        'category' => (string) $row['category'],
        'location' => (string) $row['location'],
        'image_url' => report_image_url($row['image_url']),
        'author_name' => (string) $row['author_name'],
        'author_avatar_url' => report_author_avatar_url($row['author_avatar_url']),
        'created_at' => (string) $row['created_at'],
        'updated_at' => (string) $row['updated_at'],
    ];
}

if ($requestMethod === 'GET') {
    $reportId = is_string($_GET['id'] ?? null) ? trim($_GET['id']) : '';
    $category = is_string($_GET['category'] ?? null) ? trim($_GET['category']) : '';

    try {
        if ($reportId !== '') {
            if (preg_match('/^[a-f0-9-]{36}$/i', $reportId) !== 1) {
                json_response(['success' => false, 'message' => 'Invalid report ID.'], 422);
            }
            $statement = $pdo->prepare(
                'SELECT id, user_id, title, description, category, location, image_url, author_name, author_avatar_url, created_at, updated_at
                 FROM reports WHERE id = :id LIMIT 1'
            );
            $statement->execute(['id' => $reportId]);
            $row = $statement->fetch();
            if ($row === false) {
                json_response(['success' => false, 'message' => 'Report not found.'], 404);
            }
            json_response(['success' => true, 'report' => report_response_row($row)]);
        }

        if ($category !== '' && !in_array($category, $allowedCategories, true)) {
            json_response(['success' => false, 'message' => 'Invalid report category.'], 422);
        }

        if ($category !== '') {
            $statement = $pdo->prepare(
                'SELECT id, user_id, title, description, category, location, image_url, author_name, author_avatar_url, created_at, updated_at
                 FROM reports WHERE category = :category ORDER BY created_at DESC, id DESC'
            );
            $statement->execute(['category' => $category]);
        } else {
            $statement = $pdo->query(
                'SELECT id, user_id, title, description, category, location, image_url, author_name, author_avatar_url, created_at, updated_at
                 FROM reports ORDER BY created_at DESC, id DESC'
            );
        }
        $reports = array_map('report_response_row', $statement->fetchAll());
    } catch (PDOException $error) {
        error_log('TanodBukid reports lookup failed: ' . $error->getMessage());
        json_response(['success' => false, 'message' => 'Unable to load community reports right now.'], 503);
    }

    json_response(['success' => true, 'reports' => $reports]);
}

$title = trim(is_string($_POST['title'] ?? null) ? $_POST['title'] : '');
$description = trim(is_string($_POST['description'] ?? null) ? $_POST['description'] : '');
$category = is_string($_POST['category'] ?? null) ? trim($_POST['category']) : '';
$location = trim(is_string($_POST['location'] ?? null) ? $_POST['location'] : '');
$errors = [];
if ($title === '' || mb_strlen($title, 'UTF-8') > 160) {
    $errors['title'] = 'Enter a report title (up to 160 characters).';
}
if ($description === '' || mb_strlen($description, 'UTF-8') > 5000) {
    $errors['description'] = 'Enter a report description (up to 5000 characters).';
}
if (!in_array($category, $allowedCategories, true)) {
    $errors['category'] = 'Choose a valid report category.';
}
if ($location === '' || mb_strlen($location, 'UTF-8') > 200) {
    $errors['location'] = 'Enter a location (up to 200 characters).';
}
if ($errors !== []) {
    json_response(['success' => false, 'message' => 'Please correct the report details.', 'errors' => $errors], 422);
}

$imagePath = null;
$upload = $_FILES['report_image'] ?? null;
if (is_array($upload) && ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    if (!isset($upload['error']) || !is_int($upload['error'])) {
        json_response(['success' => false, 'message' => 'The report image upload failed.'], 400);
    }
    if ($upload['error'] === UPLOAD_ERR_INI_SIZE || $upload['error'] === UPLOAD_ERR_FORM_SIZE) {
        json_response(['success' => false, 'message' => 'The report image must be 5 MB or smaller.'], 413);
    }
    if ($upload['error'] !== UPLOAD_ERR_OK || !isset($upload['tmp_name']) || !is_string($upload['tmp_name']) || !is_uploaded_file($upload['tmp_name'])) {
        json_response(['success' => false, 'message' => 'The report image upload failed. Please try again.'], 400);
    }

    $size = filesize($upload['tmp_name']);
    if ($size === false || $size <= 0 || $size > 5 * 1024 * 1024) {
        json_response(['success' => false, 'message' => 'The report image must be 5 MB or smaller.'], 413);
    }
    $imageInfo = @getimagesize($upload['tmp_name']);
    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if ($imageInfo === false || !isset($extensions[$mimeType]) || ($imageInfo['mime'] ?? null) !== $mimeType) {
        json_response(['success' => false, 'message' => 'Upload a valid JPG, PNG, or WebP image.'], 415);
    }

    $directory = __DIR__ . '/../uploads/reports';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        error_log('TanodBukid report upload directory could not be created.');
        json_response(['success' => false, 'message' => 'Unable to save the report image right now.'], 500);
    }
    if (!is_writable($directory)) {
        error_log('TanodBukid report upload directory is not writable.');
        json_response(['success' => false, 'message' => 'Unable to save the report image right now.'], 500);
    }

    try {
        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
    } catch (Throwable $error) {
        error_log('TanodBukid report filename generation failed: ' . $error->getMessage());
        json_response(['success' => false, 'message' => 'Unable to save the report image right now.'], 500);
    }
    if (!move_uploaded_file($upload['tmp_name'], $directory . '/' . $filename)) {
        error_log('TanodBukid report image could not be moved into the upload directory.');
        json_response(['success' => false, 'message' => 'Unable to save the report image right now.'], 500);
    }
    $imagePath = 'uploads/reports/' . $filename;
}

try {
    $authorQuery = $pdo->prepare('SELECT full_name, profile_picture FROM users WHERE id = :id LIMIT 1');
    $authorQuery->execute(['id' => $sessionUser['id']]);
    $author = $authorQuery->fetch();
    if ($author === false) {
        if ($imagePath !== null && is_file(__DIR__ . '/../' . $imagePath)) {
            unlink(__DIR__ . '/../' . $imagePath);
        }
        $_SESSION = [];
        session_destroy();
        json_response(['success' => false, 'message' => 'Your session has expired. Please sign in again.'], 401);
    }

    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    $reportId = sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20));

    $statement = $pdo->prepare(
        'INSERT INTO reports (id, user_id, author_name, author_avatar_url, title, description, category, location, image_url)
         VALUES (:id, :user_id, :author_name, :author_avatar_url, :title, :description, :category, :location, :image_url)'
    );
    $statement->execute([
        'id' => $reportId,
        'user_id' => $sessionUser['id'],
        'author_name' => (string) $author['full_name'],
        'author_avatar_url' => report_author_avatar_url($author['profile_picture']),
        'title' => $title,
        'description' => $description,
        'category' => $category,
        'location' => $location,
        'image_url' => $imagePath,
    ]);
    $reportQuery = $pdo->prepare(
        'SELECT id, user_id, title, description, category, location, image_url, author_name, author_avatar_url, created_at, updated_at
         FROM reports WHERE id = :id LIMIT 1'
    );
    $reportQuery->execute(['id' => $reportId]);
    $report = $reportQuery->fetch();
} catch (Throwable $error) {
    if ($imagePath !== null && is_file(__DIR__ . '/../' . $imagePath) && !unlink(__DIR__ . '/../' . $imagePath)) {
        error_log('TanodBukid abandoned report image could not be removed.');
    }
    error_log('TanodBukid report creation failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'Unable to publish the report right now. Please try again.'], 503);
}

json_response(['success' => true, 'report' => report_response_row($report)], 201);
