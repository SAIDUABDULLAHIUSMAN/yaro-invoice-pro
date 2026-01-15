<?php
/**
 * Tax Tracking Endpoint
 * GET /api/stats/tax.php?year=2024
 * Returns monthly and quarterly tax data for a given year
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();
$year = intval($_GET['year'] ?? date('Y'));

try {
    // Get all invoices for the specified year
    $stmt = $pdo->prepare('
        SELECT subtotal, tax, total, created_at 
        FROM invoices 
        WHERE user_id = ? AND YEAR(created_at) = ?
        ORDER BY created_at ASC
    ');
    $stmt->execute([$user['id'], $year]);
    $invoices = $stmt->fetchAll();
    
    // Initialize monthly data
    $months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    $monthlyData = [];
    foreach ($months as $month) {
        $monthlyData[$month] = [
            'month' => $month,
            'tax' => 0,
            'sales' => 0,
            'invoiceCount' => 0
        ];
    }
    
    // Initialize quarterly data
    $quarterlyData = [
        'Q1' => ['quarter' => 'Q1', 'tax' => 0, 'sales' => 0, 'invoiceCount' => 0],
        'Q2' => ['quarter' => 'Q2', 'tax' => 0, 'sales' => 0, 'invoiceCount' => 0],
        'Q3' => ['quarter' => 'Q3', 'tax' => 0, 'sales' => 0, 'invoiceCount' => 0],
        'Q4' => ['quarter' => 'Q4', 'tax' => 0, 'sales' => 0, 'invoiceCount' => 0]
    ];
    
    // Totals
    $totalTax = 0;
    $totalSales = 0;
    $totalInvoices = 0;
    
    // Process invoices
    foreach ($invoices as $invoice) {
        $month = date('M', strtotime($invoice['created_at']));
        $monthNum = (int) date('n', strtotime($invoice['created_at']));
        
        $tax = (float) $invoice['tax'];
        $sales = (float) $invoice['subtotal'];
        
        // Monthly
        $monthlyData[$month]['tax'] += $tax;
        $monthlyData[$month]['sales'] += $sales;
        $monthlyData[$month]['invoiceCount']++;
        
        // Quarterly
        $quarter = 'Q' . ceil($monthNum / 3);
        $quarterlyData[$quarter]['tax'] += $tax;
        $quarterlyData[$quarter]['sales'] += $sales;
        $quarterlyData[$quarter]['invoiceCount']++;
        
        // Totals
        $totalTax += $tax;
        $totalSales += $sales;
        $totalInvoices++;
    }
    
    // Get available years for the dropdown
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
    
    jsonResponse([
        'monthlyData' => array_values($monthlyData),
        'quarterlyData' => array_values($quarterlyData),
        'totalTax' => $totalTax,
        'totalSales' => $totalSales,
        'totalInvoices' => $totalInvoices,
        'availableYears' => $years,
        'selectedYear' => $year
    ]);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
