<?php
/**
 * Dashboard Statistics Endpoint
 * GET /api/stats/dashboard.php
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();

try {
    // Get total sales
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(total), 0) as total_sales FROM invoices WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $totalSales = (float) $stmt->fetch()['total_sales'];
    
    // Get total products count
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $totalProducts = (int) $stmt->fetch()['count'];
    
    // Get total invoices count
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM invoices WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $totalInvoices = (int) $stmt->fetch()['count'];
    
    // Get low stock count (stock <= 10)
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ? AND stock <= 10');
    $stmt->execute([$user['id']]);
    $lowStockCount = (int) $stmt->fetch()['count'];
    
    // Get low stock products
    $stmt = $pdo->prepare('
        SELECT id, name, stock, category 
        FROM products 
        WHERE user_id = ? AND stock <= 10 
        ORDER BY stock ASC 
        LIMIT 10
    ');
    $stmt->execute([$user['id']]);
    $lowStockProducts = $stmt->fetchAll();
    
    foreach ($lowStockProducts as &$product) {
        $product['stock'] = (int) $product['stock'];
    }
    
    jsonResponse([
        'totalSales' => $totalSales,
        'totalProducts' => $totalProducts,
        'totalInvoices' => $totalInvoices,
        'lowStockCount' => $lowStockCount,
        'lowStockProducts' => $lowStockProducts
    ]);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
