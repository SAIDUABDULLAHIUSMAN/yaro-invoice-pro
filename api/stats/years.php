<?php
/**
 * Available Years Endpoint
 * GET /api/stats/years.php
 * Returns list of years that have invoice data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();

try {
    $stmt = $pdo->prepare('
        SELECT DISTINCT YEAR(created_at) as year 
        FROM invoices 
        WHERE user_id = ? 
        ORDER BY year DESC
    ');
    $stmt->execute([$user['id']]);
    $years = array_column($stmt->fetchAll(), 'year');
    
    // If no years found, return current year
    if (empty($years)) {
        $years = [(int) date('Y')];
    }
    
    jsonResponse(['years' => $years]);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
