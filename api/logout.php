<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

require_method('POST');
start_app_session();
$_SESSION = [];

$cookie = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires' => time() - 42000,
    'path' => $cookie['path'],
    'domain' => $cookie['domain'],
    'secure' => $cookie['secure'],
    'httponly' => $cookie['httponly'],
    'samesite' => $cookie['samesite'] ?? 'Lax',
]);

if (!session_destroy()) {
    error_log('TanodBukid session destruction failed.');
    json_response(['success' => false, 'message' => 'Unable to end the session. Please try again.'], 500);
}

json_response(['success' => true, 'message' => 'You have signed out.']);
