import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

// Создаем папки для загрузок
const createUploadsDirectories = async () => {
    try {
        await mkdir(join(__dirname, 'uploads'), { recursive: true });
        await mkdir(join(__dirname, 'uploads/categories'), { recursive: true });
        await mkdir(join(__dirname, 'uploads/products'), { recursive: true });
        await mkdir(join(__dirname, 'uploads/users'), { recursive: true });
        console.log('Upload directories created.');
    } catch (err) {
        console.error('Error creating upload directories:', err.message);
    }
};

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Создание таблицы пользователей с полем role
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'customer',
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, async (err) => {
    if (err) {
        console.error('Error creating users table:', err.message);
    } else {
        console.log('Users table ready.');
        
        // Хешируем пароль один раз
        const hashedPassword = await bcrypt.hash('password123', 12);
        
        // Создаем пользователей с разными ролями
        const users = [
            {
                username: 'admin',
                email: 'admin@example.com',
                password: hashedPassword,
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                is_verified: 1
            },
            {
                username: 'moderator',
                email: 'moderator@example.com',
                password: hashedPassword,
                first_name: 'Moderator',
                last_name: 'User',
                role: 'moderator',
                is_verified: 1
            },
            {
                username: 'seller1',
                email: 'seller1@example.com',
                password: hashedPassword,
                first_name: 'Seller',
                last_name: 'One',
                role: 'seller',
                is_verified: 1
            },
            {
                username: 'customer1',
                email: 'customer1@example.com',
                password: hashedPassword,
                first_name: 'Customer',
                last_name: 'One',
                role: 'customer',
                is_verified: 1
            },
            {
                username: 'customer2',
                email: 'customer2@example.com',
                password: hashedPassword,
                first_name: 'Customer',
                last_name: 'Two',
                role: 'customer',
                is_verified: 0  // Не верифицирован
            }
        ];

        const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, email, password, first_name, last_name, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
        for (const user of users) {
            insertUser.run([
                user.username,
                user.email,
                user.password,
                user.first_name,
                user.last_name,
                user.role,
                user.is_verified
            ], (err) => {
                if (err) {
                    console.error('Error inserting user:', user.username, err.message);
                }
            });
        }
        
        insertUser.finalize();
        console.log('Test users created with different roles.');
        console.log('All users have password: password123');
    }
});

// Создание таблицы категорий
db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
)`, (err) => {
    if (err) {
        console.error('Error creating categories table:', err.message);
    } else {
        console.log('Categories table ready.');
        
        const categories = [
            { name: 'Electronics', description: 'Electronic devices and gadgets' },
            { name: 'Clothing', description: 'Fashion and apparel' },
            { name: 'Books', description: 'Books and literature' },
            { name: 'Home & Kitchen', description: 'Home and kitchen items' },
            { name: 'Sports', description: 'Sports equipment and apparel' }
        ];

        const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories (name, description, created_by) VALUES (?, ?, ?)`);
        
        categories.forEach(category => {
            insertCategory.run([category.name, category.description, 1], (err) => {
                if (err) {
                    console.error('Error inserting category:', err.message);
                }
            });
        });
        
        insertCategory.finalize();
    }
});

// Создание таблицы продуктов
db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
)`, (err) => {
    if (err) {
        console.error('Error creating products table:', err.message);
    } else {
        console.log('Products table ready.');
        
        const products = [
            { name: 'iPhone 15 Pro', description: 'Latest Apple smartphone with A17 Pro chip', price: 999, category_id: 1, stock_quantity: 50, created_by: 3 },
            { name: 'MacBook Pro 16"', description: 'Professional laptop for developers', price: 2499, category_id: 1, stock_quantity: 25, created_by: 3 },
            { name: 'Samsung Galaxy S24', description: 'Android flagship smartphone', price: 899, category_id: 1, stock_quantity: 30, created_by: 3 },
            { name: 'Premium Cotton T-Shirt', description: '100% cotton, comfortable fit', price: 29.99, category_id: 2, stock_quantity: 100, created_by: 3 },
            { name: 'JavaScript: The Definitive Guide', description: 'Comprehensive JavaScript book', price: 49.99, category_id: 3, stock_quantity: 40, created_by: 1 },
            { name: 'Smart Coffee Maker', description: 'WiFi enabled coffee machine', price: 129.99, category_id: 4, stock_quantity: 15, created_by: 3 },
            { name: 'Running Shoes', description: 'Professional running shoes', price: 89.99, category_id: 5, stock_quantity: 60, created_by: 3 },
            { name: 'Wireless Headphones', description: 'Noise cancelling headphones', price: 199.99, category_id: 1, stock_quantity: 35, created_by: 3 }
        ];

        const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (name, description, price, category_id, stock_quantity, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
        
        products.forEach(product => {
            insertProduct.run([
                product.name, 
                product.description, 
                product.price, 
                product.category_id, 
                product.stock_quantity,
                product.created_by
            ], (err) => {
                if (err) {
                    console.error('Error inserting product:', err.message);
                }
            });
        });
        
        insertProduct.finalize();
    }
});

// Создание таблицы заказов
db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
    if (err) {
        console.error('Error creating orders table:', err.message);
    } else {
        console.log('Orders table ready.');
        
        // Создаем тестовые заказы
        const orders = [
            { user_id: 4, amount: 199.98, status: 'completed' },
            { user_id: 4, amount: 89.99, status: 'shipped' },
            { user_id: 5, amount: 29.99, status: 'pending' }
        ];

        const insertOrder = db.prepare(`INSERT OR IGNORE INTO orders (user_id, amount, status) VALUES (?, ?, ?)`);
        
        orders.forEach(order => {
            insertOrder.run([order.user_id, order.amount, order.status], (err) => {
                if (err) {
                    console.error('Error inserting order:', err.message);
                }
            });
        });
        
        insertOrder.finalize();
    }
});

// Создание таблицы элементов заказа
db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id)
)`, (err) => {
    if (err) {
        console.error('Error creating order_items table:', err.message);
    } else {
        console.log('Order items table ready.');
        
        const orderItems = [
            { order_id: 1, product_id: 1, price_at_time: 999, quantity: 2 },
            { order_id: 2, product_id: 7, price_at_time: 89.99, quantity: 1 },
            { order_id: 3, product_id: 4, price_at_time: 29.99, quantity: 1 }
        ];

        const insertOrderItem = db.prepare(`INSERT OR IGNORE INTO order_items (order_id, product_id, price_at_time, quantity) VALUES (?, ?, ?, ?)`);
        
        orderItems.forEach(item => {
            insertOrderItem.run([item.order_id, item.product_id, item.price_at_time, item.quantity], (err) => {
                if (err) {
                    console.error('Error inserting order item:', err.message);
                }
            });
        });
        
        insertOrderItem.finalize();
    }
});

// Создание таблицы отзывов
db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
    if (err) {
        console.error('Error creating reviews table:', err.message);
    } else {
        console.log('Reviews table ready.');
        
        const reviews = [
            { product_id: 1, user_id: 4, text: 'Great phone! Excellent camera quality.', rating: 5 },
            { product_id: 1, user_id: 5, text: 'Battery life could be better', rating: 4 },
            { product_id: 4, user_id: 4, text: 'Very comfortable t-shirt, good quality', rating: 5 }
        ];

        const insertReview = db.prepare(`INSERT OR IGNORE INTO reviews (product_id, user_id, text, rating) VALUES (?, ?, ?, ?)`);
        
        reviews.forEach(review => {
            insertReview.run([review.product_id, review.user_id, review.text, review.rating], (err) => {
                if (err) {
                    console.error('Error inserting review:', err.message);
                }
            });
        });
        
        insertReview.finalize();
    }
});

// Создаем папки для загрузок
createUploadsDirectories();

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('\n✅ Database initialization completed!');
        console.log('\n🔑 Test Users Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👑 Admin:');
        console.log('  Username: admin');
        console.log('  Email: admin@example.com');
        console.log('  Password: password123');
        console.log('  Role: admin (full access)');
        console.log('\n🛡️ Moderator:');
        console.log('  Username: moderator');
        console.log('  Email: moderator@example.com');
        console.log('  Password: password123');
        console.log('  Role: moderator (content management)');
        console.log('\n🛍️ Seller:');
        console.log('  Username: seller1');
        console.log('  Email: seller1@example.com');
        console.log('  Password: password123');
        console.log('  Role: seller (product management)');
        console.log('\n👤 Customer 1 (verified):');
        console.log('  Username: customer1');
        console.log('  Email: customer1@example.com');
        console.log('  Password: password123');
        console.log('  Role: customer (shopping)');
        console.log('\n👤 Customer 2 (not verified):');
        console.log('  Username: customer2');
        console.log('  Email: customer2@example.com');
        console.log('  Password: password123');
        console.log('  Role: customer (needs email verification)');
        console.log('\n📊 Database Info:');
        console.log('  Products: 8 items');
        console.log('  Categories: 5 categories');
        console.log('  Orders: 3 orders with items');
        console.log('  Reviews: 3 reviews');
        console.log('\n🚀 Server will run on: http://localhost:8000');
    }
});