<?php
/**
 * Products Endpoint
 * GET /api/products/ - List all products for user
 * POST /api/products/ - Create new product
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // List all products for the user
        $stmt = $pdo->prepare('
            SELECT id, name, price, stock, category, created_at 
            FROM products 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ');
        $stmt->execute([$user['id']]);
        $products = $stmt->fetchAll();
        
        // Convert price to float
        foreach ($products as &$product) {
            $product['price'] = (float) $product['price'];
            $product['stock'] = (int) $product['stock'];
        }
        
        jsonResponse($products);
        
    } elseif ($method === 'POST') {
        // Create new product
        $input = getJsonInput();
        
        if (empty($input['name'])) {
            errorResponse('Product name is required');
        }
        
        $productId = generateUUID();
        $name = trim($input['name']);
        $price = floatval($input['price'] ?? 0);
        $stock = intval($input['stock'] ?? 0);
        $category = trim($input['category'] ?? 'Other');
        
        // Check for duplicate product name for this user
        $stmt = $pdo->prepare('SELECT id FROM products WHERE user_id = ? AND name = ?');
        $stmt->execute([$user['id'], $name]);
        
        if ($stmt->fetch()) {
            errorResponse('A product with this name already exists', 409);
        }
        
        $stmt = $pdo->prepare('
            INSERT INTO products (id, user_id, name, price, stock, category) 
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$productId, $user['id'], $name, $price, $stock, $category]);
        
        jsonResponse([
            'id' => $productId,
            'name' => $name,
            'price' => $price,
            'stock' => $stock,
            'category' => $category
        ], 201);
        
    } else {
        errorResponse('Method not allowed', 405);
    }
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
