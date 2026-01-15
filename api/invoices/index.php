<?php
/**
 * Invoices Endpoint
 * GET /api/invoices/ - List all invoices for user (with optional date filters)
 * POST /api/invoices/ - Create new invoice (with stock decrement)
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Build query with optional date filters
        $sql = 'SELECT * FROM invoices WHERE user_id = ?';
        $params = [$user['id']];
        
        // Date range filters
        if (!empty($_GET['from'])) {
            $sql .= ' AND DATE(created_at) >= ?';
            $params[] = $_GET['from'];
        }
        
        if (!empty($_GET['to'])) {
            $sql .= ' AND DATE(created_at) <= ?';
            $params[] = $_GET['to'];
        }
        
        // Year filter (for tax tracking)
        if (!empty($_GET['year'])) {
            $sql .= ' AND YEAR(created_at) = ?';
            $params[] = intval($_GET['year']);
        }
        
        $sql .= ' ORDER BY created_at DESC';
        
        // Optional limit
        if (!empty($_GET['limit'])) {
            $sql .= ' LIMIT ' . intval($_GET['limit']);
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll();
        
        // Parse JSON products and convert numeric fields
        foreach ($invoices as &$invoice) {
            $invoice['products'] = json_decode($invoice['products'], true);
            $invoice['subtotal'] = (float) $invoice['subtotal'];
            $invoice['tax'] = (float) $invoice['tax'];
            $invoice['total'] = (float) $invoice['total'];
        }
        
        jsonResponse($invoices);
        
    } elseif ($method === 'POST') {
        // Create new invoice
        $input = getJsonInput();
        
        // Validate required fields
        $required = ['invoice_number', 'company_name', 'customer_name', 'issuer_name', 'products'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                errorResponse("$field is required");
            }
        }
        
        if (!is_array($input['products']) || count($input['products']) === 0) {
            errorResponse('At least one product is required');
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Deduct stock for each product
            foreach ($input['products'] as $product) {
                if (!empty($product['id']) && $product['id'] !== 'custom') {
                    $stmt = $pdo->prepare('
                        UPDATE products 
                        SET stock = stock - ? 
                        WHERE id = ? AND user_id = ? AND stock >= ?
                    ');
                    $stmt->execute([
                        intval($product['quantity']),
                        $product['id'],
                        $user['id'],
                        intval($product['quantity'])
                    ]);
                    
                    // Check if stock update was successful
                    if ($stmt->rowCount() === 0) {
                        // Product might not exist or insufficient stock
                        // We'll allow it to proceed for custom products
                    }
                }
            }
            
            // Create invoice
            $invoiceId = generateUUID();
            
            $stmt = $pdo->prepare('
                INSERT INTO invoices (
                    id, user_id, invoice_number, company_name, company_address, 
                    company_phone, customer_name, issuer_name, subtotal, tax, total, products
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            
            $stmt->execute([
                $invoiceId,
                $user['id'],
                $input['invoice_number'],
                $input['company_name'],
                $input['company_address'] ?? null,
                $input['company_phone'] ?? null,
                $input['customer_name'],
                $input['issuer_name'],
                floatval($input['subtotal'] ?? 0),
                floatval($input['tax'] ?? 0),
                floatval($input['total'] ?? 0),
                json_encode($input['products'])
            ]);
            
            $pdo->commit();
            
            jsonResponse([
                'id' => $invoiceId,
                'invoice_number' => $input['invoice_number'],
                'message' => 'Invoice created successfully'
            ], 201);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } else {
        errorResponse('Method not allowed', 405);
    }
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
