import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

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

// Таблица пользователей
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'user',
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
        
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const adminUser = {
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_verified: 1
        };

        const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, email, password, first_name, last_name, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
        insertUser.run([
            adminUser.username,
            adminUser.email,
            adminUser.password,
            adminUser.first_name,
            adminUser.last_name,
            adminUser.role,
            adminUser.is_verified
        ], (err) => {
            if (err) {
                console.error('Error inserting admin user:', err.message);
            } else {
                console.log('Admin user created: admin / admin123');
            }
        });
        
        insertUser.finalize();
    }
});

// Таблица категорий
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
            { name: 'Home & Kitchen', description: 'Home and kitchen items' }
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

// Таблица продуктов
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
            { name: 'iPhone 15', description: 'Latest Apple smartphone', price: 999, category_id: 1, stock_quantity: 50 },
            { name: 'MacBook Pro', description: 'Professional laptop', price: 1999, category_id: 1, stock_quantity: 25 },
            { name: 'Samsung Galaxy S24', description: 'Android smartphone', price: 899, category_id: 1, stock_quantity: 30 },
            { name: 'Cotton T-Shirt', description: 'Comfortable cotton t-shirt', price: 25, category_id: 2, stock_quantity: 100 },
            { name: 'JavaScript Book', description: 'Programming book', price: 35, category_id: 3, stock_quantity: 40 },
            { name: 'Coffee Maker', description: 'Automatic coffee machine', price: 120, category_id: 4, stock_quantity: 15 }
        ];

        const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (name, description, price, category_id, stock_quantity, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
        
        products.forEach(product => {
            insertProduct.run([
                product.name, 
                product.description, 
                product.price, 
                product.category_id, 
                product.stock_quantity,
                1
            ], (err) => {
                if (err) {
                    console.error('Error inserting product:', err.message);
                }
            });
        });
        
        insertProduct.finalize();
    }
});

// Таблица заказов
db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
    if (err) {
        console.error('Error creating orders table:', err.message);
    } else {
        console.log('Orders table ready.');
    }
});

// Таблица элементов заказа
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
    }
});

// Таблица отзывов
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
    }
});

createUploadsDirectories();

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database initialization completed.');
        console.log('Default admin credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Email: admin@example.com');
    }
});