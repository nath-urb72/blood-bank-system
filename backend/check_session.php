<?php
// backend/check_session.php: CHECKS IF THE USER IS LOGGED IN
require_once __DIR__ . '/bootstrap.php';
respond(['success' => true, 'logged_in' => !empty($_SESSION['user_id'])]);