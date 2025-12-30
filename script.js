// Pentoria Marketplace - Enhanced JavaScript Functionality

// Global State
let currentUser = null;
let cart = [];
let products = [];
let filteredProducts = [];

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check for logged in user
    checkLoggedInUser();
    
    // Load products
    loadProducts();
    
    // Load cart
    loadCart();
    
    // Initialize sample products if empty
    initializeSampleProducts();
    
    // Display products based on current page
    if (document.getElementById('productsGrid')) {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category) {
            filterByCategory(category);
        } else {
            displayProducts(products.slice(0, 6)); // Show first 6 on home page
        }
    }
    
    // Update cart count
    updateCartCount();
    
    // Setup register type change listener
    setupRegisterTypeListener();
    
    // Load profile page if on profile page
    if (document.getElementById('profileNameDisplay')) {
        loadProfileData();
    }
    
    // Load cart page if on cart page
    if (document.querySelector('.cart-page')) {
        displayCartPage();
    }
    
    // Load dashboard if on dashboard page
    if (document.querySelector('.dashboard-page')) {
        loadDashboard();
    }
}

// Security Functions
function hashPassword(password) {
    // Simple hash function (in production, use bcrypt on server)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

function sanitizeInput(input) {
    // SQL Injection protection - basic sanitization
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
        .replace(/[<>]/g, '')
        .replace(/['"]/g, '')
        .replace(/;/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .trim();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    // Nigerian phone number format
    const re = /^(\+234|0)?[789]\d{9}$/;
    return re.test(phone.replace(/\s/g, ''));
}

// Notification System
function showNotification(type, title, message, duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${iconMap[type]}"></i>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="removeNotification(this)">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        removeNotification(notification.querySelector('.notification-close'));
    }, duration);
}

function removeNotification(button) {
    const notification = button.closest('.notification');
    notification.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => {
        notification.remove();
    }, 300);
}

// User Authentication Functions
function setupRegisterTypeListener() {
    const registerType = document.getElementById('registerType');
    if (registerType) {
        registerType.addEventListener('change', toggleBusinessNameField);
    }
}

function toggleBusinessNameField() {
    const registerType = document.getElementById('registerType');
    const businessNameGroup = document.getElementById('businessNameGroup');
    
    if (registerType && registerType.value === 'seller') {
        businessNameGroup.style.display = 'block';
        document.getElementById('registerBusinessName').required = true;
    } else {
        businessNameGroup.style.display = 'none';
        document.getElementById('registerBusinessName').required = false;
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = sanitizeInput(document.getElementById('registerName').value);
    const email = sanitizeInput(document.getElementById('registerEmail').value);
    const phone = sanitizeInput(document.getElementById('registerPhone').value);
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const accountType = document.getElementById('registerType').value;
    const businessName = accountType === 'seller' ? sanitizeInput(document.getElementById('registerBusinessName').value) : null;
    const profilePicFile = document.getElementById('registerProfilePic').files[0];
    
    // Validation
    if (!validateEmail(email)) {
        showNotification('error', 'Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    if (!validatePhone(phone)) {
        showNotification('error', 'Invalid Phone', 'Please enter a valid Nigerian phone number');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('error', 'Password Mismatch', 'Passwords do not match!');
        return;
    }
    
    if (password.length < 6) {
        showNotification('error', 'Weak Password', 'Password must be at least 6 characters');
        return;
    }
    
    if (accountType === 'seller' && !businessName) {
        showNotification('error', 'Business Name Required', 'Please enter your business name');
        return;
    }
    
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('pentoriaUsers')) || [];
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
        showNotification('error', 'User Exists', 'User with this email already exists!');
        return;
    }
    
    // Handle profile picture
    const processRegistration = (profilePicData) => {
        // Hash password
        const hashedPassword = hashPassword(password);
        
        // Create new user
        const newUser = {
            id: Date.now(),
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword,
            accountType: accountType,
            businessName: businessName,
            profilePicture: profilePicData,
            createdAt: new Date().toISOString(),
            products: [],
            views: 0,
            orders: 0,
            rating: 4.5,
            preferences: {
                emailNotifications: true,
                smsNotifications: false,
                orderUpdates: true,
                promotionalEmails: false,
                language: 'en',
                currency: 'NGN'
            }
        };
        
        users.push(newUser);
        localStorage.setItem('pentoriaUsers', JSON.stringify(users));
        
        showNotification('success', 'Registration Successful', 'Your account has been created! Please login to continue.');
        closeModal('register');
        showModal('login');
        
        // Clear form
        event.target.reset();
    };
    
    if (profilePicFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            processRegistration(e.target.result);
        };
        reader.readAsDataURL(profilePicFile);
    } else {
        processRegistration(null);
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = sanitizeInput(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPassword').value;
    
    // Validation
    if (!validateEmail(email)) {
        showNotification('error', 'Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    // Hash the password for comparison
    const hashedPassword = hashPassword(password);
    
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('pentoriaUsers')) || [];
    const user = users.find(u => u.email === email && u.password === hashedPassword);
    
    if (user) {
        // Set current user
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Update UI
        updateAuthUI();
        
        // Close modal
        closeModal('login');
        
        // Show welcome notification
        showNotification('success', 'Welcome Back!', `Hello, ${user.name}! You're now logged in.`);
        
        // Clear form
        event.target.reset();
        
        // Redirect based on account type
        if (user.accountType === 'seller' && window.location.pathname.includes('index.html')) {
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    } else {
        showNotification('error', 'Login Failed', 'Invalid email or password!');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showNotification('success', 'Logged Out', 'You have been logged out successfully!');
    
    // Redirect to home page
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function checkLoggedInUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const startSellingBtn = document.getElementById('startSellingBtn');
    const cartWrapper = document.getElementById('cartWrapper');
    const dashboardLink = document.getElementById('dashboardLink');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        userName.textContent = currentUser.name.split(' ')[0];
        
        // Hide "Start Selling" button for logged-in users
        if (startSellingBtn) {
            startSellingBtn.style.display = 'none';
        }
        
        // Hide cart for sellers
        if (currentUser.accountType === 'seller' && cartWrapper) {
            cartWrapper.style.display = 'none';
        }
        
        // Show dashboard link only for sellers
        if (dashboardLink) {
            dashboardLink.style.display = currentUser.accountType === 'seller' ? 'block' : 'none';
        }
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        
        // Show "Start Selling" button for non-logged-in users
        if (startSellingBtn) {
            startSellingBtn.style.display = 'block';
        }
        
        // Show cart for all non-logged-in users
        if (cartWrapper) {
            cartWrapper.style.display = 'block';
        }
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Modal Functions
function showModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function switchModal(from, to) {
    closeModal(from);
    showModal(to);
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Product Functions
function initializeSampleProducts() {
    const savedProducts = localStorage.getItem('pentoriaProducts');
    
    if (!savedProducts) {
        const sampleProducts = [
            {
                id: 1,
                title: 'iPhone 15 Pro Max - 256GB',
                category: 'phones',
                price: 950000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Ikeja City Mall, Lagos',
                description: 'Brand new iPhone 15 Pro Max with 1 year warranty. Includes charger and earphones.',
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
                sellerId: 0,
                sellerName: 'TechHub Nigeria',
                sellerBusinessName: 'TechHub Nigeria',
                sellerRating: 4.8,
                views: 1250,
                featured: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Samsung 65" 4K Smart TV',
                category: 'electronics',
                price: 450000,
                condition: 'new',
                location: 'Abuja',
                meetupAddress: 'Shoprite, Abuja',
                description: 'Crystal clear 4K display with smart features. Perfect for home entertainment.',
                image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
                sellerId: 0,
                sellerName: 'ElectroWorld',
                sellerBusinessName: 'ElectroWorld',
                sellerRating: 4.7,
                views: 890,
                featured: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: 'Designer Lace Gown',
                category: 'fashion',
                price: 45000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Palms Shopping Mall, Lekki',
                description: 'Beautiful Nigerian lace gown perfect for occasions. Custom sizes available.',
                image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
                sellerId: 0,
                sellerName: 'Fabrics & Fashion',
                sellerBusinessName: 'Fabrics & Fashion',
                sellerRating: 4.9,
                views: 678,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                title: 'Toyota Camry 2019 Model',
                category: 'vehicles',
                price: 12500000,
                condition: 'used',
                location: 'Lagos',
                meetupAddress: 'AutoMart Lagos, Ikeja',
                description: 'Well maintained Toyota Camry 2019. Clean title, all documents available.',
                image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400',
                sellerId: 0,
                sellerName: 'AutoMart Nigeria',
                sellerBusinessName: 'AutoMart Nigeria',
                sellerRating: 4.6,
                views: 2340,
                featured: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 5,
                title: 'Modern Sofa Set',
                category: 'home',
                price: 180000,
                condition: 'new',
                location: 'Port Harcourt',
                meetupAddress: 'Genesis Mall, Port Harcourt',
                description: 'Beautiful 3-seater and 2-seater sofa set. Premium fabric and comfort.',
                image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
                sellerId: 0,
                sellerName: 'Home Comforts',
                sellerBusinessName: 'Home Comforts',
                sellerRating: 4.5,
                views: 567,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 6,
                title: 'Professional Photography Service',
                category: 'services',
                price: 50000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Studio, Victoria Island',
                description: 'Professional photography for events, weddings, and corporate functions.',
                image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400',
                sellerId: 0,
                sellerName: 'Studio Elite',
                sellerBusinessName: 'Studio Elite',
                sellerRating: 4.9,
                views: 432,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 7,
                title: 'MacBook Pro 14" M3',
                category: 'electronics',
                price: 1350000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Computer Village, Ikeja',
                description: 'Latest MacBook Pro with M3 chip. Perfect for professionals and creatives.',
                image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
                sellerId: 0,
                sellerName: 'Apple Store NG',
                sellerBusinessName: 'Apple Store NG',
                sellerRating: 5.0,
                views: 1876,
                featured: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 8,
                title: '3-Bedroom Apartment for Rent',
                category: 'property',
                price: 800000,
                condition: 'used',
                location: 'Abuja',
                meetupAddress: 'Property Location, Wuse 2',
                description: 'Spacious 3-bedroom apartment in secured estate. Water and electricity available.',
                image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
                sellerId: 0,
                sellerName: 'Prime Properties',
                sellerBusinessName: 'Prime Properties',
                sellerRating: 4.7,
                views: 987,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 9,
                title: 'Premium Skincare Set',
                category: 'health',
                price: 35000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Palms Mall, Lekki',
                description: 'Complete skincare routine set with natural ingredients. Perfect for all skin types.',
                image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
                sellerId: 0,
                sellerName: 'Glow Up Beauty',
                sellerBusinessName: 'Glow Up Beauty',
                sellerRating: 4.8,
                views: 543,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 10,
                title: 'Gym Equipment Package',
                category: 'sports',
                price: 250000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Sport Complex, Surulere',
                description: 'Complete home gym package including weights, bench, and cardio equipment.',
                image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
                sellerId: 0,
                sellerName: 'FitLife Nigeria',
                sellerBusinessName: 'FitLife Nigeria',
                sellerRating: 4.6,
                views: 765,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 11,
                title: 'Traditional Nigerian Attire',
                category: 'fashion',
                price: 60000,
                condition: 'new',
                location: 'Lagos',
                meetupAddress: 'Balogun Market, Lagos Island',
                description: 'Handmade traditional Nigerian attire with authentic embroidery and patterns.',
                image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400',
                sellerId: 0,
                sellerName: 'Cultural Threads',
                sellerBusinessName: 'Cultural Threads',
                sellerRating: 4.9,
                views: 891,
                featured: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 12,
                title: 'Honda Accord 2018',
                category: 'vehicles',
                price: 9800000,
                condition: 'used',
                location: 'Abuja',
                meetupAddress: 'Auto Junction, Abuja',
                description: 'Clean Honda Accord 2018, first body. Excellent condition and well maintained.',
                image: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=400',
                sellerId: 0,
                sellerName: 'Car Dealers NG',
                sellerBusinessName: 'Car Dealers NG',
                sellerRating: 4.5,
                views: 1567,
                featured: false,
                createdAt: new Date().toISOString()
            }
        ];
        
        localStorage.setItem('pentoriaProducts', JSON.stringify(sampleProducts));
        products = sampleProducts;
    }
}

function loadProducts() {
    const savedProducts = localStorage.getItem('pentoriaProducts');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
    }
}

function displayProducts(productsToShow) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (productsToShow.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = productsToShow.map(product => `
        <div class="product-card ${product.featured ? 'featured' : ''}">
            <div class="product-image">
                <img src="${product.image}" alt="${sanitizeInput(product.title)}" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-title">${sanitizeInput(product.title)}</h3>
                <div class="product-price">₦${product.price.toLocaleString()}</div>
                <div class="product-location">
                    <i class="fas fa-map-marker-alt"></i> ${sanitizeInput(product.location)}
                </div>
                ${product.meetupAddress ? `<div class="product-location" style="font-size: 0.85rem; color: var(--gray);">
                    <i class="fas fa-handshake"></i> Meet at: ${sanitizeInput(product.meetupAddress)}
                </div>` : ''}
                <div class="product-meta">
                    <span class="product-views">
                        <i class="fas fa-eye"></i> ${product.views}
                    </span>
                    <span class="product-condition">
                        <i class="fas fa-tag"></i> ${product.condition}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn-view" onclick="viewProduct(${product.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
                <div class="seller-info">
                    <div class="seller-avatar" style="background-image: url('${product.sellerProfilePicture || ''}'); background-size: cover;">
                        ${!product.sellerProfilePicture ? product.sellerName.charAt(0) : ''}
                    </div>
                    <div class="seller-name">${sanitizeInput(product.sellerBusinessName || product.sellerName)}</div>
                    <div class="seller-rating">
                        <i class="fas fa-star"></i> ${product.sellerRating}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    filteredProducts = products.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm) ||
                             product.description.toLowerCase().includes(searchTerm) ||
                             product.location.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        
        return matchesSearch && matchesCategory;
    });
    
    if (window.location.pathname.includes('products.html')) {
        displayProducts(filteredProducts);
    } else {
        window.location.href = `products.html?search=${encodeURIComponent(searchTerm)}&category=${category || ''}`;
    }
}

function filterByCategory(category) {
    document.getElementById('categoryFilter').value = category;
    
    filteredProducts = products.filter(product => product.category === category);
    
    if (window.location.pathname.includes('products.html')) {
        displayProducts(filteredProducts);
        document.getElementById('currentCategoryTitle').textContent = 
            category.charAt(0).toUpperCase() + category.slice(1) + ' Products';
    } else {
        window.location.href = `products.html?category=${category}`;
    }
}

function sortProducts() {
    const sortBy = document.getElementById('sortProducts').value;
    let sortedProducts = [...filteredProducts];
    
    switch(sortBy) {
        case 'newest':
            sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'price-low':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            sortedProducts.sort((a, b) => b.views - a.views);
            break;
    }
    
    displayProducts(sortedProducts);
}

function viewProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        // Increment views
        product.views++;
        localStorage.setItem('pentoriaProducts', JSON.stringify(products));
        
        // Show product details notification
        showNotification('info', 'Product Details', `
            ${sanitizeInput(product.title)}
            Price: ₦${product.price.toLocaleString()}
            Location: ${sanitizeInput(product.location)}
            ${product.meetupAddress ? `Meetup: ${sanitizeInput(product.meetupAddress)}` : ''}
            Condition: ${product.condition}
            Seller: ${sanitizeInput(product.sellerBusinessName || product.sellerName)}
            Rating: ${product.sellerRating} ⭐
            
            Description: ${sanitizeInput(product.description)}
        `);
        
        // Refresh display
        displayProducts(filteredProducts.length > 0 ? filteredProducts : products);
    }
}

// Cart Functions
function loadCart() {
    const savedCart = localStorage.getItem('pentoriaCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

function saveCart() {
    localStorage.setItem('pentoriaCart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId) {
    if (!currentUser) {
        showNotification('warning', 'Login Required', 'Please login to add items to your cart');
        showModal('login');
        return;
    }
    
    if (currentUser.accountType === 'seller') {
        showNotification('warning', 'Cannot Add to Cart', 'Sellers cannot add items to cart');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product) {
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }
        
        saveCart();
        showNotification('success', 'Added to Cart', `${sanitizeInput(product.title)} has been added to your cart!`);
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    displayCartPage();
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            displayCartPage();
        }
    }
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('#cartCount');
    cartCountElements.forEach(el => {
        if (el) el.textContent = count;
    });
}

function displayCartPage() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-shopping-cart" style="font-size: 4rem; color: var(--gray); margin-bottom: 1rem;"></i>
                <h3>Your cart is empty</h3>
                <p>Start shopping to add items to your cart</p>
                <button class="btn-primary" onclick="window.location.href='products.html'" style="margin-top: 1rem;">
                    Start Shopping
                </button>
            </div>
        `;
        document.getElementById('cartSubtotal').textContent = '₦0';
        document.getElementById('deliveryFee').textContent = '₦0';
        document.getElementById('cartTotal').textContent = '₦0';
        return;
    }
    
    let total = 0;
    
    cartItemsContainer.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${sanitizeInput(item.title)}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-title">${sanitizeInput(item.title)}</div>
                    <div class="cart-item-category">${item.category}</div>
                    <div class="cart-item-price">₦${item.price.toLocaleString()}</div>
                    <div class="cart-item-quantity">
                        <button onclick="updateCartQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    const deliveryFee = total > 50000 ? 0 : 2500;
    const finalTotal = total + deliveryFee;
    
    document.getElementById('cartSubtotal').textContent = `₦${total.toLocaleString()}`;
    document.getElementById('deliveryFee').textContent = `₦${deliveryFee.toLocaleString()}`;
    document.getElementById('cartTotal').textContent = `₦${finalTotal.toLocaleString()}`;
}

function checkout() {
    if (cart.length === 0) {
        showNotification('warning', 'Empty Cart', 'Your cart is empty!');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    showNotification('success', 'Order Placed!', `
        Order Summary:
        ${cart.map(item => `- ${sanitizeInput(item.title)} x${item.quantity}: ₦${(item.price * item.quantity).toLocaleString()}`).join('\n')}
        
        Total: ₦${total.toLocaleString()}
        
        Thank you for shopping with Pentoria!
        Your order has been placed successfully.
    `);
    
    // Clear cart
    cart = [];
    saveCart();
    
    setTimeout(() => {
        window.location.href = 'products.html';
    }, 2000);
}

function continueShopping() {
    window.location.href = 'products.html';
}

// Dashboard Functions
function loadDashboard() {
    if (!currentUser || currentUser.accountType !== 'seller') {
        showNotification('error', 'Access Denied', 'Dashboard is only available for sellers');
        window.location.href = 'index.html';
        return;
    }
    
    updateDashboardStats();
    showMyProducts();
}

function updateDashboardStats() {
    const userProducts = products.filter(p => p.sellerId === currentUser.id);
    const totalViews = userProducts.reduce((sum, p) => sum + p.views, 0);
    
    document.getElementById('totalProducts').textContent = userProducts.length;
    document.getElementById('totalViews').textContent = totalViews;
    document.getElementById('totalOrders').textContent = currentUser.orders || 0;
    document.getElementById('avgRating').textContent = currentUser.rating || 4.5;
}

function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show appropriate content
    switch(tab) {
        case 'myProducts':
            showMyProducts();
            break;
        case 'analytics':
            showAnalytics();
            break;
        case 'orders':
            showOrders();
            break;
    }
}

function showMyProducts() {
    const userProducts = products.filter(p => p.sellerId === currentUser.id);
    const container = document.getElementById('dashboardBody');
    
    if (userProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-box-open" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                <h3>No products listed yet</h3>
                <p>Start selling by uploading your first product</p>
                <button class="btn-primary" onclick="showUploadModal()" style="margin-top: 1rem;">
                    Upload Product
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            ${userProducts.map(product => `
                <div style="background: var(--white); padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem;">
                    <img src="${product.image}" alt="${sanitizeInput(product.title)}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">
                    <div style="flex: 1;">
                        <h4>${sanitizeInput(product.title)}</h4>
                        <p style="color: var(--success); font-weight: bold;">₦${product.price.toLocaleString()}</p>
                        <p><i class="fas fa-eye"></i> ${product.views} views</p>
                        ${product.featured ? '<span style="background: var(--warning); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">⭐ Featured</span>' : ''}
                    </div>
                    <div>
                        <button onclick="deleteProduct(${product.id})" style="background: var(--accent); color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAnalytics() {
    const userProducts = products.filter(p => p.sellerId === currentUser.id);
    const totalViews = userProducts.reduce((sum, p) => sum + p.views, 0);
    const totalValue = userProducts.reduce((sum, p) => sum + p.price, 0);
    
    const container = document.getElementById('dashboardBody');
    container.innerHTML = `
        <div style="display: grid; gap: 2rem;">
            <div>
                <h3><i class="fas fa-chart-line"></i> Performance Overview</h3>
                <div style="background: var(--white); padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div>
                            <p>Total Views</p>
                            <h2>${totalViews}</h2>
                        </div>
                        <div>
                            <p>Products Listed</p>
                            <h2>${userProducts.length}</h2>
                        </div>
                        <div>
                            <p>Total Value</p>
                            <h2>₦${totalValue.toLocaleString()}</h2>
                        </div>
                        <div>
                            <p>Avg Views/Product</p>
                            <h2>${userProducts.length > 0 ? Math.round(totalViews / userProducts.length) : 0}</h2>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <h3><i class="fas fa-lightbulb"></i> Tips to Increase Sales</h3>
                <ul style="background: var(--white); padding: 1.5rem; border-radius: 8px; margin-top: 1rem; list-style: none;">
                    <li style="margin-bottom: 0.8rem;"><i class="fas fa-check" style="color: var(--success); margin-right: 0.5rem;"></i> Use high-quality product images</li>
                    <li style="margin-bottom: 0.8rem;"><i class="fas fa-check" style="color: var(--success); margin-right: 0.5rem;"></i> Write detailed descriptions</li>
                    <li style="margin-bottom: 0.8rem;"><i class="fas fa-check" style="color: var(--success); margin-right: 0.5rem;"></i> Feature your products for more visibility</li>
                    <li style="margin-bottom: 0.8rem;"><i class="fas fa-check" style="color: var(--success); margin-right: 0.5rem;"></i> Respond quickly to buyer inquiries</li>
                    <li><i class="fas fa-check" style="color: var(--success); margin-right: 0.5rem;"></i> Maintain good seller rating</li>
                </ul>
            </div>
        </div>
    `;
}

function showOrders() {
    const container = document.getElementById('dashboardBody');
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <i class="fas fa-clipboard-list" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
            <h3>No orders yet</h3>
            <p>Orders will appear here when buyers purchase your products</p>
        </div>
    `;
}

function showUploadModal() {
    if (!currentUser) {
        showNotification('warning', 'Login Required', 'Please login to upload products');
        showModal('login');
        return;
    }
    
    if (currentUser.accountType !== 'seller') {
        showNotification('error', 'Access Denied', 'Only sellers can upload products');
        return;
    }
    
    showModal('upload');
}

function handleProductUpload(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('warning', 'Login Required', 'Please login to upload products');
        return;
    }
    
    if (currentUser.accountType !== 'seller') {
        showNotification('error', 'Access Denied', 'Only sellers can upload products');
        return;
    }
    
    const title = sanitizeInput(document.getElementById('productTitle').value);
    const category = sanitizeInput(document.getElementById('productCategory').value);
    const price = parseInt(document.getElementById('productPrice').value);
    const condition = sanitizeInput(document.getElementById('productCondition').value);
    const location = sanitizeInput(document.getElementById('productLocation').value);
    const meetupAddress = sanitizeInput(document.getElementById('productMeetup').value);
    const description = sanitizeInput(document.getElementById('productDescription').value);
    const imageFile = document.getElementById('productImage').files[0];
    const featured = document.getElementById('productFeatured').checked;
    
    // Validation
    if (!title || !category || !price || !location || !description || !imageFile) {
        showNotification('error', 'Missing Information', 'Please fill in all required fields');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const newProduct = {
            id: Date.now(),
            title: title,
            category: category,
            price: price,
            condition: condition,
            location: location,
            meetupAddress: meetupAddress,
            description: description,
            image: e.target.result,
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            sellerBusinessName: currentUser.businessName,
            sellerProfilePicture: currentUser.profilePicture,
            sellerRating: currentUser.rating || 4.5,
            views: 0,
            featured: featured,
            createdAt: new Date().toISOString()
        };
        
        products.unshift(newProduct);
        localStorage.setItem('pentoriaProducts', JSON.stringify(products));
        
        showNotification('success', 'Product Uploaded', 'Your product has been uploaded successfully!');
        closeModal('upload');
        event.target.reset();
        
        // Refresh displays
        updateDashboardStats();
        showMyProducts();
    };
    
    reader.readAsDataURL(imageFile);
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        products = products.filter(p => p.id !== productId);
        localStorage.setItem('pentoriaProducts', JSON.stringify(products));
        
        updateDashboardStats();
        showMyProducts();
        
        showNotification('success', 'Product Deleted', 'Product has been deleted successfully!');
    }
}

// Profile Functions
function loadProfileData() {
    if (!currentUser) {
        showNotification('warning', 'Login Required', 'Please login to view your profile');
        window.location.href = 'index.html';
        return;
    }
    
    // Update profile display
    document.getElementById('profileNameDisplay').textContent = currentUser.name;
    document.getElementById('profileEmailDisplay').textContent = currentUser.email;
    document.getElementById('profileTypeDisplay').textContent = currentUser.accountType.charAt(0).toUpperCase() + currentUser.accountType.slice(1);
    
    const joinDate = new Date(currentUser.createdAt);
    document.getElementById('profileJoinDate').textContent = `Joined ${joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    
    // Show business name for sellers
    if (currentUser.accountType === 'seller') {
        document.getElementById('businessNameStat').style.display = 'block';
        document.getElementById('profileBusinessDisplay').textContent = currentUser.businessName;
        document.getElementById('businessNameUpdateGroup').style.display = 'block';
    }
    
    // Update profile picture if available
    if (currentUser.profilePicture) {
        const profilePic = document.getElementById('profilePictureDisplay');
        profilePic.style.backgroundImage = `url(${currentUser.profilePicture})`;
        profilePic.style.backgroundSize = 'cover';
        profilePic.innerHTML = '';
    }
    
    // Update form fields
    document.getElementById('updateName').value = currentUser.name;
    document.getElementById('updateEmail').value = currentUser.email;
    document.getElementById('updatePhone').value = currentUser.phone;
    
    if (currentUser.businessName) {
        document.getElementById('updateBusinessName').value = currentUser.businessName;
    }
    
    // Load preferences
    if (currentUser.preferences) {
        document.getElementById('emailNotifications').checked = currentUser.preferences.emailNotifications;
        document.getElementById('smsNotifications').checked = currentUser.preferences.smsNotifications;
        document.getElementById('orderUpdates').checked = currentUser.preferences.orderUpdates;
        document.getElementById('promotionalEmails').checked = currentUser.preferences.promotionalEmails;
        document.getElementById('language').value = currentUser.preferences.language || 'en';
    }
}

function updateProfile(event) {
    event.preventDefault();
    
    const name = sanitizeInput(document.getElementById('updateName').value);
    const email = sanitizeInput(document.getElementById('updateEmail').value);
    const phone = sanitizeInput(document.getElementById('updatePhone').value);
    const businessName = currentUser.accountType === 'seller' ? sanitizeInput(document.getElementById('updateBusinessName').value) : currentUser.businessName;
    
    // Validation
    if (!validateEmail(email)) {
        showNotification('error', 'Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    if (!validatePhone(phone)) {
        showNotification('error', 'Invalid Phone', 'Please enter a valid Nigerian phone number');
        return;
    }
    
    // Update user data
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;
    if (currentUser.accountType === 'seller') {
        currentUser.businessName = businessName;
    }
    
    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('pentoriaUsers')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pentoriaUsers', JSON.stringify(users));
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showNotification('success', 'Profile Updated', 'Your profile has been updated successfully!');
    loadProfileData();
}

function updateProfilePicture(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.profilePicture = e.target.result;
            
            // Save to localStorage
            const users = JSON.parse(localStorage.getItem('pentoriaUsers')) || [];
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                users[userIndex] = currentUser;
                localStorage.setItem('pentoriaUsers', JSON.stringify(users));
            }
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update display
            loadProfileData();
            
            showNotification('success', 'Picture Updated', 'Your profile picture has been updated!');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    // Validate current password
    const hashedCurrentPassword = hashPassword(currentPassword);
    if (hashedCurrentPassword !== currentUser.password) {
        showNotification('error', 'Incorrect Password', 'Current password is incorrect');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showNotification('error', 'Password Mismatch', 'New passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('error', 'Weak Password', 'Password must be at least 6 characters');
        return;
    }
    
    // Update password
    currentUser.password = hashPassword(newPassword);
    
    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('pentoriaUsers')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pentoriaUsers', JSON.stringify(users));
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showNotification('success', 'Password Changed', 'Your password has been changed successfully!');
    event.target.reset();
}

function updatePreferences(event) {
    event.preventDefault();
    
    currentUser.preferences = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        smsNotifications: document.getElementById('smsNotifications').checked,
        orderUpdates: document.getElementById('orderUpdates').checked,
        promotionalEmails: document.getElementById('promotionalEmails').checked,
        language: document.getElementById('language').value,
        currency: 'NGN'
    };
    
    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('pentoriaUsers')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pentoriaUsers', JSON.stringify(users));
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showNotification('success', 'Preferences Saved', 'Your preferences have been saved successfully!');
}

function switchProfileTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.profile-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tab + 'Tab').classList.add('active');
}

// Contact Form
function submitContactForm(event) {
    event.preventDefault();
    
    const name = sanitizeInput(document.getElementById('contactName').value);
    const email = sanitizeInput(document.getElementById('contactEmail').value);
    const phone = sanitizeInput(document.getElementById('contactPhone').value);
    const subject = sanitizeInput(document.getElementById('contactSubject').value);
    const message = sanitizeInput(document.getElementById('contactMessage').value);
    
    showNotification('success', 'Message Sent', 'Thank you for contacting us! We will get back to you soon.');
    event.target.reset();
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && !href.includes('.html')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    });
});