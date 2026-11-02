<?php
// backend/create.php: CREATE/ADD NEW ENTRY
require_once __DIR__ . '/bootstrap.php';
require_login();
require_post();

[$comp, $status, $date] = cleanBag($_POST);
$donorRef = trim($_POST['donor'] ?? '');

if ($donorRef === '') { // IF DONOR IS NEW
    [$name, $type] = cleanDonor($_POST);
} else { // IF DONOR EXISTS
    $donorId = numId($donorRef);
    if (!donorExists($pdo, $donorId)) fail('Donor not found.', 404);
}

// INSERT DONOR INFORMATION INTO DATABASE
$pdo->beginTransaction();
if ($donorRef === '') {
    $pdo->prepare('INSERT INTO donors (name, blood_type) VALUES (?, ?)')->execute([$name, $type]);
    $donorId = (int) $pdo->lastInsertId();
}

// INSERT BLOOD BAG INFORMATION INTO DATABASE
$pdo->prepare('INSERT INTO blood_bags (donor_id, component, status, collection_date, expiry_date)
            VALUES (?, ?, ?, ?, ?)')
    ->execute([$donorId, $comp, $status, $date, expiry_for($comp, $date)]);
$pdo->commit();

respond(['success' => true]);