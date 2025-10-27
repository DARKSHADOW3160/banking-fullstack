// ==================== BANKING SYSTEM - FRONTEND LOGIC ====================

// API Base URL
const API_URL = 'http://localhost:3000/api';

// Global Variables
let currentAccount = null;

// ==================== INITIALIZATION ====================

// Check if user is logged in
window.addEventListener('load', () => {
    const accountData = localStorage.getItem('accountData');
    
    if (!accountData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentAccount = JSON.parse(accountData);
    loadDashboard();
});

// Load Dashboard Data
function loadDashboard() {
    // Display account info
    document.getElementById('accountHolderName').textContent = currentAccount.accountHolderName;
    document.getElementById('accountNumber').textContent = currentAccount.accountNumber;
    document.getElementById('accountType').textContent = currentAccount.accountType;
    document.getElementById('accountBalance').textContent = formatCurrency(currentAccount.balance);
    
    // Load transactions
    loadTransactions();
    
    // Show history section by default
    showSection('history');
}

// ==================== SECTION MANAGEMENT ====================

function showSection(section) {
    // Hide all sections
    document.getElementById('depositSection').style.display = 'none';
    document.getElementById('withdrawSection').style.display = 'none';
    document.getElementById('transferSection').style.display = 'none';
    document.getElementById('historySection').style.display = 'none';
    
    // Show selected section
    document.getElementById(section + 'Section').style.display = 'block';
    
    // Load transactions if history section
    if (section === 'history') {
        loadTransactions();
    }
}

// ==================== DEPOSIT MONEY ====================

document.getElementById('depositForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const remarks = document.getElementById('depositRemarks').value || 'Cash Deposit';
    
    if (amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountNumber: currentAccount.accountNumber,
                amount: amount,
                remarks: remarks
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Update balance
            currentAccount.balance = result.data.newBalance;
            localStorage.setItem('accountData', JSON.stringify(currentAccount));
            document.getElementById('accountBalance').textContent = formatCurrency(currentAccount.balance);
            
            // Reset form
            this.reset();
            
            // Reload transactions
            setTimeout(() => {
                loadTransactions();
            }, 1000);
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showToast('Server error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
});

// ==================== WITHDRAW MONEY ====================

document.getElementById('withdrawForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const remarks = document.getElementById('withdrawRemarks').value || 'Cash Withdrawal';
    
    if (amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > currentAccount.balance) {
        showToast('Insufficient balance!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountNumber: currentAccount.accountNumber,
                amount: amount,
                remarks: remarks
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Update balance
            currentAccount.balance = result.data.newBalance;
            localStorage.setItem('accountData', JSON.stringify(currentAccount));
            document.getElementById('accountBalance').textContent = formatCurrency(currentAccount.balance);
            
            // Reset form
            this.reset();
            
            // Reload transactions
            setTimeout(() => {
                loadTransactions();
            }, 1000);
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Withdraw error:', error);
        showToast('Server error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
});

// ==================== FUND TRANSFER ====================

document.getElementById('transferForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const toAccount = document.getElementById('toAccount').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const remarks = document.getElementById('transferRemarks').value || 'Fund Transfer';
    
    if (!toAccount) {
        showToast('Please enter recipient account number', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (toAccount === currentAccount.accountNumber) {
        showToast('Cannot transfer to same account!', 'error');
        return;
    }
    
    if (amount > currentAccount.balance) {
        showToast('Insufficient balance!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromAccount: currentAccount.accountNumber,
                toAccount: toAccount,
                amount: amount,
                remarks: remarks
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Update balance
            currentAccount.balance = result.data.newBalance;
            localStorage.setItem('accountData', JSON.stringify(currentAccount));
            document.getElementById('accountBalance').textContent = formatCurrency(currentAccount.balance);
            
            // Reset form
            this.reset();
            
            // Reload transactions
            setTimeout(() => {
                loadTransactions();
            }, 1000);
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Server error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
});

// ==================== LOAD TRANSACTIONS ====================

async function loadTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    
    transactionsList.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading transactions...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_URL}/transactions/${currentAccount.accountNumber}`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            let html = '';
            
            result.data.forEach(txn => {
                const isCredit = txn.transaction_type === 'CREDIT';
                const icon = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
                const colorClass = isCredit ? 'credit' : 'debit';
                const sign = isCredit ? '+' : '-';
                const date = new Date(txn.created_at).toLocaleString('en-IN');
                
                html += `
                    <div class="transaction-item">
                        <div class="d-flex align-items-center">
                            <div class="transaction-icon ${colorClass} me-3">
                                <i class="fas ${icon}"></i>
                            </div>
                            <div class="flex-grow-1">
                                <strong>${txn.remarks}</strong>
                                <br>
                                <small class="text-muted">
                                    ${date} | ${txn.transaction_number}
                                </small>
                            </div>
                            <div class="text-end">
                                <div class="transaction-${colorClass} fs-5">
                                    ${sign}₹${formatCurrency(txn.amount)}
                                </div>
                                <small class="text-muted">Balance: ₹${formatCurrency(txn.balance_after)}</small>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            transactionsList.innerHTML = html;
        } else {
            transactionsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No transactions yet</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load transactions error:', error);
        transactionsList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                <p class="text-danger">Failed to load transactions</p>
                <button class="btn btn-primary btn-sm" onclick="loadTransactions()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ==================== REFRESH BALANCE ====================

async function refreshBalance() {
    const balanceElement = document.getElementById('accountBalance');
    balanceElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const response = await fetch(`${API_URL}/balance/${currentAccount.accountNumber}`);
        const result = await response.json();
        
        if (result.success) {
            currentAccount.balance = result.data.balance;
            localStorage.setItem('accountData', JSON.stringify(currentAccount));
            balanceElement.textContent = formatCurrency(currentAccount.balance);
            showToast('Balance refreshed', 'success');
        } else {
            balanceElement.textContent = formatCurrency(currentAccount.balance);
            showToast('Failed to refresh balance', 'error');
        }
    } catch (error) {
        console.error('Refresh balance error:', error);
        balanceElement.textContent = formatCurrency(currentAccount.balance);
        showToast('Server error', 'error');
    }
}

// ==================== LOGOUT ====================

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('accountData');
        window.location.href = 'index.html';
    }
}

// ==================== HELPER FUNCTIONS ====================

// Format currency properly
function formatCurrency(amount) {
  return parseFloat(amount)
    .toFixed(2)
    .replace(/\d(?=(\d{3})+\.)/g, '$&,');
}


// Show toast notification
function showToast(message, type) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.classList.add('success');
        toast.classList.remove('error');
        toastIcon.className = 'fas fa-check-circle';
    } else {
        toast.classList.add('error');
        toast.classList.remove('success');
        toastIcon.className = 'fas fa-exclamation-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show/Hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// ==================== ERROR HANDLING ====================

// Handle network errors
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('No internet connection', 'error');
});

// Log all errors
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.message);
});