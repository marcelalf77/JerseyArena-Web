<?php
// Database configuration
class Database {
    private $host = 'localhost';
    private $db_name = 'readify_shop';
    private $username = 'root';
    private $password = '';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
            );
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}

// Create database and tables if they don't exist
function initializeDatabase() {
    try {
        // Connect without database first
        $pdo = new PDO("mysql:host=localhost", 'root', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS readify_shop CHARACTER SET utf8 COLLATE utf8_general_ci");
        $pdo->exec("USE readify_shop");
        
        // Create cart table
        $createCartTable = "
        CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(100) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            quantity INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        $pdo->exec($createCartTable);
        
        // Create products table for future use
        $createProductsTable = "
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(100),
            image_url VARCHAR(255),
            stock INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        
        $pdo->exec($createProductsTable);
        
        // Insert sample products if table is empty
        $checkProducts = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
        if ($checkProducts == 0) {
            $insertProducts = "
            INSERT INTO products (name, description, price, category, stock) VALUES 
            ('Kaos Premium Cotton', 'Kaos berkualitas tinggi dari bahan cotton premium', 149000, 'Fashion', 50),
            ('Smartphone Terbaru', 'Smartphone dengan teknologi terdepan dan fitur lengkap', 2999000, 'Elektronik', 25),
            ('Sepatu Sport Premium', 'Sepatu olahraga dengan kualitas premium untuk aktivitas harian', 899000, 'Fashion', 30),
            ('Headphone Wireless', 'Headphone nirkabel dengan kualitas suara jernih', 499000, 'Elektronik', 40)
            ";
            $pdo->exec($insertProducts);
        }
        
        return true;
    } catch(PDOException $e) {
        error_log("Database initialization error: " . $e->getMessage());
        return false;
    }
}

// Initialize database on first load
initializeDatabase();
?>