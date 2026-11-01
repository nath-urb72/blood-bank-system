<?php
// backend/check_session.php: public; lets the page ask "am I logged in?"
require_once __DIR__ . '/bootstrap.php';
respond(['success' => true, 'logged_in' => !empty($_SESSION['user_id'])]);