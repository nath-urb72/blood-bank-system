<?php
// backend/bootstrap.php: SHARED FUNCTIONS FOR ALL BACKEND FILES
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json');

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();
require_once __DIR__ . '/../config/db_connect.php';

// CONSTANTS FOR DATABASE & FILTERING
const TYPES      = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Red cells', 'Plasma', 'Platelets'];
const STATUSES   = ['Stored', 'Testing', 'Expired', 'Used'];

// RESPONSES
function respond(array $payload, int $code = 200): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function fail(string $msg, int $code = 400): void {
    respond(['success' => false, 'error' => $msg], $code);
}

// AUTHENTICATION & REQUEST TYPE
function require_login(): void {
    if (empty($_SESSION['user_id'])) fail('Please log in first.', 401);
}

function require_post(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('This action requires POST.', 405);
}

// VALIDATION
function numId($raw): int {
    return (int) preg_replace('/\D/', '', (string) $raw);
}

function validDate(string $d): bool {
    $dt = DateTime::createFromFormat('Y-m-d', $d);
    return $dt !== false && $dt->format('Y-m-d') === $d;
}

function cleanDonor(array $b): array {
    $name = trim($b['name'] ?? '');
    $type = trim($b['type'] ?? '');
    if ($name === '' || strlen($name) > 100) fail('Enter a donor name (max 100 characters).');
    if (!in_array($type, TYPES, true))       fail('Invalid blood type.');
    return [$name, $type];
}

function cleanBag(array $b): array {
    $comp   = trim($b['comp'] ?? '');
    $status = trim($b['status'] ?? 'Stored');
    $date   = trim($b['date'] ?? '');
    if (!in_array($comp, COMPONENTS, true)) fail('Invalid component.');
    if (!in_array($status, STATUSES, true)) fail('Invalid status.');
    if (!validDate($date))                  fail('Invalid collection date.');
    if ($date > date('Y-m-d'))              fail('Collection date cannot be in the future.');
    return [$comp, $status, $date];
}

function donorExists(PDO $pdo, int $id): bool {
    $s = $pdo->prepare('SELECT 1 FROM donors WHERE id = ? AND is_deleted = 0');
    $s->execute([$id]);
    return (bool) $s->fetchColumn();
}

function expire_old_bags(PDO $pdo): void {
    $pdo->prepare("UPDATE blood_bags SET status = 'Expired'
                WHERE status IN ('Stored', 'Testing') AND expiry_date < ?")
        ->execute([date('Y-m-d')]);
}

// EXCEPTION HANDLING
set_exception_handler(function (Throwable $e) {
    global $pdo;
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[api] ' . $e->getMessage());
    fail('Server error. Please try again.', 500);
});