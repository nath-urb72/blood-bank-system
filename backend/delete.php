<?php
// backend/delete.php: ALL delete operations (soft delete)
//   delete.php?type=donor&id=D-001  -> the donor AND all of their bags
//   delete.php?type=bag&id=B-0001   -> one bag
require_once __DIR__ . '/bootstrap.php';
require_login();
require_post();

$kind = $_GET['type'] ?? '';
$id   = numId($_POST['id'] ?? $_GET['id'] ?? '');

// DETERMINE WHAT TO DELETE (DONOR OR BAG) AND PERFORM THE SOFT DELETE
switch ($kind) {

    case 'donor':
        $pdo->beginTransaction();
        $st = $pdo->prepare('UPDATE donors SET is_deleted = 1 WHERE id = ? AND is_deleted = 0');
        $st->execute([$id]);
        if ($st->rowCount() === 0) { $pdo->rollBack(); fail('Donor not found.', 404); }
        $pdo->prepare('UPDATE blood_bags SET is_deleted = 1 WHERE donor_id = ?')->execute([$id]);
        $pdo->commit();

        respond(['success' => true]);

    case 'bag':
        $st = $pdo->prepare('UPDATE blood_bags SET is_deleted = 1 WHERE id = ? AND is_deleted = 0');
        $st->execute([$id]);
        if ($st->rowCount() === 0) fail('Bag not found.', 404);

        respond(['success' => true]);

    default:
        fail('Unknown delete type.', 400);
}