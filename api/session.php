<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

require_method('GET');
start_app_session();
$sessionUser = session_user();
if ($sessionUser === null) {
    json_response(['success' => true, 'authenticated' => false, 'user' => null]);
}

$statement = pdo_connection()->prepare(
    'SELECT id, full_name, role FROM users WHERE id = :id LIMIT 1'
);
$statement->execute(['id' => $sessionUser['id']]);
$user = $statement->fetch();
if ($user === false) {
    $_SESSION = [];
    session_destroy();
    json_response(['success' => true, 'authenticated' => false, 'user' => null]);
}

$_SESSION['full_name'] = (string) $user['full_name'];
$_SESSION['role'] = (string) $user['role'];
json_response([
    'success' => true,
    'authenticated' => true,
    'user' => [
        'id' => (int) $user['id'],
        'full_name' => (string) $user['full_name'],
        'role' => (string) $user['role'],
    ],
]);
