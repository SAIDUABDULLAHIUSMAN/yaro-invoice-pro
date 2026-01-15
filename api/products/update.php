<?php
/**
 * Update Product Endpoint
 * PUT /api/products/update.php?id=xxx
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();
$productId = $_GET['id'] ?? null;

if (!$productId) {
    errorResponse('Product ID is required');
}

$input = getJsonInput();

try {
    // Verify product belongs to user
    $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ? AND user_id = ?');
    $stmt->execute([$productId, $user['id']]);
    
    if (!$stmt->fetch()) {
        errorResponse('Product not found', 404);
    }
    
    // Build update query dynamically
    $updates = [];
    $params = [];
    
    if (isset($input['name'])) {
        // Check for duplicate name (excluding current product)
        $stmt = $pdo->prepare('SELECT id FROM products WHERE user_id = ? AND name = ? AND id != ?');
        $stmt->execute([$user['id'], $input['name'], $productId]);
        
        if ($stmt->fetch()) {
            errorResponse('A product with this name already exists', 409);
        }
        
        $updates[] = 'name = ?';
        $params[] = trim($input['name']);
    }
    
    if (isset($input['price'])) {
        $updates[] = 'price = ?';
        $params[] = floatval($input['price']);
    }
    
    if (isset($input['stock'])) {
        $updates[] = 'stock = ?';
        $params[] = intval($input['stock']);
    }
    
    if (isset($input['category'])) {
        $updates[] = 'category = ?';
        $params[] = trim($input['category']);
    }
    
    if (empty($updates)) {
        errorResponse('No fields to update');
    }
    
    $params[] = $productId;
    $sql = 'UPDATE products SET ' . implode(', ', $updates) . ' WHERE id = ?';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    // Fetch updated product
    $stmt = $pdo->prepare('SELECT id, name, price, stock, category, created_at FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    
    $product['price'] = (float) $product['price'];
    $product['stock'] = (int) $product['stock'];
    
    jsonResponse($product);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
