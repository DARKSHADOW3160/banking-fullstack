// ==================== BANKING SYSTEM BACKEND ====================
// Node.js + Express + MySQL

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static('../frontend'));

// ==================== DATABASE CONNECTION ====================
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'banking_system',
    port: process.env.DB_PORT || 3306
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL database');
});

// ==================== HELPER FUNCTIONS ====================

// Generate transaction number
function generateTransactionNumber() {
    return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
}

// Send JSON response
function sendResponse(res, success, message, data = null) {
    res.json({
        success: success,
        message: message,
        data: data
    });
}

// ==================== API ROUTES ====================

// 1. LOGIN API
app.post('/api/login', (req, res) => {
    const { accountNumber, pin } = req.body;
    
    if (!accountNumber || !pin) {
        return sendResponse(res, false, 'Account number and PIN are required');
    }
    
    const query = 'SELECT account_number, account_holder_name, email, account_type, balance FROM accounts WHERE account_number = ? AND pin = ? AND status = "ACTIVE"';
    
    db.query(query, [accountNumber, pin], (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return sendResponse(res, false, 'Login failed');
        }
        
        if (results.length > 0) {
            const account = results[0];
            sendResponse(res, true, 'Login successful', {
                accountNumber: account.account_number,
                accountHolderName: account.account_holder_name,
                email: account.email,
                accountType: account.account_type,
                balance: parseFloat(account.balance)
            });
        } else {
            sendResponse(res, false, 'Invalid account number or PIN');
        }
    });
});

// 2. GET BALANCE API
app.get('/api/balance/:accountNumber', (req, res) => {
    const { accountNumber } = req.params;
    
    const query = 'SELECT balance FROM accounts WHERE account_number = ?';
    
    db.query(query, [accountNumber], (err, results) => {
        if (err) {
            return sendResponse(res, false, 'Failed to get balance');
        }
        
        if (results.length > 0) {
            sendResponse(res, true, 'Balance retrieved', {
                balance: parseFloat(results[0].balance)
            });
        } else {
            sendResponse(res, false, 'Account not found');
        }
    });
});

// 3. DEPOSIT MONEY API
app.post('/api/deposit', (req, res) => {
    const { accountNumber, amount, remarks } = req.body;
    
    if (!accountNumber || !amount || amount <= 0) {
        return sendResponse(res, false, 'Invalid input');
    }
    
    // Start transaction
    db.beginTransaction((err) => {
        if (err) {
            return sendResponse(res, false, 'Transaction failed');
        }
        
        // Get current balance
        db.query('SELECT balance FROM accounts WHERE account_number = ? FOR UPDATE', [accountNumber], (err, results) => {
            if (err || results.length === 0) {
                return db.rollback(() => {
                    sendResponse(res, false, 'Account not found');
                });
            }
            
            const currentBalance = parseFloat(results[0].balance);
            const newBalance = currentBalance + parseFloat(amount);
            
            // Update balance
            db.query('UPDATE accounts SET balance = ? WHERE account_number = ?', [newBalance, accountNumber], (err) => {
                if (err) {
                    return db.rollback(() => {
                        sendResponse(res, false, 'Failed to update balance');
                    });
                }
                
                // Insert transaction record
                const transactionNumber = generateTransactionNumber();
                const insertQuery = 'INSERT INTO transactions (transaction_number, account_number, transaction_type, amount, balance_after, remarks) VALUES (?, ?, ?, ?, ?, ?)';
                
                db.query(insertQuery, [transactionNumber, accountNumber, 'CREDIT', amount, newBalance, remarks || 'Cash Deposit'], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            sendResponse(res, false, 'Failed to record transaction');
                        });
                    }
                    
                    // Commit transaction
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                sendResponse(res, false, 'Transaction commit failed');
                            });
                        }
                        
                        sendResponse(res, true, `₹${amount} deposited successfully`, {
                            transactionNumber: transactionNumber,
                            newBalance: newBalance
                        });
                    });
                });
            });
        });
    });
});

// 4. WITHDRAW MONEY API
app.post('/api/withdraw', (req, res) => {
    const { accountNumber, amount, remarks } = req.body;
    
    if (!accountNumber || !amount || amount <= 0) {
        return sendResponse(res, false, 'Invalid input');
    }
    
    db.beginTransaction((err) => {
        if (err) {
            return sendResponse(res, false, 'Transaction failed');
        }
        
        db.query('SELECT balance FROM accounts WHERE account_number = ? FOR UPDATE', [accountNumber], (err, results) => {
            if (err || results.length === 0) {
                return db.rollback(() => {
                    sendResponse(res, false, 'Account not found');
                });
            }
            
            const currentBalance = parseFloat(results[0].balance);
            const withdrawAmount = parseFloat(amount);
            
            if (currentBalance < withdrawAmount) {
                return db.rollback(() => {
                    sendResponse(res, false, 'Insufficient balance');
                });
            }
            
            const newBalance = currentBalance - withdrawAmount;
            
            db.query('UPDATE accounts SET balance = ? WHERE account_number = ?', [newBalance, accountNumber], (err) => {
                if (err) {
                    return db.rollback(() => {
                        sendResponse(res, false, 'Failed to update balance');
                    });
                }
                
                const transactionNumber = generateTransactionNumber();
                const insertQuery = 'INSERT INTO transactions (transaction_number, account_number, transaction_type, amount, balance_after, remarks) VALUES (?, ?, ?, ?, ?, ?)';
                
                db.query(insertQuery, [transactionNumber, accountNumber, 'DEBIT', amount, newBalance, remarks || 'Cash Withdrawal'], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            sendResponse(res, false, 'Failed to record transaction');
                        });
                    }
                    
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                sendResponse(res, false, 'Transaction commit failed');
                            });
                        }
                        
                        sendResponse(res, true, `₹${amount} withdrawn successfully`, {
                            transactionNumber: transactionNumber,
                            newBalance: newBalance
                        });
                    });
                });
            });
        });
    });
});

// 5. FUND TRANSFER API
app.post('/api/transfer', (req, res) => {
    const { fromAccount, toAccount, amount, remarks } = req.body;
    
    if (!fromAccount || !toAccount || !amount || amount <= 0) {
        return sendResponse(res, false, 'Invalid input');
    }
    
    if (fromAccount === toAccount) {
        return sendResponse(res, false, 'Cannot transfer to same account');
    }
    
    db.beginTransaction((err) => {
        if (err) {
            return sendResponse(res, false, 'Transaction failed');
        }
        
        // Get both accounts
        db.query('SELECT account_number, balance, account_holder_name FROM accounts WHERE account_number IN (?, ?) FOR UPDATE', 
            [fromAccount, toAccount], (err, results) => {
            
            if (err || results.length !== 2) {
                return db.rollback(() => {
                    sendResponse(res, false, 'One or both accounts not found');
                });
            }
            
            const sender = results.find(acc => acc.account_number === fromAccount);
            const receiver = results.find(acc => acc.account_number === toAccount);
            
            if (!sender || !receiver) {
                return db.rollback(() => {
                    sendResponse(res, false, 'Invalid accounts');
                });
            }
            
            const senderBalance = parseFloat(sender.balance);
            const transferAmount = parseFloat(amount);
            
            if (senderBalance < transferAmount) {
                return db.rollback(() => {
                    sendResponse(res, false, 'Insufficient balance');
                });
            }
            
            const newSenderBalance = senderBalance - transferAmount;
            const newReceiverBalance = parseFloat(receiver.balance) + transferAmount;
            
            // Update sender balance
            db.query('UPDATE accounts SET balance = ? WHERE account_number = ?', [newSenderBalance, fromAccount], (err) => {
                if (err) {
                    return db.rollback(() => {
                        sendResponse(res, false, 'Failed to debit sender account');
                    });
                }
                
                // Update receiver balance
                db.query('UPDATE accounts SET balance = ? WHERE account_number = ?', [newReceiverBalance, toAccount], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            sendResponse(res, false, 'Failed to credit receiver account');
                        });
                    }
                    
                    const txnNumber1 = generateTransactionNumber();
                    const txnNumber2 = generateTransactionNumber();
                    
                    // Insert sender transaction
                    const query1 = 'INSERT INTO transactions (transaction_number, account_number, transaction_type, amount, balance_after, remarks) VALUES (?, ?, ?, ?, ?, ?)';
                    db.query(query1, [txnNumber1, fromAccount, 'DEBIT', amount, newSenderBalance, `Transfer to ${toAccount} - ${remarks || 'Fund Transfer'}`], (err) => {
                        if (err) {
                            return db.rollback(() => {
                                sendResponse(res, false, 'Failed to record sender transaction');
                            });
                        }
                        
                        // Insert receiver transaction
                        db.query(query1, [txnNumber2, toAccount, 'CREDIT', amount, newReceiverBalance, `Transfer from ${fromAccount} - ${remarks || 'Fund Transfer'}`], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    sendResponse(res, false, 'Failed to record receiver transaction');
                                });
                            }
                            
                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        sendResponse(res, false, 'Transaction commit failed');
                                    });
                                }
                                
                                sendResponse(res, true, `₹${amount} transferred to ${receiver.account_holder_name} successfully`, {
                                    transactionNumber: txnNumber1,
                                    newBalance: newSenderBalance,
                                    recipientName: receiver.account_holder_name
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// 6. GET TRANSACTION HISTORY API
app.get('/api/transactions/:accountNumber', (req, res) => {
    const { accountNumber } = req.params;
    const limit = req.query.limit || 50;
    
    const query = 'SELECT * FROM transactions WHERE account_number = ? ORDER BY created_at DESC LIMIT ?';
    
    db.query(query, [accountNumber, parseInt(limit)], (err, results) => {
        if (err) {
            return sendResponse(res, false, 'Failed to get transactions');
        }
        
        sendResponse(res, true, 'Transactions retrieved', results);
    });
});

// 7. GET ACCOUNT DETAILS API
app.get('/api/account/:accountNumber', (req, res) => {
    const { accountNumber } = req.params;
    
    const query = 'SELECT account_number, account_holder_name, email, phone, account_type, balance, status, created_at FROM accounts WHERE account_number = ?';
    
    db.query(query, [accountNumber], (err, results) => {
        if (err) {
            return sendResponse(res, false, 'Failed to get account details');
        }
        
        if (results.length > 0) {
            sendResponse(res, true, 'Account details retrieved', results[0]);
        } else {
            sendResponse(res, false, 'Account not found');
        }
    });
});

// ==================== TEST ROUTE ====================
app.get('/', (req, res) => {
    res.json({
        message: '🏦 Banking System API is running!',
        endpoints: {
            login: 'POST /api/login',
            deposit: 'POST /api/deposit',
            withdraw: 'POST /api/withdraw',
            transfer: 'POST /api/transfer',
            transactions: 'GET /api/transactions/:accountNumber',
            balance: 'GET /api/balance/:accountNumber',
            account: 'GET /api/account/:accountNumber'
        }
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`✅ Ready to accept requests\n`);
});

// Handle errors
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
});