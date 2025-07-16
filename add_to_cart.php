<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include_once '../includes/db.php';

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($input['product_name']) || !isset($input['price']) || !isset($input['session_id'])) {
        throw new Exception('Missing required fields');
    }
    
    $productName = trim($input['product_name']);
    $price = floatval($input['price']);
    $quantity = isset($input['quantity']) ? intval($input['quantity']) : 1;
    $sessionId = trim($input['session_id']);
    
    // Validate data
    if (empty($productName) || $price <= 0 || $quantity <= 0 || empty($sessionId)) {
        throw new Exception('Invalid input data');
    }
    
    // Connect to database
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Check if item already exists in cart
    $checkQuery = "SELECT id, quantity FROM cart WHERE session_id = :session_id AND product_name = :product_name";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':session_id', $sessionId);
    $checkStmt->bindParam(':product_name', $productName);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() > 0) {
        // Update existing item
        $existingItem = $checkStmt->fetch(PDO::FETCH_ASSOC);
        $newQuantity = $existingItem['quantity'] + $quantity;
        
        $updateQuery = "UPDATE cart SET quantity = :quantity, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->bindParam(':quantity', $newQuantity);
        $updateStmt->bindParam(':id', $existingItem['id']);
        
        if ($updateStmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Item quantity updated successfully',
                'cart_id' => $existingItem['id'],
                'action' => 'updated'
            ]);
        } else {
            throw new Exception('Failed to update cart item');
        }
    } else {
        // Add new item
        $insertQuery = "INSERT INTO cart (session_id, product_name, price, quantity) VALUES (:session_id, :product_name, :price, :quantity)";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->bindParam(':session_id', $sessionId);
        $insertStmt->bindParam(':product_name', $productName);
        $insertStmt->bindParam(':price', $price);
        $insertStmt->bindParam(':quantity', $quantity);
        
        if ($insertStmt->execute()) {
            $cartId = $db->lastInsertId();
            echo json_encode([
                'success' => true,
                'message' => 'Item added to cart successfully',
                'cart_id' => $cartId,
                'action' => 'added'
            ]);
        } else {
            throw new Exception('Failed to add item to cart');
        }
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    
    // Log error for debugging
    error_log('Add to cart error: ' . $e->getMessage());
}
?>