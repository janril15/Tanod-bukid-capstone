<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

require_method('POST');
$data = read_json_request();

$firstName = trim(is_string($data['first_name'] ?? null) ? $data['first_name'] : '');
$lastName = trim(is_string($data['last_name'] ?? null) ? $data['last_name'] : '');
$fullName = trim($firstName . ' ' . $lastName);
$mobile = normalize_mobile_number(is_string($data['mobile_number'] ?? null) ? $data['mobile_number'] : '');
$email = strtolower(trim(is_string($data['email'] ?? null) ? $data['email'] : ''));
$password = is_string($data['password'] ?? null) ? $data['password'] : '';

$errors = [];
if ($firstName === '' || strlen($firstName) > 75 || preg_match('/[\x00-\x1F\x7F]/', $firstName) === 1) {
    $errors['first_name'] = 'Enter a valid first name (up to 75 characters).';
}
if ($lastName === '' || strlen($lastName) > 75 || preg_match('/[\x00-\x1F\x7F]/', $lastName) === 1) {
    $errors['last_name'] = 'Enter a valid last name (up to 75 characters).';
}
if ($fullName === '' || strlen($fullName) > 150) {
    $errors['full_name'] = 'Your full name must not exceed 150 characters.';
}
if ($mobile === null) {
    $errors['mobile_number'] = 'Enter a valid Philippine mobile number, such as 09123456789.';
}
if (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Enter a valid email address.';
}
if (strlen($password) < 8 || strlen($password) > 72
    || preg_match('/[A-Z]/', $password) !== 1
    || preg_match('/[a-z]/', $password) !== 1
    || preg_match('/[0-9]/', $password) !== 1
    || preg_match('/[^\p{L}\p{N}\s]/u', $password) !== 1
    || preg_match('/\s/u', $password) === 1
) {
    $errors['password'] = 'Password must be at least 8 characters, no more than 72 bytes, include uppercase and lowercase letters, a number and a special character, and contain no spaces.';
}
if ($errors !== []) {
    json_response(['success' => false, 'message' => 'Please correct the highlighted information.', 'errors' => $errors], 422);
}

$pdo = pdo_connection();
$duplicate = $pdo->prepare('SELECT email, mobile_number FROM users WHERE email = :email OR mobile_number = :mobile_number LIMIT 1');
$duplicate->execute(['email' => $email, 'mobile_number' => $mobile]);
$existing = $duplicate->fetch();
if ($existing !== false) {
    $errors = [];
    if (strcasecmp((string) $existing['email'], $email) === 0) {
        $errors['email'] = 'An account with this email address already exists.';
    }
    if ((string) $existing['mobile_number'] === $mobile) {
        $errors['mobile_number'] = 'An account with this mobile number already exists.';
    }
    json_response(['success' => false, 'message' => 'This account information is already registered.', 'errors' => $errors], 409);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
if ($passwordHash === false) {
    error_log('TanodBukid password hashing failed.');
    json_response(['success' => false, 'message' => 'Unable to create the account right now. Please try again.'], 500);
}

try {
    $insert = $pdo->prepare(
        'INSERT INTO users (full_name, mobile_number, email, password_hash) VALUES (:full_name, :mobile_number, :email, :password_hash)'
    );
    $insert->execute([
        'full_name' => $fullName,
        'mobile_number' => $mobile,
        'email' => $email,
        'password_hash' => $passwordHash,
    ]);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') {
        json_response([
            'success' => false,
            'message' => 'An account with this email address or mobile number already exists.',
        ], 409);
    }
    error_log('TanodBukid registration failed: ' . $error->getMessage());
    json_response(['success' => false, 'message' => 'Unable to create the account right now. Please try again.'], 500);
}

start_app_session();
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $pdo->lastInsertId();
$_SESSION['full_name'] = $fullName;
$_SESSION['role'] = 'farmer';

json_response([
    'success' => true,
    'message' => 'Your account has been created.',
    'user' => ['id' => (int) $_SESSION['user_id'], 'full_name' => $fullName, 'email' => $email, 'role' => 'farmer'],
], 201);
