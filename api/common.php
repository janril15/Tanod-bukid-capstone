<?php
declare(strict_types=1);

ini_set('display_errors', '0');

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        json_response(['success' => false, 'message' => 'Method not allowed.'], 405);
    }
}

function read_json_request(): array
{
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        json_response(['success' => false, 'message' => 'Send request data as JSON.'], 415);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        json_response(['success' => false, 'message' => 'The request body must be valid JSON.'], 400);
    }
    return $data;
}

function start_app_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $scriptDirectory = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    $basePath = basename($scriptDirectory) === 'api' ? dirname($scriptDirectory) : $scriptDirectory;
    $basePath = str_replace('\\', '/', $basePath);
    $cookiePath = rtrim($basePath, '/') . '/';
    if ($cookiePath === '//') {
        $cookiePath = '/';
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('tanodbukid_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $cookiePath,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function pdo_connection(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('TANODBUKID_DB_HOST') ?: '127.0.0.1';
    $database = getenv('TANODBUKID_DB_NAME') ?: 'tanodbukid_db';
    $username = getenv('TANODBUKID_DB_USER') ?: 'root';
    $password = getenv('TANODBUKID_DB_PASSWORD') ?: '';

    try {
        $pdo = new PDO(
            "mysql:host={$host};dbname={$database};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $error) {
        error_log('TanodBukid database connection failed: ' . $error->getMessage());
        json_response([
            'success' => false,
            'message' => 'Unable to connect to the database. Check that MySQL is running and the PHP database settings are correct.',
        ], 503);
    }

    return $pdo;
}

function save_profile_picture(array $upload): string
{
    if (!isset($upload['error']) || !is_int($upload['error'])) {
        json_response(['success' => false, 'message' => 'Choose a profile picture to upload.'], 422);
    }
    if ($upload['error'] === UPLOAD_ERR_INI_SIZE || $upload['error'] === UPLOAD_ERR_FORM_SIZE) {
        json_response(['success' => false, 'message' => 'The profile picture must be 5 MB or smaller.'], 413);
    }
    if ($upload['error'] !== UPLOAD_ERR_OK || !isset($upload['tmp_name']) || !is_string($upload['tmp_name']) || !is_uploaded_file($upload['tmp_name'])) {
        json_response(['success' => false, 'message' => 'The profile picture upload failed. Please try again.'], 400);
    }

    $size = filesize($upload['tmp_name']);
    if ($size === false || $size <= 0 || $size > 5 * 1024 * 1024) {
        json_response(['success' => false, 'message' => 'The profile picture must be 5 MB or smaller.'], 413);
    }

    $image = @getimagesize($upload['tmp_name']);
    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if ($image === false || !isset($extensions[$mimeType]) || ($image['mime'] ?? null) !== $mimeType) {
        json_response(['success' => false, 'message' => 'Upload a valid JPG, PNG, or WebP image.'], 415);
    }

    $directory = __DIR__ . '/../uploads/profile';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        error_log('TanodBukid profile upload directory could not be created.');
        json_response(['success' => false, 'message' => 'Unable to save the profile picture right now.'], 500);
    }
    if (!is_writable($directory)) {
        error_log('TanodBukid profile upload directory is not writable.');
        json_response(['success' => false, 'message' => 'Unable to save the profile picture right now.'], 500);
    }

    try {
        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
    } catch (Throwable $error) {
        error_log('TanodBukid profile picture filename generation failed: ' . $error->getMessage());
        json_response(['success' => false, 'message' => 'Unable to save the profile picture right now.'], 500);
    }

    if (!move_uploaded_file($upload['tmp_name'], $directory . '/' . $filename)) {
        error_log('TanodBukid profile picture could not be moved into the upload directory.');
        json_response(['success' => false, 'message' => 'Unable to save the profile picture right now.'], 500);
    }

    return 'uploads/profile/' . $filename;
}

function delete_profile_picture(?string $relativePath): void
{
    if (!is_string($relativePath) || preg_match('#^uploads/profile/[a-f0-9]{32}\.(?:jpg|png|webp)$#D', $relativePath) !== 1) {
        return;
    }

    $path = __DIR__ . '/../' . $relativePath;
    if (is_file($path) && !unlink($path)) {
        error_log('TanodBukid replaced profile picture could not be removed.');
    }
}

function normalize_mobile_number(string $mobile): ?string
{
    $mobile = preg_replace('/[\s().-]+/', '', trim($mobile));
    if (!is_string($mobile)) {
        return null;
    }

    if (str_starts_with($mobile, '+63')) {
        $mobile = '0' . substr($mobile, 3);
    } elseif (str_starts_with($mobile, '63')) {
        $mobile = '0' . substr($mobile, 2);
    } elseif (preg_match('/^9\d{9}$/', $mobile) === 1) {
        $mobile = '0' . $mobile;
    }

    return preg_match('/^09\d{9}$/', $mobile) === 1 ? $mobile : null;
}

function session_user(): ?array
{
    if (!isset($_SESSION['user_id'], $_SESSION['full_name'], $_SESSION['role'])) {
        return null;
    }

    return [
        'id' => (int) $_SESSION['user_id'],
        'full_name' => (string) $_SESSION['full_name'],
        'role' => (string) $_SESSION['role'],
    ];
}

function current_project_base_path(): string
{
    $scriptDirectory = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    $basePath = basename($scriptDirectory) === 'api' ? dirname($scriptDirectory) : $scriptDirectory;
    $basePath = str_replace('\\', '/', $basePath);
    return $basePath === '/' || $basePath === '.' ? '' : rtrim($basePath, '/');
}
