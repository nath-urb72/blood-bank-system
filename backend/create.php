<?php
// backend/create_entry.php: CREATE a bag (plus a new donor when none is chosen)
require_once __DIR__ . '/bootstrap.php';
require_login();
require_post();

[$comp, $status, $date] = cleanBag($_POST);
$donorRef = trim($_POST['donor'] ?? '');

if ($donorRef === '') {
    [$name, $type] = cleanDonor($_POST);                 // new donor
} else {
    $donorId = numId($donorRef);                         // existing donor
    if (!donorExists($pdo, $donorId)) fail('Donor not found.', 404);
}

$pdo->beginTransaction();
if ($donorRef === '') {
    $pdo->prepare('INSERT INTO donors (name, blood_type) VALUES (?, ?)')->execute([$name, $type]);
    $donorId = (int) $pdo->lastInsertId();
}
$pdo->prepare('INSERT INTO blood_bags (donor_id, component, status, collection_date, expiry_date)
               VALUES (?, ?, ?, ?, ?)')
    ->execute([$donorId, $comp, $status, $date, expiry_for($comp, $date)]);
$pdo->commit();

respond(['success' => true]);