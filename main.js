/**
 * ReadiFy - Main JavaScript File
 * =============================
 */

class ReadiFyApp {
    constructor() {
        this.cartItems = [];
        this.cartCount = 0;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCartFromDatabase();
        this.initScrollEffects();
        this.initAnimations();
    }

    setupEventListeners() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', this.handleSmoothScroll.bind(this));
        });

        // Header scroll effect
        window.addEventListener('scroll', this.handleHeaderScroll);

        // Page load animations
        window.addEventListener('DOMContentLoaded', this.initPageAnimations);

        // Mobile menu toggle (if needed)
        this.setupMobileMenu();
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    handleHeaderScroll() {
        const header = document.querySelector('header');
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    async addToCart(productName, price) {
        if (this.isLoading) return;
        
        const button = event.target;
        const originalText = button.textContent;
        
        try {
            this.isLoading = true;
            this.setButtonLoading(button, true);
            
            const response = await fetch('api/add_to_cart.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_name: productName,
                    price: price,
                    quantity: 1,
                    session_id: this.getSessionId()
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await this.handleAddToCartSuccess(result, productName, price, button);
            } else {
                throw new Error(result.message || 'Gagal menambahkan ke keranjang');
            }
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.handleAddToCartError(error.message, button);
        } finally {
            this.isLoading = false;
            setTimeout(() => {
                this.resetButton(button, originalText);
            }, 2000);
        }
    }

    async handleAddToCartSuccess(result, productName, price, button) {
        // Update local cart
        if (result.action === 'added') {
            this.cartItems.push({
                id: result.cart_id,
                name: productName,
                price: price,
                quantity: 1
            });
        }
        
        // Update cart count
        await this.updateCartCount();
        
        // Success feedback
        this.setButtonSuccess(button);
        this.showNotification(`${productName} berhasil ditambahkan ke keranjang!`, 'success');
        
        // Animate cart icon
        this.animateCartIcon();
    }

    handleAddToCartError(message, button) {
        this.setButtonError(button);
        this.showNotification(`Gagal menambahkan ke keranjang: ${message}`, 'error');
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.innerHTML = '<span class="loading"></span> Menambahkan...';
            button.disabled = true;
            button.classList.add('btn-disabled');
        }
    }

    setButtonSuccess(button) {
        button.textContent = 'Ditambahkan! ✓';
        button.className = button.className.replace('btn-primary', 'btn-success');
    }

    setButtonError(button) {
        button.textContent = 'Gagal! Coba Lagi';
        button.className = button.className.replace('btn-primary', 'btn-error');
    }

    resetButton(button, originalText) {
        button.textContent = originalText;
        button.disabled = false;
        button.className = button.className
            .replace('btn-success', 'btn-primary')
            .replace('btn-error', 'btn-primary')
            .replace('btn-disabled', '');
    }

    async loadCartFromDatabase() {
        try {
            const response = await fetch(`api/get_cart.php?session_id=${this.getSessionId()}`);
            const result = await response.json();
            
            if (result.success) {
                this.cartItems = result.cart_items || [];
                this.updateCartCountDisplay(result.summary.total_items);
            }
        } catch (error) {
            console.error('Error loading cart:', error);
        }
    }

    async updateCartCount() {
        try {
            const response = await fetch(`api/get_cart.php?session_id=${this.getSessionId()}`);
            const result = await response.json();
            
            if (result.success) {
                this.updateCartCountDisplay(result.summary.total_items);
            }
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }

    updateCartCountDisplay(count) {
        this.cartCount = count;
        const cartCountElement = document.getElementById('cartCount');
        if (cartCountElement) {
            cartCountElement.textContent = count;
            
            // Animate count change
            cartCountElement.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                cartCountElement.style.animation = '';
            }, 500);
        }
    }

    animateCartIcon() {
        const cartIcon = document.querySelector('.cart-icon');
        if (cartIcon) {
            cartIcon.style.animation = 'bounce 0.6s ease';
            setTimeout(() => {
                cartIcon.style.animation = '';
            }, 600);
        }
    }

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

    getSessionId() {
        let sessionId = this.getCookie('session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.setCookie('session_id', sessionId, 7);
        }
        return sessionId;
    }

    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    initScrollEffects() {
        // Intersection Observer for animations
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

        // Observe cards and sections
        document.querySelectorAll('.card, .category-card, section').forEach(el => {
            observer.observe(el);
        });
    }

    initAnimations() {
        // Stagger animations for grid items
        this.staggerAnimation('.product-grid .product-card', 100);
        this.staggerAnimation('.category-grid .category-card', 150);
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

    initPageAnimations() {
        // Hero section animation
        const heroElements = document.querySelectorAll('.hero h1, .hero p, .cta-button');
        heroElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.8s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, (index + 1) * 300);
        });
    }

    setupMobileMenu() {
        // Mobile menu functionality (if needed in future)
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            });
        }
    }

    // Utility methods
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.readiFyApp = new ReadiFyApp();
});

// Global functions for inline event handlers (backward compatibility)
function addToCart(productName, price) {
    if (window.readiFyApp) {
        window.readiFyApp.addToCart(productName, price);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadiFyApp;
}