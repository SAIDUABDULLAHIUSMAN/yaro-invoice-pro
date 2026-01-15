<?php
/**
 * User Login Endpoint
 * POST /api/auth/login.php
 * Body: { email, password }
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$input = getJsonInput();

// Validate input
if (empty($input['email']) || empty($input['password'])) {
    errorResponse('Email and password are required');
}

$email = strtolower(trim($input['email']));
$password = $input['password'];

try {
    // Find user by email
    $stmt = $pdo->prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        errorResponse('Invalid email or password', 401);
    }
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        errorResponse('Invalid email or password', 401);
    }
    
    // Generate JWT token
    $token = createJWT([
        'id' => $user['id'],
        'email' => $user['email']
    ]);
    
    jsonResponse([
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ],
        'token' => $token
    ]);
    
} catch (PDOException $e) {
    errorResponse('Login failed: ' . $e->getMessage(), 500);
}
