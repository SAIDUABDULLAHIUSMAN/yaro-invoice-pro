<?php
/**
 * Get Current User Endpoint
 * GET /api/auth/me.php
 * Requires: Bearer token
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();

try {
    // Fetch full user data from database
    $stmt = $pdo->prepare('SELECT id, email, created_at FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $userData = $stmt->fetch();
    
    if (!$userData) {
        errorResponse('User not found', 404);
    }
    
    jsonResponse([
        'user' => $userData
    ]);
    
} catch (PDOException $e) {
    errorResponse('Failed to fetch user: ' . $e->getMessage(), 500);
}
