<?php
/**
 * Delete Product Endpoint
 * DELETE /api/products/delete.php?id=xxx
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();
$productId = $_GET['id'] ?? null;

if (!$productId) {
    errorResponse('Product ID is required');
}

try {
    // Verify product belongs to user
    $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ? AND user_id = ?');
    $stmt->execute([$productId, $user['id']]);
    
    if (!$stmt->fetch()) {
        errorResponse('Product not found', 404);
    }
    
    // Delete the product
    $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    
    jsonResponse(['success' => true, 'message' => 'Product deleted']);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
