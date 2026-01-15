<?php
/**
 * Delete Invoice Endpoint
 * DELETE /api/invoices/delete.php?id=xxx
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();
$invoiceId = $_GET['id'] ?? null;

if (!$invoiceId) {
    errorResponse('Invoice ID is required');
}

try {
    // Verify invoice belongs to user
    $stmt = $pdo->prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?');
    $stmt->execute([$invoiceId, $user['id']]);
    
    if (!$stmt->fetch()) {
        errorResponse('Invoice not found', 404);
    }
    
    // Delete the invoice
    $stmt = $pdo->prepare('DELETE FROM invoices WHERE id = ?');
    $stmt->execute([$invoiceId]);
    
    jsonResponse(['success' => true, 'message' => 'Invoice deleted']);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
