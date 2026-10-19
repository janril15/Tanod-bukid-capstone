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

if ($requestMethod === 'POST') {
    $pdo = pdo_connection();
    $newPicture = save_profile_picture($_FILES['profile_picture'] ?? []);

    try {
        $lookup = $pdo->prepare('SELECT profile_picture FROM users WHERE id = :id LIMIT 1');
        $lookup->execute(['id' => $sessionUser['id']]);
        $user = $lookup->fetch();
        if ($user === false) {
            delete_profile_picture($newPicture);
            $_SESSION = [];
            session_destroy();
            json_response(['success' => false, 'message' => 'Your session has expired. Please sign in again.'], 401);
        }

        $update = $pdo->prepare('UPDATE users SET profile_picture = :profile_picture WHERE id = :id');
        $update->execute(['profile_picture' => $newPicture, 'id' => $sessionUser['id']]);
    } catch (PDOException $error) {
        delete_profile_picture($newPicture);
        error_log('TanodBukid profile picture update failed: ' . $error->getMessage());
        json_response(['success' => false, 'message' => 'Unable to save your profile picture right now.'], 503);
    }

    delete_profile_picture(is_string($user['profile_picture'] ?? null) ? $user['profile_picture'] : null);
    json_response([
        'success' => true,
        'profile_picture' => $newPicture,
    ]);
}

try {
    $statement = pdo_connection()->prepare(
        'SELECT id, full_name, email, created_at, profile_picture FROM users WHERE id = :id LIMIT 1'
    );
    $statement->execute(['id' => $sessionUser['id']]);
    $user = $statement->fetch();
} catch (PDOException $error) {
    error_log('TanodBukid profile lookup failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'Unable to load your account information right now.'], 503);
}

if ($user === false) {
    $_SESSION = [];
    session_destroy();
    json_response(['success' => false, 'message' => 'Your session has expired. Please sign in again.'], 401);
}

json_response([
    'success' => true,
    'profile' => [
        'id' => (int) $user['id'],
        'full_name' => (string) $user['full_name'],
        'email' => (string) $user['email'],
        'location' => null,
        'created_at' => $user['created_at'],
        'profile_picture' => is_string($user['profile_picture']) ? $user['profile_picture'] : null,
    ],
]);
