<?php
/**
 * User Registration Endpoint
 * POST /api/auth/register.php
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

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Invalid email format');
}

// Validate password length
if (strlen($password) < 6) {
    errorResponse('Password must be at least 6 characters');
}

try {
    // Check if email already exists
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        errorResponse('Email already registered', 409);
    }
    
    // Create user
    $userId = generateUUID();
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$userId, $email, $passwordHash]);
    
    // Generate JWT token
    $token = createJWT([
        'id' => $userId,
        'email' => $email
    ]);
    
    jsonResponse([
        'user' => [
            'id' => $userId,
            'email' => $email
        ],
        'token' => $token
    ], 201);
    
} catch (PDOException $e) {
    errorResponse('Registration failed: ' . $e->getMessage(), 500);
}
