<?php
// backend/update.php: ALL update operations
//   update.php?type=donor  -> change a donor's name / blood type
//   update.php?type=bag    -> change a bag (expiry is recalculated)
require_once __DIR__ . '/bootstrap.php';
require_login();
require_post();

$kind = $_GET['type'] ?? '';
$id   = numId($_POST['id'] ?? '');

switch ($kind) {

    case 'donor':
        [$name, $bloodType] = cleanDonor($_POST);

        $st = $pdo->prepare('UPDATE donors SET name = ?, blood_type = ? WHERE id = ? AND is_deleted = 0');
        $st->execute([$name, $bloodType, $id]);
        if ($st->rowCount() === 0) fail('Donor not found.', 404);

        respond(['success' => true]);

    case 'bag':
        [$comp, $status, $date] = cleanBag($_POST);
        $donorId = numId($_POST['donor'] ?? '');
        if (!donorExists($pdo, $donorId)) fail('Donor not found.', 404);

        $st = $pdo->prepare('UPDATE blood_bags
                             SET donor_id = ?, component = ?, status = ?, collection_date = ?, expiry_date = ?
                             WHERE id = ? AND is_deleted = 0');
        $st->execute([$donorId, $comp, $status, $date, expiry_for($comp, $date), $id]);
        if ($st->rowCount() === 0) fail('Bag not found.', 404);

        respond(['success' => true]);

    default:
        fail('Unknown update type.', 400);
}