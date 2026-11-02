<?php
// backend/read.php: ALL read operations (MAINLY FOR THE DASHBOARD)
//   read.php?what=data   -> donors + bags (for the tables)
//   read.php?what=stats  -> dashboard statistics
require_once __DIR__ . '/bootstrap.php';
require_login();
expire_old_bags($pdo);

$what = $_GET['what'] ?? '';

// DETERMINE WHAT TO READ FROM THE DATABASE
switch ($what) {

    case 'data':
        $donorRows = $pdo->query("
            SELECT d.id, d.name, d.blood_type,
                (SELECT MAX(b.collection_date) FROM blood_bags b
                WHERE b.donor_id = d.id AND b.is_deleted = 0) AS last_donation
            FROM donors d WHERE d.is_deleted = 0 ORDER BY d.id DESC")->fetchAll();

        $donors = array_map(fn($d) => [
            'id'   => 'D-' . str_pad((string) $d['id'], 3, '0', STR_PAD_LEFT),
            'name' => $d['name'],
            'type' => $d['blood_type'],
            'last' => $d['last_donation'],       // null if the donor has no bags
        ], $donorRows);

        $bagRows = $pdo->query("
            SELECT b.id, b.donor_id, b.component, b.collection_date, b.status, d.blood_type
            FROM blood_bags b JOIN donors d ON d.id = b.donor_id
            WHERE b.is_deleted = 0 ORDER BY b.id DESC")->fetchAll();

        $bags = array_map(fn($b) => [
            'id'     => 'B-' . str_pad((string) $b['id'], 4, '0', STR_PAD_LEFT),
            'donor'  => 'D-' . str_pad((string) $b['donor_id'], 3, '0', STR_PAD_LEFT),
            'type'   => $b['blood_type'],
            'comp'   => $b['component'],
            'date'   => $b['collection_date'],
            'status' => $b['status'],
        ], $bagRows);

        respond(['success' => true, 'donors' => $donors, 'bags' => $bags]);

    case 'stats':
        $types      = array_fill_keys(TYPES, 0);
        $components = array_fill_keys(COMPONENTS, 0);

        foreach ($pdo->query("SELECT d.blood_type AS k, COUNT(*) AS n
                            FROM blood_bags b JOIN donors d ON d.id = b.donor_id
                            WHERE b.status = 'Stored' AND b.is_deleted = 0
                            GROUP BY d.blood_type") as $r) {
            $types[$r['k']] = (int) $r['n'];
        }
        foreach ($pdo->query("SELECT component AS k, COUNT(*) AS n FROM blood_bags
                            WHERE status = 'Stored' AND is_deleted = 0
                            GROUP BY component") as $r) {
            $components[$r['k']] = (int) $r['n'];
        }
        $total = (int) $pdo->query('SELECT COUNT(*) FROM blood_bags WHERE is_deleted = 0')->fetchColumn();

        $statuses = array_fill_keys(STATUSES, 0);
        foreach ($pdo->query('SELECT status AS k, COUNT(*) AS n FROM blood_bags
                            WHERE is_deleted = 0 GROUP BY status') as $r) {
            $statuses[$r['k']] = (int) $r['n'];
        }
        $donorCount = (int) $pdo->query('SELECT COUNT(*) FROM donors WHERE is_deleted = 0')->fetchColumn();

        respond(['success' => true, 'types' => $types, 'components' => $components,
                'statuses' => $statuses, 'total' => $total, 'donors' => $donorCount]);

    default:
        fail('Unknown read request.', 400);
}