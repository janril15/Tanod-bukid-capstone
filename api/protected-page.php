<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

start_app_session();
if (session_user() === null) {
    header('Location: ' . current_project_base_path() . '/index.html#signin', true, 302);
    exit;
}

$pages = [
    'profile-setup' => __DIR__ . '/../profile-setup.html',
    'scanner' => __DIR__ . '/../dashboard.html',
    'dashboard' => __DIR__ . '/../Tanod Bukid Dash Board (1)/index (1).html',
    'dist-profile-setup' => __DIR__ . '/../dist/profile-setup.html',
    'dist-scanner' => __DIR__ . '/../dist/dashboard.html',
    'dist-dashboard' => __DIR__ . '/../dist/Tanod Bukid Dash Board (1)/index (1).html',
];
$page = is_string($_GET['page'] ?? null) ? $_GET['page'] : '';
if (!isset($pages[$page])) {
    http_response_code(404);
    exit('Page not found.');
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
readfile($pages[$page]);
