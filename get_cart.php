<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get session ID from query parameter
    if (!isset($_GET['session_id']) || empty(trim($_GET['session_id']))) {
        throw new Exception('Session ID is required');
    }
    
    $sessionId = trim($_GET['session_id']);
    
    // Connect to database
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Get cart items
    $query = "SELECT id, product_name, price, quantity, created_at, updated_at FROM cart WHERE session_id = :session_id ORDER BY updated_at DESC";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':session_id', $sessionId);
    $stmt->execute();
    
    $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate totals
    $totalItems = 0;
    $totalPrice = 0;
    
    foreach ($cartItems as &$item) {
        $item['price'] = floatval($item['price']);
        $item['quantity'] = intval($item['quantity']);
        $item['subtotal'] = $item['price'] * $item['quantity'];
        
        $totalItems += $item['quantity'];
        $totalPrice += $item['subtotal'];
    }
    
    echo json_encode([
        'success' => true,
        'cart_items' => $cartItems,
        'summary' => [
            'total_items' => $totalItems,
            'total_price' => $totalPrice,
            'item_count' => count($cartItems)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'cart_items' => [],
        'summary' => [
            'total_items' => 0,
            'total_price' => 0,
            'item_count' => 0
        ]
    ]);
    
    // Log error for debugging
    error_log('Get cart error: ' . $e->getMessage());
}
?>