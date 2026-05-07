import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

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
        .from('products')
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
    if (username === 'admin' && password === 'washington2024') {
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
