<?php
/**
 * Supabase to MySQL Migration Script
 * 
 * This script exports data from Supabase and imports it into MySQL.
 * 
 * Usage:
 * 1. Update the configuration below with your Supabase and MySQL credentials
 * 2. Run: php supabase-to-mysql.php
 * 
 * Note: User passwords cannot be migrated from Supabase Auth.
 * Users will need to register again or use password reset.
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// Supabase Configuration
$SUPABASE_URL = 'https://your-project.supabase.co';
$SUPABASE_SERVICE_KEY = 'your-service-role-key'; // Use service role key for full access

// MySQL Configuration
$MYSQL_HOST = 'localhost';
$MYSQL_DB = 'pos_database';
$MYSQL_USER = 'root';
$MYSQL_PASS = '';

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

class MigrationScript {
    private $supabaseUrl;
    private $supabaseKey;
    private $pdo;
    private $stats = [
        'users' => ['exported' => 0, 'imported' => 0, 'errors' => 0],
        'products' => ['exported' => 0, 'imported' => 0, 'errors' => 0],
        'invoices' => ['exported' => 0, 'imported' => 0, 'errors' => 0],
    ];

    public function __construct($supabaseUrl, $supabaseKey, $mysqlHost, $mysqlDb, $mysqlUser, $mysqlPass) {
        $this->supabaseUrl = rtrim($supabaseUrl, '/');
        $this->supabaseKey = $supabaseKey;

        // Connect to MySQL
        try {
            $dsn = "mysql:host=$mysqlHost;dbname=$mysqlDb;charset=utf8mb4";
            $this->pdo = new PDO($dsn, $mysqlUser, $mysqlPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->log("✓ Connected to MySQL database: $mysqlDb");
        } catch (PDOException $e) {
            $this->error("Failed to connect to MySQL: " . $e->getMessage());
            exit(1);
        }
    }

    private function log($message) {
        echo date('[Y-m-d H:i:s] ') . $message . PHP_EOL;
    }

    private function error($message) {
        echo date('[Y-m-d H:i:s] ') . "ERROR: $message" . PHP_EOL;
    }

    private function supabaseRequest($endpoint, $method = 'GET', $body = null) {
        $url = $this->supabaseUrl . '/rest/v1/' . $endpoint;
        
        $headers = [
            'apikey: ' . $this->supabaseKey,
            'Authorization: Bearer ' . $this->supabaseKey,
            'Content-Type: application/json',
            'Prefer: return=representation',
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: $error");
        }

        if ($httpCode >= 400) {
            throw new Exception("Supabase API error ($httpCode): $response");
        }

        return json_decode($response, true);
    }

    private function supabaseAuthRequest($endpoint) {
        $url = $this->supabaseUrl . '/auth/v1/' . $endpoint;
        
        $headers = [
            'apikey: ' . $this->supabaseKey,
            'Authorization: Bearer ' . $this->supabaseKey,
            'Content-Type: application/json',
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: $error");
        }

        if ($httpCode >= 400) {
            throw new Exception("Supabase Auth API error ($httpCode): $response");
        }

        return json_decode($response, true);
    }

    public function exportUsers() {
        $this->log("Exporting users from Supabase Auth...");
        
        try {
            // Get users from Supabase Auth Admin API
            $users = $this->supabaseAuthRequest('admin/users');
            
            if (isset($users['users'])) {
                $this->stats['users']['exported'] = count($users['users']);
                $this->log("  Found " . count($users['users']) . " users");
                return $users['users'];
            }
            
            return [];
        } catch (Exception $e) {
            $this->error("Failed to export users: " . $e->getMessage());
            return [];
        }
    }

    public function exportProducts() {
        $this->log("Exporting products from Supabase...");
        
        try {
            $products = $this->supabaseRequest('products?select=*');
            $this->stats['products']['exported'] = count($products);
            $this->log("  Found " . count($products) . " products");
            return $products;
        } catch (Exception $e) {
            $this->error("Failed to export products: " . $e->getMessage());
            return [];
        }
    }

    public function exportInvoices() {
        $this->log("Exporting invoices from Supabase...");
        
        try {
            $invoices = $this->supabaseRequest('invoices?select=*');
            $this->stats['invoices']['exported'] = count($invoices);
            $this->log("  Found " . count($invoices) . " invoices");
            return $invoices;
        } catch (Exception $e) {
            $this->error("Failed to export invoices: " . $e->getMessage());
            return [];
        }
    }

    public function importUsers($users) {
        $this->log("Importing users to MySQL...");
        
        // Generate a temporary password for all migrated users
        $tempPasswordHash = password_hash('ChangeMe123!', PASSWORD_DEFAULT);
        
        $stmt = $this->pdo->prepare("
            INSERT INTO users (id, email, password_hash, created_at) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE email = email
        ");

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
                $this->stats['users']['imported']++;
            } catch (PDOException $e) {
                $this->stats['users']['errors']++;
                $this->error("  Failed to import user {$user['email']}: " . $e->getMessage());
            }
        }

        $this->log("  Imported {$this->stats['users']['imported']} users");
        $this->log("  ⚠ All users have temporary password: ChangeMe123!");
    }

    public function importProducts($products) {
        $this->log("Importing products to MySQL...");
        
        $stmt = $this->pdo->prepare("
            INSERT INTO products (id, user_id, name, price, stock, category, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                price = VALUES(price),
                stock = VALUES(stock),
                category = VALUES(category)
        ");

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
                $this->stats['products']['imported']++;
            } catch (PDOException $e) {
                $this->stats['products']['errors']++;
                $this->error("  Failed to import product {$product['name']}: " . $e->getMessage());
            }
        }

        $this->log("  Imported {$this->stats['products']['imported']} products");
    }

    public function importInvoices($invoices) {
        $this->log("Importing invoices to MySQL...");
        
        $stmt = $this->pdo->prepare("
            INSERT INTO invoices (
                id, user_id, invoice_number, company_name, company_address, 
                company_phone, customer_name, issuer_name, subtotal, tax, 
                total, products, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE invoice_number = invoice_number
        ");

        foreach ($invoices as $invoice) {
            try {
                $createdAt = isset($invoice['created_at']) 
                    ? date('Y-m-d H:i:s', strtotime($invoice['created_at']))
                    : date('Y-m-d H:i:s');
                
                // Handle products - could be array or JSON string
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
                $this->stats['invoices']['imported']++;
            } catch (PDOException $e) {
                $this->stats['invoices']['errors']++;
                $this->error("  Failed to import invoice {$invoice['invoice_number']}: " . $e->getMessage());
            }
        }

        $this->log("  Imported {$this->stats['invoices']['imported']} invoices");
    }

    public function run() {
        $this->log("========================================");
        $this->log("Supabase to MySQL Migration");
        $this->log("========================================");
        $this->log("");

        // Test Supabase connection
        $this->log("Testing Supabase connection...");
        try {
            $this->supabaseRequest('products?limit=1');
            $this->log("✓ Supabase connection successful");
        } catch (Exception $e) {
            $this->error("Cannot connect to Supabase: " . $e->getMessage());
            $this->log("Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY");
            exit(1);
        }

        $this->log("");

        // Export data
        $users = $this->exportUsers();
        $products = $this->exportProducts();
        $invoices = $this->exportInvoices();

        $this->log("");

        // Import data
        if (!empty($users)) {
            $this->importUsers($users);
        }
        
        if (!empty($products)) {
            $this->importProducts($products);
        }
        
        if (!empty($invoices)) {
            $this->importInvoices($invoices);
        }

        // Summary
        $this->log("");
        $this->log("========================================");
        $this->log("Migration Summary");
        $this->log("========================================");
        $this->log("");
        
        foreach ($this->stats as $table => $counts) {
            $this->log(ucfirst($table) . ":");
            $this->log("  Exported: {$counts['exported']}");
            $this->log("  Imported: {$counts['imported']}");
            if ($counts['errors'] > 0) {
                $this->log("  Errors: {$counts['errors']}");
            }
        }

        $this->log("");
        $this->log("========================================");
        $this->log("Migration Complete!");
        $this->log("========================================");
        
        if ($this->stats['users']['imported'] > 0) {
            $this->log("");
            $this->log("⚠ IMPORTANT: All migrated users have the temporary password:");
            $this->log("  Password: ChangeMe123!");
            $this->log("  Users should change their password after first login.");
        }
    }
}

// Run migration
$migration = new MigrationScript(
    $SUPABASE_URL,
    $SUPABASE_SERVICE_KEY,
    $MYSQL_HOST,
    $MYSQL_DB,
    $MYSQL_USER,
    $MYSQL_PASS
);

$migration->run();
