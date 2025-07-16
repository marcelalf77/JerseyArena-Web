/**
 * ReadiFy - Admin Panel JavaScript
 * ===============================
 */
class AdminPanel {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.isLoading = false;
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.initScrollEffects();
        this.initAnimations();
    }

    setupEventListeners() {
        // Product management
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-add-product')) {
                this.showAddProductModal();
            }
            if (e.target.matches('.btn-edit-product')) {
                const productId = e.target.dataset.productId;
                this.showEditProductModal(productId);
            }
            if (e.target.matches('.btn-delete-product')) {
                const productId = e.target.dataset.productId;
                this.deleteProduct(productId);
            }
        });

        // Order management
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-update-status')) {
                const orderId = e.target.dataset.orderId;
                const status = e.target.dataset.status;
                this.updateOrderStatus(orderId, status);
            }
        });

        // Modal events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close') || e.target.matches('.modal-overlay')) {
                this.closeModal();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#productForm')) {
                e.preventDefault();
                this.saveProduct();
            }
        });

        // Search and filters with debounce (following main.js pattern)
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.searchProducts.bind(this), 300));
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', this.filterProducts.bind(this));
        }
    }

    async loadDashboardData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading();
            
            // Load dashboard statistics
            const statsResponse = await fetch('api/admin/get_stats.php');
            const statsData = await statsResponse.json();
            
            if (statsData.success) {
                this.updateDashboardStats(statsData.data);
            }

            // Load recent orders
            const ordersResponse = await fetch('api/admin/get_recent_orders.php');
            const ordersData = await ordersResponse.json();
            
            if (ordersData.success) {
                this.updateRecentOrders(ordersData.data);
            }

            // Load products
            await this.loadProducts();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Error loading dashboard data', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    updateDashboardStats(stats) {
        const elements = {
            totalProducts: document.getElementById('totalProducts'),
            totalOrders: document.getElementById('totalOrders'),
            totalRevenue: document.getElementById('totalRevenue'),
            totalCustomers: document.getElementById('totalCustomers')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key] && stats[key] !== undefined) {
                this.animateNumber(elements[key], stats[key]);
            }
        });
    }

    updateRecentOrders(orders) {
        const ordersContainer = document.getElementById('recentOrdersContainer');
        if (!ordersContainer) return;

        if (orders.length === 0) {
            ordersContainer.innerHTML = '<p class="no-data">No recent orders found</p>';
            return;
        }

        const ordersHTML = orders.map(order => `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div class="order-details">
                    <p><strong>Customer:</strong> ${order.customer_name}</p>
                    <p><strong>Total:</strong> ${this.formatCurrency(order.total)}</p>
                    <p><strong>Date:</strong> ${this.formatDate(order.created_at)}</p>
                </div>
                <div class="order-actions">
                    <button class="btn btn-sm btn-update-status" data-order-id="${order.id}" data-status="processing">
                        Mark Processing
                    </button>
                    <button class="btn btn-sm btn-update-status" data-order-id="${order.id}" data-status="shipped">
                        Mark Shipped
                    </button>
                    <button class="btn btn-sm btn-update-status" data-order-id="${order.id}" data-status="delivered">
                        Mark Delivered
                    </button>
                </div>
            </div>
        `).join('');

        ordersContainer.innerHTML = ordersHTML;
        
        // Apply stagger animation (following main.js pattern)
        this.staggerAnimation('.order-card', 100);
    }

    async loadProducts(page = 1, search = '', category = '') {
        try {
            const params = new URLSearchParams({
                page: page,
                limit: this.itemsPerPage,
                search: search,
                category: category
            });

            const response = await fetch(`api/admin/get_products.php?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderProducts(data.data);
                this.renderPagination(data.pagination);
            } else {
                this.showNotification(data.message || 'Error loading products', 'error');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Error loading products', 'error');
        }
    }

    renderProducts(products) {
        const productsContainer = document.getElementById('productsContainer');
        if (!productsContainer) return;

        if (products.length === 0) {
            productsContainer.innerHTML = '<p class="no-data">No products found</p>';
            return;
        }

        const productsHTML = products.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image || 'assets/images/no-image.png'}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category}</p>
                    <p class="product-price">${this.formatCurrency(product.price)}</p>
                    <p class="product-stock">Stock: ${product.stock}</p>
                    <div class="product-status">
                        <span class="status-badge status-${product.status.toLowerCase()}">${product.status}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-edit-product" data-product-id="${product.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-product" data-product-id="${product.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        productsContainer.innerHTML = productsHTML;
        
        // Apply stagger animation (following main.js pattern)
        this.staggerAnimation('.product-card', 100);
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer || !pagination) return;

        const { current_page, total_pages, has_prev, has_next } = pagination;
        
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (has_prev) {
            paginationHTML += `<button class="btn-page" data-page="${current_page - 1}">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= total_pages; i++) {
            const activeClass = i === current_page ? 'active' : '';
            paginationHTML += `<button class="btn-page ${activeClass}" data-page="${i}">${i}</button>`;
        }
        
        // Next button
        if (has_next) {
            paginationHTML += `<button class="btn-page" data-page="${current_page + 1}">Next</button>`;
        }
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;

        // Add pagination event listeners
        paginationContainer.addEventListener('click', (e) => {
            if (e.target.matches('.btn-page')) {
                const page = parseInt(e.target.dataset.page);
                this.currentPage = page;
                this.loadProducts(page);
            }
        });
    }

    async showAddProductModal() {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const modalTitle = document.getElementById('modalTitle');
        
        if (!modal || !form) return;

        modalTitle.textContent = 'Add New Product';
        form.reset();
        form.dataset.mode = 'add';
        delete form.dataset.productId;
        
        this.showModal(modal);
    }

    async showEditProductModal(productId) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const modalTitle = document.getElementById('modalTitle');
        
        if (!modal || !form) return;

        try {
            this.showLoading();
            
            const response = await fetch(`api/admin/get_product.php?id=${productId}`);
            const data = await response.json();
            
            if (data.success) {
                const product = data.data;
                
                modalTitle.textContent = 'Edit Product';
                form.dataset.mode = 'edit';
                form.dataset.productId = productId;
                
                // Populate form fields
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price || '';
                document.getElementById('productStock').value = product.stock || '';
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('productStatus').value = product.status || 'active';
                
                this.showModal(modal);
            } else {
                this.showNotification(data.message || 'Error loading product', 'error');
            }
        } catch (error) {
            console.error('Error loading product:', error);
            this.showNotification('Error loading product', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async saveProduct() {
        if (this.isLoading) return;
        
        const form = document.getElementById('productForm');
        if (!form) return;

        const formData = new FormData(form);
        const mode = form.dataset.mode;
        const productId = form.dataset.productId;

        try {
            this.isLoading = true;
            this.showLoading();
            
            let endpoint = 'api/admin/add_product.php';
            if (mode === 'edit' && productId) {
                endpoint = 'api/admin/update_product.php';
                formData.append('id', productId);
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message || 'Product saved successfully', 'success');
                this.closeModal();
                this.loadProducts(this.currentPage);
                this.loadDashboardData(); // Refresh stats
            } else {
                this.showNotification(data.message || 'Error saving product', 'error');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            this.showNotification('Error saving product', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch('api/admin/delete_product.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: productId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message || 'Product deleted successfully', 'success');
                this.loadProducts(this.currentPage);
                this.loadDashboardData(); // Refresh stats
            } else {
                this.showNotification(data.message || 'Error deleting product', 'error');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showNotification('Error deleting product', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            this.showLoading();
            
            const response = await fetch('api/admin/update_order_status.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    order_id: orderId, 
                    status: status 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message || 'Order status updated successfully', 'success');
                this.loadDashboardData(); // Refresh recent orders
            } else {
                this.showNotification(data.message || 'Error updating order status', 'error');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showNotification('Error updating order status', 'error');
        } finally {
            this.hideLoading();
        }
    }

    searchProducts() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        this.currentPage = 1;
        this.loadProducts(1, searchTerm);
    }

    filterProducts() {
        const categoryFilter = document.getElementById('categoryFilter');
        const category = categoryFilter ? categoryFilter.value : '';
        this.currentPage = 1;
        this.loadProducts(1, '', category);
    }

    // Modal management (following main.js pattern)
    showModal(modal) {
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.classList.remove('modal-open');
    }

    // Loading management (following main.js pattern)
    showLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('active');
        }
    }

    hideLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.remove('active');
        }
    }

    // Notification system (following main.js pattern)
    showNotification(message, type = 'success') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        const bgColor = type === 'success' ? 
            'var(--success-gradient)' : 
            'var(--error-gradient)';
            
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 2rem;
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.5s ease;
            max-width: 300px;
            font-weight: 500;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    // Animation utilities (following main.js pattern)
    initScrollEffects() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
                }
            });
        }, observerOptions);

        // Observe admin cards and sections
        document.querySelectorAll('.card, .stats-card, .admin-section').forEach(el => {
            observer.observe(el);
        });
    }

    initAnimations() {
        // Stagger animations for admin elements
        this.staggerAnimation('.stats-grid .stats-card', 100);
        this.staggerAnimation('.admin-grid .admin-card', 150);
    }

    staggerAnimation(selector, delay) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.6s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * delay);
        });
    }

    // Utility methods (following main.js pattern)
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('id-ID').format(number);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    animateNumber(element, targetNumber) {
        if (!element) return;
        
        const startNumber = 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * progress);
            element.textContent = this.formatNumber(currentNumber);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
}

// Initialize admin panel when DOM is loaded (following main.js pattern)
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});

// Global functions for inline event handlers (backward compatibility)
function updateOrderStatus(orderId, status) {
    if (window.adminPanel) {
        window.adminPanel.updateOrderStatus(orderId, status);
    }
}

function editProduct(productId) {
    if (window.adminPanel) {
        window.adminPanel.showEditProductModal(productId);
    }
}

function deleteProduct(productId) {
    if (window.adminPanel) {
        window.adminPanel.deleteProduct(productId);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPanel;
}