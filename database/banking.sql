-- ==================== BANKING SYSTEM DATABASE ====================
-- Copy this entire file and run in MySQL/phpMyAdmin

-- Create Database
CREATE DATABASE IF NOT EXISTS banking_system;
USE banking_system;

-- Drop existing tables (if any)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;

-- ==================== TABLES ====================

-- 1. Accounts Table
CREATE TABLE accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    account_type ENUM('SAVINGS', 'CURRENT') DEFAULT 'SAVINGS',
    balance DECIMAL(15, 2) DEFAULT 0.00,
    pin VARCHAR(4) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_number (account_number),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Transactions Table
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_number VARCHAR(30) UNIQUE NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    transaction_type ENUM('CREDIT', 'DEBIT') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    remarks VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_number) REFERENCES accounts(account_number) ON DELETE CASCADE,
    INDEX idx_account_number (account_number),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== SAMPLE DATA ====================

-- Insert Sample Accounts
INSERT INTO accounts (account_number, account_holder_name, email, phone, account_type, balance, pin) VALUES
('ACC1001', 'Rahul Kumar', 'rahul@example.com', '9876543210', 'SAVINGS', 50000.00, '1234'),
('ACC1002', 'Priya Sharma', 'priya@example.com', '9876543211', 'CURRENT', 75000.00, '5678'),
('ACC1003', 'Amit Singh', 'amit@example.com', '9876543212', 'SAVINGS', 30000.00, '9999');

-- Insert Initial Transactions
INSERT INTO transactions (transaction_number, account_number, transaction_type, amount, balance_after, remarks) VALUES
('TXN' + UNIX_TIMESTAMP() + '001', 'ACC1001', 'CREDIT', 50000.00, 50000.00, 'Initial Deposit'),
('TXN' + UNIX_TIMESTAMP() + '002', 'ACC1002', 'CREDIT', 75000.00, 75000.00, 'Initial Deposit'),
('TXN' + UNIX_TIMESTAMP() + '003', 'ACC1003', 'CREDIT', 30000.00, 30000.00, 'Initial Deposit');

-- ==================== SUCCESS MESSAGE ====================
SELECT 'Database setup complete! 3 accounts created.' AS Message;