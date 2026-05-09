import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Realtime: subscribe to new orders (for admin push notifications)
export const subscribeToNewOrders = (callback) => {
    const channel = supabase
        .channel('orders-realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => callback(payload.new)
        )
        .subscribe();
    return channel;
};

const SUPABASE_URL = 'https://bnkibplwmycspqiiuzkq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lpjhwjAfUnAmX7IpRa8_iA_D_WrO-Vf'; // Using the key provided

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Orders API ---
export const createOrder = async (orderData) => {
    const { data, error } = await supabase
        .from('orders')
        .insert([{
            customer_name: orderData.customerName,
            phone: '+250' + orderData.phone,
            items: orderData.items,
            type: orderData.type,
            address: orderData.address || 'N/A',
            status: 'pending'
        }])
        .select();

    if (error) throw error;
    return data[0];
};

export const getOrders = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const updateOrderStatus = async (orderId, status) => {
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

    if (error) throw error;
    return data;
};

// --- Products API ---
export const getProducts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data;
};

export const uploadProductImage = async (file) => {
    const fileName = `prod_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
        .from('Products')
        .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
        .from('Products')
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
};

export const createProduct = async (productData) => {
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name: productData.name,
            price: productData.price,
            category: productData.category,
            image_url: productData.image_url || null
        }])
        .select();

    if (error) throw error;
    return data[0];
};

export const updateProduct = async (productId, updateData) => {
    const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

    if (error) throw error;
    return data;
};

export const deleteProduct = async (productId) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (error) throw error;
    return true;
};

// --- Gallery API ---
export const uploadImage = async (fileDataUrl, description) => {
    // In a real app, you'd upload to Supabase Storage first
    // For now, we'll store the reference (or base64 if it's small, but reference is better)
    // Actually, let's try to do a real upload if possible, or just store the URL for now.
    const { data, error } = await supabase
        .from('gallery')
        .insert([{
            url: fileDataUrl,
            description: description
        }])
        .select();

    if (error) throw error;
    return data[0];
};

export const getGallery = async () => {
    const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const deleteImage = async (imageId) => {
    const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', imageId);

    if (error) throw error;
    return true;
};

// --- Auth ---
// Using Supabase Auth is better, but to keep the requested simple admin login:
export const login = async (username, password) => {
    // Use persisted admin credentials in localStorage so password can be changed
    const ADMIN_KEY = 'washington_admin_data';

    const getAdminData = () => {
        const raw = localStorage.getItem(ADMIN_KEY);
        if (!raw) {
            const def = { username: 'admin', password: 'washington2024' };
            localStorage.setItem(ADMIN_KEY, JSON.stringify(def));
            return def;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            const def = { username: 'admin', password: 'washington2024' };
            localStorage.setItem(ADMIN_KEY, JSON.stringify(def));
            return def;
        }
    };

    const admin = getAdminData();
    if (username === admin.username && password === admin.password) {
        localStorage.setItem('washington_admin_auth', 'true');
        return { success: true };
    }
    throw new Error('Invalid credentials');
};

export const logout = () => {
    localStorage.removeItem('washington_admin_auth');
    window.location.href = 'index.html';
};

export const checkAuth = () => {
    return localStorage.getItem('washington_admin_auth') === 'true';
};

// --- Admin management / password reset (local fallback) ---
export const requestPasswordReset = async (username) => {
    const ADMIN_KEY = 'washington_admin_data';
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) throw new Error('No admin user configured');
    const admin = JSON.parse(raw);
    if (username !== admin.username) throw new Error('User not found');

    // Create a short-lived token and persist it locally. In real app send via email.
    const token = Math.random().toString(36).slice(2, 10);
    const reset = { token, username, expires: Date.now() + 15 * 60 * 1000 };
    localStorage.setItem('washington_password_reset', JSON.stringify(reset));
    return token;
};

export const verifyResetToken = async (token) => {
    const raw = localStorage.getItem('washington_password_reset');
    if (!raw) throw new Error('Invalid or expired token');
    const reset = JSON.parse(raw);
    if (reset.token !== token) throw new Error('Invalid or expired token');
    if (Date.now() > reset.expires) throw new Error('Invalid or expired token');
    return reset.username;
};

export const resetPassword = async (token, newPassword) => {
    const username = await verifyResetToken(token);
    const ADMIN_KEY = 'washington_admin_data';
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) throw new Error('Admin data missing');
    const admin = JSON.parse(raw);
    if (admin.username !== username) throw new Error('User mismatch');
    admin.password = newPassword;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    localStorage.removeItem('washington_password_reset');
    return true;
};

export const changePassword = async (currentPassword, newPassword) => {
    const ADMIN_KEY = 'washington_admin_data';
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) throw new Error('Admin data missing');
    const admin = JSON.parse(raw);
    if (admin.password !== currentPassword) throw new Error('Current password incorrect');
    admin.password = newPassword;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    return true;
};

// --- Security questions (stored hashed) ---
const hashString = async (str) => {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const setSecurityAnswers = async (username, answers) => {
    // answers: { q1, q2, q3 }
    const q1 = (answers.q1 || '').trim().toLowerCase();
    const q2 = (answers.q2 || '').trim().toLowerCase();
    const q3 = (answers.q3 || '').trim().toLowerCase();
    if (!q1 || !q2 || !q3) throw new Error('All answers are required');

    const [h1, h2, h3] = await Promise.all([hashString(q1), hashString(q2), hashString(q3)]);

    // Try to save to Supabase table `admin_security` (username, q1_hash, q2_hash, q3_hash)
    try {
        const payload = { username, q1_hash: h1, q2_hash: h2, q3_hash: h3 };
        const { data, error } = await supabase.from('admin_security').upsert(payload).select();
        if (error) throw error;
        return true;
    } catch (err) {
        // Fallback: persist hashed answers locally (encrypted-ish) — stored but not readable
        localStorage.setItem('washington_admin_security', JSON.stringify({ username, q1_hash: h1, q2_hash: h2, q3_hash: h3 }));
        return true;
    }
};

export const verifySecurityAnswers = async (username, answers) => {
    const q1 = (answers.q1 || '').trim().toLowerCase();
    const q2 = (answers.q2 || '').trim().toLowerCase();
    const q3 = (answers.q3 || '').trim().toLowerCase();
    if (!q1 || !q2 || !q3) throw new Error('All answers are required');

    const [h1, h2, h3] = await Promise.all([hashString(q1), hashString(q2), hashString(q3)]);

    // Attempt to fetch from Supabase
    try {
        const { data, error } = await supabase.from('admin_security').select('*').eq('username', username).limit(1).single();
        if (error || !data) throw error || new Error('Not found');
        if (data.q1_hash === h1 && data.q2_hash === h2 && data.q3_hash === h3) return true;
        throw new Error('Security answers do not match');
    } catch (err) {
        // Fallback to localStorage
        const raw = localStorage.getItem('washington_admin_security');
        if (!raw) throw new Error('No security answers configured');
        const stored = JSON.parse(raw);
        if (stored.username !== username) throw new Error('User mismatch');
        if (stored.q1_hash === h1 && stored.q2_hash === h2 && stored.q3_hash === h3) return true;
        throw new Error('Security answers do not match');
    }
};

export const resetPasswordWithAnswers = async (username, answers, newPassword) => {
    const ok = await verifySecurityAnswers(username, answers);
    if (!ok) throw new Error('Verification failed');

    // Update local admin password (primary credential store in this demo)
    const ADMIN_KEY = 'washington_admin_data';
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) throw new Error('Admin data missing');
    const admin = JSON.parse(raw);
    if (admin.username !== username) throw new Error('User mismatch');
    admin.password = newPassword;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    return true;
};

export const isSecurityConfigured = async (username) => {
    try {
        const { data, error } = await supabase.from('admin_security').select('username').eq('username', username).limit(1).single();
        if (error || !data) return false;
        return true;
    } catch (err) {
        const raw = localStorage.getItem('washington_admin_security');
        if (!raw) return false;
        const stored = JSON.parse(raw);
        return stored.username === username;
    }
};
