<?php
/**
 * Supabase Export Only Script
 * 
 * Exports data from Supabase to JSON files that can be imported later.
 * Useful when you don't have direct MySQL access from the same machine.
 * 
 * Usage:
 * 1. Update the configuration below
 * 2. Run: php export-only.php
 * 3. JSON files will be created in the ./exports/ directory
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

$SUPABASE_URL = 'https://your-project.supabase.co';
$SUPABASE_SERVICE_KEY = 'your-service-role-key';

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

$exportDir = __DIR__ . '/exports';
if (!is_dir($exportDir)) {
    mkdir($exportDir, 0755, true);
}

function log_msg($message) {
    echo date('[Y-m-d H:i:s] ') . $message . PHP_EOL;
}

function supabaseRequest($url, $key, $endpoint) {
    $fullUrl = rtrim($url, '/') . '/rest/v1/' . $endpoint;
    
    $headers = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 400) {
        throw new Exception("API error ($httpCode): $response");
    }

    return json_decode($response, true);
}

function supabaseAuthRequest($url, $key, $endpoint) {
    $fullUrl = rtrim($url, '/') . '/auth/v1/' . $endpoint;
    
    $headers = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 400) {
        throw new Exception("Auth API error ($httpCode): $response");
    }

    return json_decode($response, true);
}

log_msg("========================================");
log_msg("Supabase Data Export");
log_msg("========================================");
log_msg("");

// Export Users
log_msg("Exporting users...");
try {
    $usersResponse = supabaseAuthRequest($SUPABASE_URL, $SUPABASE_SERVICE_KEY, 'admin/users');
    $users = $usersResponse['users'] ?? [];
    
    // Extract only needed fields
    $exportUsers = array_map(function($user) {
        return [
            'id' => $user['id'],
            'email' => $user['email'],
            'created_at' => $user['created_at'],
        ];
    }, $users);
    
    file_put_contents($exportDir . '/users.json', json_encode($exportUsers, JSON_PRETTY_PRINT));
    log_msg("  Exported " . count($users) . " users to exports/users.json");
} catch (Exception $e) {
    log_msg("  ERROR: " . $e->getMessage());
}

// Export Products
log_msg("Exporting products...");
try {
    $products = supabaseRequest($SUPABASE_URL, $SUPABASE_SERVICE_KEY, 'products?select=*');
    file_put_contents($exportDir . '/products.json', json_encode($products, JSON_PRETTY_PRINT));
    log_msg("  Exported " . count($products) . " products to exports/products.json");
} catch (Exception $e) {
    log_msg("  ERROR: " . $e->getMessage());
}

// Export Invoices
log_msg("Exporting invoices...");
try {
    $invoices = supabaseRequest($SUPABASE_URL, $SUPABASE_SERVICE_KEY, 'invoices?select=*');
    file_put_contents($exportDir . '/invoices.json', json_encode($invoices, JSON_PRETTY_PRINT));
    log_msg("  Exported " . count($invoices) . " invoices to exports/invoices.json");
} catch (Exception $e) {
    log_msg("  ERROR: " . $e->getMessage());
}

log_msg("");
log_msg("========================================");
log_msg("Export Complete!");
log_msg("========================================");
log_msg("");
log_msg("Files created in: $exportDir/");
log_msg("  - users.json");
log_msg("  - products.json");
log_msg("  - invoices.json");
log_msg("");
log_msg("Next: Run import-from-json.php on your MySQL server");
