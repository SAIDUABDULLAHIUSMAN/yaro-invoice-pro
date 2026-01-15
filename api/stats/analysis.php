<?php
/**
 * Sales Analysis Endpoint
 * GET /api/stats/analysis.php
 * Returns weekly and monthly sales data for charts
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();

try {
    // Get invoices from last 4 weeks for weekly analysis
    $fourWeeksAgo = date('Y-m-d', strtotime('-4 weeks'));
    $stmt = $pdo->prepare('
        SELECT total, created_at 
        FROM invoices 
        WHERE user_id = ? AND DATE(created_at) >= ?
        ORDER BY created_at ASC
    ');
    $stmt->execute([$user['id'], $fourWeeksAgo]);
    $recentInvoices = $stmt->fetchAll();
    
    // Get invoices from last 6 months for monthly analysis
    $sixMonthsAgo = date('Y-m-d', strtotime('-6 months'));
    $stmt = $pdo->prepare('
        SELECT total, created_at 
        FROM invoices 
        WHERE user_id = ? AND DATE(created_at) >= ?
        ORDER BY created_at ASC
    ');
    $stmt->execute([$user['id'], $sixMonthsAgo]);
    $monthlyInvoices = $stmt->fetchAll();
    
    // Process weekly data (daily breakdown for current week)
    $weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    $weeklyData = [];
    
    // Initialize all days with 0
    foreach ($weekDays as $day) {
        $weeklyData[$day] = ['date' => $day, 'total' => 0, 'count' => 0];
    }
    
    // Calculate this week and last week totals
    $thisWeekStart = date('Y-m-d', strtotime('monday this week'));
    $lastWeekStart = date('Y-m-d', strtotime('monday last week'));
    $lastWeekEnd = date('Y-m-d', strtotime('sunday last week'));
    
    $thisWeekTotal = 0;
    $lastWeekTotal = 0;
    
    foreach ($recentInvoices as $invoice) {
        $invoiceDate = date('Y-m-d', strtotime($invoice['created_at']));
        $dayOfWeek = date('D', strtotime($invoice['created_at']));
        $total = (float) $invoice['total'];
        
        // This week data for chart
        if ($invoiceDate >= $thisWeekStart) {
            $weeklyData[$dayOfWeek]['total'] += $total;
            $weeklyData[$dayOfWeek]['count']++;
            $thisWeekTotal += $total;
        }
        
        // Last week total
        if ($invoiceDate >= $lastWeekStart && $invoiceDate <= $lastWeekEnd) {
            $lastWeekTotal += $total;
        }
    }
    
    // Process monthly data (weekly breakdown for last 3 months)
    $monthlyData = [];
    $threeMonthsAgo = date('Y-m-d', strtotime('-3 months'));
    
    // Group by week
    $weeklyTotals = [];
    $thisMonthTotal = 0;
    $lastMonthTotal = 0;
    
    $thisMonthStart = date('Y-m-01');
    $lastMonthStart = date('Y-m-01', strtotime('-1 month'));
    $lastMonthEnd = date('Y-m-t', strtotime('-1 month'));
    
    foreach ($monthlyInvoices as $invoice) {
        $invoiceDate = date('Y-m-d', strtotime($invoice['created_at']));
        $weekNumber = date('W', strtotime($invoice['created_at']));
        $year = date('Y', strtotime($invoice['created_at']));
        $weekKey = $year . '-W' . $weekNumber;
        $total = (float) $invoice['total'];
        
        // Only include last 3 months
        if ($invoiceDate >= $threeMonthsAgo) {
            if (!isset($weeklyTotals[$weekKey])) {
                $weeklyTotals[$weekKey] = ['date' => 'Week ' . $weekNumber, 'total' => 0, 'count' => 0];
            }
            $weeklyTotals[$weekKey]['total'] += $total;
            $weeklyTotals[$weekKey]['count']++;
        }
        
        // This month
        if ($invoiceDate >= $thisMonthStart) {
            $thisMonthTotal += $total;
        }
        
        // Last month
        if ($invoiceDate >= $lastMonthStart && $invoiceDate <= $lastMonthEnd) {
            $lastMonthTotal += $total;
        }
    }
    
    $monthlyData = array_values($weeklyTotals);
    
    jsonResponse([
        'weeklyData' => array_values($weeklyData),
        'monthlyData' => $monthlyData,
        'thisWeekTotal' => $thisWeekTotal,
        'lastWeekTotal' => $lastWeekTotal,
        'thisMonthTotal' => $thisMonthTotal,
        'lastMonthTotal' => $lastMonthTotal
    ]);
    
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
}
