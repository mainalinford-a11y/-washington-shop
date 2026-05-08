import { 
    getOrders, 
    updateOrderStatus, 
    getGallery, 
    uploadImage, 
    deleteImage, 
    checkAuth, 
    logout,
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    subscribeToNewOrders
    ,
    changePassword,
    setSecurityAnswers,
    isSecurityConfigured,
    resetPasswordWithAnswers
} from './api.js';

// Auth Protection
if (!checkAuth()) {
    window.location.href = 'login.html';
}

// Global functions for HTML access
window.handleLogout = () => {
    logout();
};

window.refreshOrders = async () => {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    ordersList.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading orders...</td></tr>';
    
    const orders = await getOrders();
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<tr><td colspan="6" style="text-align:center">No orders yet.</td></tr>';
        return;
    }

    ordersList.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.id.toString().substr(0, 8)}</strong></td>
            <td>
                <div>${order.customer_name}</div>
                <small style="color: var(--text-secondary)">${order.phone}</small>
            </td>
            <td>
                <div>${order.items}</div>
                ${order.type === 'delivery' ? `<small style="color: var(--accent-gold)">📍 ${order.address}</small>` : '<small style="color: var(--text-secondary)">Self Pickup</small>'}
            </td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>
                ${order.status === 'pending' ? 
                    `<button class="btn btn-primary btn-sm" onclick="completeOrder('${order.id}')">Complete</button>` : 
                    '--'}
            </td>
        </tr>
    `).join('');
};

window.completeOrder = async (id) => {
    if (confirm('Mark this order as completed?')) {
        await updateOrderStatus(id, 'completed');
        window.refreshOrders();
        window.refreshInsights(); // Update AI suggestions based on actual sales
    }
};

window.refreshGallery = async () => {
    const galleryList = document.getElementById('gallery-list');
    if (!galleryList) return;

    const items = await getGallery();
    
    galleryList.innerHTML = items.map(item => `
        <div class="admin-gallery-item">
            <img src="${item.url}" alt="${item.description}">
            <button class="delete-btn" onclick="handleDeleteImage('${item.id}')">Delete</button>
            <div style="padding: 10px; font-size: 0.8rem; background: var(--bg-secondary)">
                ${item.description}
            </div>
        </div>
    `).join('');
};

window.handleDeleteImage = async (id) => {
    if (confirm('Delete this content?')) {
        await deleteImage(id);
        window.refreshGallery();
    }
};

window.refreshProducts = async () => {
    const productsList = document.getElementById('products-list');
    if (!productsList) return;
    
    productsList.innerHTML = '<tr><td colspan="4" style="text-align:center">Loading inventory...</td></tr>';
    
    const products = await getProducts();
    
    if (products.length === 0) {
        productsList.innerHTML = '<tr><td colspan="4" style="text-align:center">No products added yet.</td></tr>';
        return;
    }

    productsList.innerHTML = products.map(p => `
        <tr>
            <td>
                <div style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: var(--glass-bg);">
                    ${p.image_url ? `<img src="${p.image_url}" style="width: 100%; height: 100%; object-fit: cover;">` : '🖼️'}
                </div>
            </td>
            <td><strong>${p.name}</strong></td>
            <td><span class="status-badge" style="background: rgba(255,255,255,0.05)">${p.category}</span></td>
            <td>${p.price.toLocaleString()} RWF</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}', '${p.name}', ${p.price}, '${p.category}', '${p.image_url || ''}')">Edit</button>
                <button class="btn btn-outline btn-sm" style="color: var(--accent-crimson)" onclick="handleDeleteProduct('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

window.refreshInsights = async () => {
    const orders = await getOrders();
    const insightsList = document.getElementById('top-products-list');
    const adviceText = document.getElementById('procurement-advice');
    if (!insightsList) return;

    // "AI" Logic: Count occurrences of products in COMPLETED orders only
    const counts = {};
    const completedOrders = orders.filter(o => o.status === 'completed');

    completedOrders.forEach(order => {
        // order.items is like "Primus Big (2), Burger (1) | Total: 7500 RWF"
        const itemsPart = order.items.split('|')[0];
        const itemMatches = itemsPart.match(/[^(]+(?=\s\(\d+\))/g) || [];
        itemMatches.forEach(name => {
            const trimmed = name.trim();
            counts[trimmed] = (counts[trimmed] || 0) + 1;
        });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        insightsList.innerHTML = '<p>Not enough order data to generate insights yet.</p>';
        return;
    }

    insightsList.innerHTML = sorted.slice(0, 5).map(([name, count]) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--glass-border);">
            <span><strong>${name}</strong></span>
            <span class="status-badge status-completed">${count} times ordered</span>
        </div>
    `).join('');

    const topProduct = sorted[0][0];
    adviceText.innerHTML = `<strong>Procurement Recommendation:</strong><br><br>
        Your customers are loving <strong>${topProduct}</strong>! We recommend increasing your stock for this item by 20% to avoid stockouts during the next 5 PM - 7 AM shift.`;
};

window.showProductModal = () => {
    document.getElementById('product-modal').classList.add('active');
    document.getElementById('product-form').reset();
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-modal-title').innerText = 'Add Product';
};

window.closeProductModal = () => {
    document.getElementById('product-modal').classList.remove('active');
};

window.editProduct = (id, name, price, category, imageUrl) => {
    showProductModal();
    document.getElementById('edit-product-id').value = id;
    document.getElementById('prod-name').value = name;
    document.getElementById('prod-price').value = price;
    document.getElementById('prod-category').value = category;
    
    const preview = document.getElementById('product-img-preview');
    if (imageUrl) {
        document.getElementById('prod-image-url').value = imageUrl;
        preview.style.display = 'block';
        preview.querySelector('img').src = imageUrl;
    } else {
        document.getElementById('prod-image-url').value = '';
        preview.style.display = 'none';
    }
    document.getElementById('product-modal-title').innerText = 'Edit Product';
};

window.handleDeleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
        await deleteProduct(id);
        window.refreshProducts();
    }
};

// --- Notifications ---
const requestNotificationPermission = async () => {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
    }
};

const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play blocked:', e));
};

const notifyNewOrder = (order) => {
    playNotificationSound();
    
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🔔 New Order Received!', {
            body: `${order.customer_name} ordered: ${order.items}`,
            icon: '/assets/logo.png' // Adjust icon path if needed
        });
    }
    
    // Refresh the list immediately
    window.refreshOrders();
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    window.refreshOrders();
    window.refreshGallery();
    window.refreshProducts();
    window.refreshInsights();
    
    requestNotificationPermission();

    // Subscribe to realtime orders
    subscribeToNewOrders((newOrder) => {
        console.log('New order received via realtime:', newOrder);
        notifyNewOrder(newOrder);
    });

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = productForm.querySelector('button');
            const id = document.getElementById('edit-product-id').value;
            const file = document.getElementById('prod-image-file').files[0];
            
            submitBtn.disabled = true;
            submitBtn.innerText = 'Uploading...';

            let imageUrl = document.getElementById('prod-image-url').value;

            try {
                if (file) {
                    imageUrl = await uploadProductImage(file);
                }

                const productData = {
                    name: document.getElementById('prod-name').value,
                    price: parseFloat(document.getElementById('prod-price').value),
                    category: document.getElementById('prod-category').value,
                    image_url: imageUrl
                };

                if (id) {
                    await updateProduct(id, productData);
                } else {
                    await createProduct(productData);
                }

                closeProductModal();
                window.refreshProducts();
            } catch (error) {
                console.error(error);
                alert('Failed to save product. Make sure the "products" storage bucket is created in Supabase.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Save Product';
            }
        };
    }

    const prodImageFile = document.getElementById('prod-image-file');
    if (prodImageFile) {
        prodImageFile.onchange = (e) => {
            const file = e.target.files[0];
            const preview = document.getElementById('product-img-preview');
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.style.display = 'block';
                    preview.querySelector('img').src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const imgDesc = document.getElementById('img-desc');

    if (uploadZone) {
        uploadZone.onclick = () => fileInput.click();
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadZone.innerText = `Selected: ${file.name}`;
            }
        };
    }

    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            const file = fileInput.files[0];
            if (!file) {
                alert('Please select a file');
                return;
            }

            uploadBtn.disabled = true;
            uploadBtn.innerText = 'Uploading...';

            // Convert to base64 for mock storage
            const reader = new FileReader();
            reader.onloadend = async () => {
                await uploadImage(reader.result, imgDesc.value || 'New Post');
                alert('Uploaded successfully!');
                imgDesc.value = '';
                uploadZone.innerText = 'Click or Drag to Upload Image';
                fileInput.value = '';
                uploadBtn.disabled = false;
                uploadBtn.innerText = 'Upload Content';
                window.refreshGallery();
            };
            reader.readAsDataURL(file);
        };
    }

    // --- Security handlers ---
    const changePassForm = document.getElementById('change-pass-form');
    if (changePassForm) {
        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('change-pass-btn');
            btn.disabled = true; btn.innerText = 'Updating...';
            try {
                const cur = document.getElementById('current-pass').value;
                const nw = document.getElementById('new-pass').value;
                await changePassword(cur, nw);
                alert('Password changed successfully');
                changePassForm.reset();
            } catch (err) {
                alert(err.message || 'Failed to change password');
            } finally {
                btn.disabled = false; btn.innerText = 'Change Password';
            }
        });
    }

    const secSetupForm = document.getElementById('sec-setup-form');
    if (secSetupForm) {
        // Disable setup if already configured
        (async () => {
            try {
                const configured = await isSecurityConfigured('admin');
                if (configured) {
                    secSetupForm.querySelectorAll('input, button').forEach(i => i.disabled = true);
                    secSetupForm.insertAdjacentHTML('beforeend', '<p style="color:var(--text-secondary)">Security questions already configured.</p>');
                }
            } catch (e) { console.log(e); }
        })();

        secSetupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('setup-sec-btn');
            btn.disabled = true; btn.innerText = 'Saving...';
            try {
                const a1 = document.getElementById('ans-q1').value;
                const a2 = document.getElementById('ans-q2').value;
                const a3 = document.getElementById('ans-q3').value;
                await setSecurityAnswers('admin', { q1: a1, q2: a2, q3: a3 });
                alert('Security answers saved. They are stored hashed and cannot be viewed later.');
                secSetupForm.reset();
                secSetupForm.querySelectorAll('input, button').forEach(i => i.disabled = true);
            } catch (err) {
                alert(err.message || 'Failed to save security answers');
            } finally {
                btn.disabled = false; btn.innerText = 'Save Security Answers';
            }
        });
    }
});
