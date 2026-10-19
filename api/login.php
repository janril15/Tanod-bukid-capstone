<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

require_method('POST');
$data = read_json_request();

$mobile = normalize_mobile_number(is_string($data['mobile_number'] ?? null) ? $data['mobile_number'] : '');
$password = is_string($data['password'] ?? null) ? $data['password'] : '';
$errors = [];
if ($mobile === null) {
    $errors['mobile_number'] = 'Enter the mobile number used to register your account.';
}
if ($password === '' || strlen($password) > 72) {
    $errors['password'] = 'Enter your password.';
}
if ($errors !== []) {
    json_response(['success' => false, 'message' => 'Please enter a valid mobile number and password.', 'errors' => $errors], 422);
}

$statement = pdo_connection()->prepare(
    'SELECT id, full_name, mobile_number, password_hash, role FROM users WHERE mobile_number = :mobile_number LIMIT 1'
);
$statement->execute(['mobile_number' => $mobile]);
$user = $statement->fetch();
if ($user === false || !password_verify($password, (string) $user['password_hash'])) {
    json_response(['success' => false, 'message' => 'The mobile number or password is incorrect.'], 401);
}

start_app_session();
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['full_name'] = (string) $user['full_name'];
$_SESSION['role'] = (string) $user['role'];

json_response([
    'success' => true,
    'message' => 'You are signed in.',
    'user' => ['id' => (int) $user['id'], 'full_name' => (string) $user['full_name'], 'role' => (string) $user['role']],
]);
