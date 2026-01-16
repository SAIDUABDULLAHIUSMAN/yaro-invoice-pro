<?php
/**
 * MySQL Import from JSON Script
 * 
 * Imports data from JSON files (created by export-only.php) into MySQL.
 * Run this on your XAMPP or cPanel server.
 * 
 * Usage:
 * 1. Copy the exports/ folder to this directory
 * 2. Update MySQL configuration below
 * 3. Run: php import-from-json.php
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

$MYSQL_HOST = 'localhost';
$MYSQL_DB = 'pos_database';
$MYSQL_USER = 'root';
$MYSQL_PASS = '';

// Temporary password for all migrated users
$TEMP_PASSWORD = 'ChangeMe123!';

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

$exportDir = __DIR__ . '/exports';

function log_msg($message) {
    echo date('[Y-m-d H:i:s] ') . $message . PHP_EOL;
}

function error_msg($message) {
    echo date('[Y-m-d H:i:s] ') . "ERROR: $message" . PHP_EOL;
}

log_msg("========================================");
log_msg("MySQL Import from JSON");
log_msg("========================================");
log_msg("");

// Connect to MySQL
try {
    $dsn = "mysql:host=$MYSQL_HOST;dbname=$MYSQL_DB;charset=utf8mb4";
    $pdo = new PDO($dsn, $MYSQL_USER, $MYSQL_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    log_msg("✓ Connected to MySQL database: $MYSQL_DB");
} catch (PDOException $e) {
    error_msg("Failed to connect to MySQL: " . $e->getMessage());
    exit(1);
}

// Check if export files exist
if (!is_dir($exportDir)) {
    error_msg("Export directory not found: $exportDir");
    error_msg("Please run export-only.php first and copy the exports/ folder here.");
    exit(1);
}

log_msg("");

// Import Users
$usersFile = $exportDir . '/users.json';
if (file_exists($usersFile)) {
    log_msg("Importing users...");
    $users = json_decode(file_get_contents($usersFile), true);
    
    if ($users === null) {
        error_msg("Failed to parse users.json");
    } else {
        $tempPasswordHash = password_hash($TEMP_PASSWORD, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("
            INSERT INTO users (id, email, password_hash, created_at) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE email = email
        ");
        
        $imported = 0;
        $errors = 0;
        
        foreach ($users as $user) {
            try {
                $createdAt = isset($user['created_at']) 
                    ? date('Y-m-d H:i:s', strtotime($user['created_at']))
                    : date('Y-m-d H:i:s');
                
                $stmt->execute([
                    $user['id'],
                    $user['email'],
                    $tempPasswordHash,
                    $createdAt,
                ]);
                $imported++;
            } catch (PDOException $e) {
                $errors++;
                error_msg("  Failed to import user {$user['email']}: " . $e->getMessage());
            }
        }
        
        log_msg("  Imported $imported users" . ($errors > 0 ? " ($errors errors)" : ""));
    }
} else {
    log_msg("No users.json found, skipping users import");
}

// Import Products
$productsFile = $exportDir . '/products.json';
if (file_exists($productsFile)) {
    log_msg("Importing products...");
    $products = json_decode(file_get_contents($productsFile), true);
    
    if ($products === null) {
        error_msg("Failed to parse products.json");
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO products (id, user_id, name, price, stock, category, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                price = VALUES(price),
                stock = VALUES(stock),
                category = VALUES(category)
        ");
        
        $imported = 0;
        $errors = 0;
        
        foreach ($products as $product) {
            try {
                $createdAt = isset($product['created_at']) 
                    ? date('Y-m-d H:i:s', strtotime($product['created_at']))
                    : date('Y-m-d H:i:s');
                
                $stmt->execute([
                    $product['id'],
                    $product['user_id'],
                    $product['name'],
                    $product['price'] ?? 0,
                    $product['stock'] ?? 0,
                    $product['category'] ?? 'Other',
                    $createdAt,
                ]);
                $imported++;
            } catch (PDOException $e) {
                $errors++;
                error_msg("  Failed to import product {$product['name']}: " . $e->getMessage());
            }
        }
        
        log_msg("  Imported $imported products" . ($errors > 0 ? " ($errors errors)" : ""));
    }
} else {
    log_msg("No products.json found, skipping products import");
}

// Import Invoices
$invoicesFile = $exportDir . '/invoices.json';
if (file_exists($invoicesFile)) {
    log_msg("Importing invoices...");
    $invoices = json_decode(file_get_contents($invoicesFile), true);
    
    if ($invoices === null) {
        error_msg("Failed to parse invoices.json");
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO invoices (
                id, user_id, invoice_number, company_name, company_address, 
                company_phone, customer_name, issuer_name, subtotal, tax, 
                total, products, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE invoice_number = invoice_number
        ");
        
        $imported = 0;
        $errors = 0;
        
        foreach ($invoices as $invoice) {
            try {
                $createdAt = isset($invoice['created_at']) 
                    ? date('Y-m-d H:i:s', strtotime($invoice['created_at']))
                    : date('Y-m-d H:i:s');
                
                $products = $invoice['products'];
                if (is_array($products)) {
                    $products = json_encode($products);
                }
                
                $stmt->execute([
                    $invoice['id'],
                    $invoice['user_id'],
                    $invoice['invoice_number'],
                    $invoice['company_name'],
                    $invoice['company_address'] ?? null,
                    $invoice['company_phone'] ?? null,
                    $invoice['customer_name'],
                    $invoice['issuer_name'],
                    $invoice['subtotal'] ?? 0,
                    $invoice['tax'] ?? 0,
                    $invoice['total'] ?? 0,
                    $products,
                    $createdAt,
                ]);
                $imported++;
            } catch (PDOException $e) {
                $errors++;
                error_msg("  Failed to import invoice {$invoice['invoice_number']}: " . $e->getMessage());
            }
        }
        
        log_msg("  Imported $imported invoices" . ($errors > 0 ? " ($errors errors)" : ""));
    }
} else {
    log_msg("No invoices.json found, skipping invoices import");
}

log_msg("");
log_msg("========================================");
log_msg("Import Complete!");
log_msg("========================================");
log_msg("");
log_msg("⚠ IMPORTANT: All migrated users have the temporary password:");
log_msg("  Password: $TEMP_PASSWORD");
log_msg("  Users should change their password after first login.");
