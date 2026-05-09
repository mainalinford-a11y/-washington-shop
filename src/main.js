// Main website interactions
document.addEventListener('DOMContentLoaded', () => {
    // Header scroll background effect
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.padding = '10px 0';
            header.style.background = 'rgba(10, 10, 10, 0.95)';
        } else {
            header.style.padding = '15px 0';
            header.style.background = 'rgba(255, 255, 255, 0.03)';
        }
    });

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card, .product-item, .contact-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });

    // Custom observer for the translateY effect (separate from CSS fade-in)
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card, .product-item, .contact-card').forEach(el => {
        fadeObserver.observe(el);
    });

    // Modal Logic
    const modal = document.getElementById('order-modal');
    const orderBtn = document.querySelector('.btn-outline.btn-sm') || document.querySelector('a[href="tel:+250784670863"]');
    const closeBtn = document.querySelector('.close-modal');

    if (orderBtn) {
        orderBtn.addEventListener('click', (e) => {
            if (e.target.innerText.includes('Order')) {
                e.preventDefault();
                modal.classList.add('active');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Delivery Type Toggle
    const orderType = document.getElementById('order-type');
    const addressGroup = document.getElementById('address-group');
    if (orderType && addressGroup) {
        orderType.addEventListener('change', () => {
            addressGroup.style.display = orderType.value === 'delivery' ? 'block' : 'none';
            const addressInput = document.getElementById('order-address');
            if (orderType.value === 'delivery') {
                addressInput.required = true;
            } else {
                addressInput.required = false;
            }
        });
    }

    // --- Cart System ---
    let cart = [];
    let products = [];

    const fetchProducts = async () => {
        try {
            const { getProducts } = await import('./api.js');
            products = await getProducts();
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    fetchProducts();

    const searchInput = document.getElementById('product-search');
    const searchResults = document.getElementById('search-results');
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (!query) {
                searchResults.style.display = 'none';
                return;
            }

            const filtered = products.filter(p => p.name.toLowerCase().includes(query));
            if (filtered.length > 0) {
                searchResults.innerHTML = filtered.map(p => `
                    <div class="search-item" onclick="addToCart(${p.id}, '${p.name}', ${p.price})">
                        <span>${p.name}</span>
                        <span>${p.price.toLocaleString()} RWF</span>
                    </div>
                `).join('');
                searchResults.style.display = 'block';
            } else {
                searchResults.style.display = 'none';
            }
        });
    }

    window.addToCart = (id, name, price) => {
        const existing = cart.find(item => item.id === id);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ id, name, price, qty: 1 });
        }
        updateCartUI();
        searchInput.value = '';
        searchResults.style.display = 'none';
    };

    window.removeFromCart = (id) => {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    };

    const updateCartUI = () => {
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p class="empty-msg">No items added yet</p>';
            cartTotalAmount.innerText = '0 RWF';
            return;
        }

        cartItemsList.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong> x ${item.qty}
                </div>
                <div>
                    <span>${(item.price * item.qty).toLocaleString()} RWF</span>
                    <span class="remove" onclick="removeFromCart(${item.id})">Remove</span>
                </div>
            </div>
        `).join('');

        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        cartTotalAmount.innerText = `${total.toLocaleString()} RWF`;
    };

    // Order Submission
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (cart.length === 0) {
                alert('Please add at least one item to your cart.');
                return;
            }

            const submitBtn = orderForm.querySelector('button');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing...';

            const phoneDigits = document.getElementById('order-phone').value;
            const fullPhone = '+250' + phoneDigits;
            const customerName = document.getElementById('order-name').value;
            const type = document.getElementById('order-type').value;
            const address = document.getElementById('order-address').value;

            const itemsString = cart.map(item => `${item.name} (${item.qty})`).join(', ');
            const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

            const orderData = {
                customerName,
                phone: phoneDigits,
                items: `${itemsString} | Total: ${total} RWF`,
                type,
                address: type === 'delivery' ? address : 'Self Pickup'
            };

            try {
                const { createOrder } = await import('./api.js');
                await createOrder(orderData);
                
                alert('Order placed successfully! Washington has been notified and will process your order shortly.');
                
                orderForm.reset();
                cart = [];
                updateCartUI();
                if (addressGroup) addressGroup.style.display = 'none';
                modal.classList.remove('active');
            } catch (error) {
                console.error(error);
                alert('Error placing order.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirm Order';
            }
        });
    }

    // Dynamic Gallery
    const loadGallery = async () => {
        const galleryGrid = document.getElementById('dynamic-gallery');
        if (!galleryGrid) return;

        try {
            const { getGallery } = await import('./api.js');
            const items = await getGallery();
            
            if (items.length > 0) {
                galleryGrid.innerHTML = items.map(item => `
                    <div class="product-item glass fade-in">
                        <img src="${item.url}" alt="${item.description}" />
                        <div class="product-info">
                            <h3>Recipe / Event</h3>
                            <span>${item.description}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading gallery:', error);
        }
    };

    loadGallery();

    // --- Map Initialization ---
    const initMap = () => {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Kigali, Rwanda coordinates
        const kigali = [-1.9441, 30.0619];
        
        const map = L.map('map', {
            center: kigali,
            zoom: 13,
            scrollWheelZoom: false
        });

        // Use a premium dark theme for the map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Custom Gold Icon for the marker
        const goldIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: var(--accent-gold); width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px var(--accent-gold);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        L.marker(kigali, { icon: goldIcon })
            .addTo(map)
            .bindPopup('<b style="color: #333;">Washington Shop</b><br>Kigali, Rwanda')
            .openPopup();
    };

    // Initialize map after a slight delay to ensure container is ready
    setTimeout(initMap, 500);
});
