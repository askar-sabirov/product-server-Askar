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

// Создание таблицы пользователей
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, async (err) => {
    if (err) {
        console.error('Error creating users table:', err.message);
    } else {
        console.log('Users table ready.');
        
        // Добавляем тестового администратора
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const adminUser = {
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin'
        };

        const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)`);
        
        insertUser.run([
            adminUser.username,
            adminUser.email,
            adminUser.password,
            adminUser.first_name,
            adminUser.last_name,
            adminUser.role
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

// Создание таблицы категорий с полем для изображения
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
        
        // Добавляем тестовые категории
        const categories = [
            { name: 'Electronics', description: 'Electronic devices and gadgets' },
            { name: 'Clothing', description: 'Fashion and apparel' },
            { name: 'Books', description: 'Books and literature' },
            { name: 'Home', description: 'Home and kitchen items' }
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

// Создание таблицы продуктов с полем для изображения
db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image TEXT,
    in_stock BOOLEAN DEFAULT 1,
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
        
        // Добавляем тестовые продукты
        const products = [
            { name: 'iPhone 15', category_id: 1, price: 999, description: 'Latest Apple smartphone', in_stock: 1, created_by: 1 },
            { name: 'MacBook Pro', category_id: 1, price: 1999, description: 'Professional laptop', in_stock: 1, created_by: 1 },
            { name: 'AirPods Pro', category_id: 1, price: 249, description: 'Wireless headphones', in_stock: 0, created_by: 1 },
            { name: 'T-Shirt', category_id: 2, price: 25, description: 'Cotton t-shirt', in_stock: 1, created_by: 1 },
            { name: 'JavaScript Book', category_id: 3, price: 35, description: 'Programming book', in_stock: 1, created_by: 1 }
        ];

        const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (name, category_id, price, description, in_stock, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
        
        products.forEach(product => {
            insertProduct.run([
                product.name, 
                product.category_id, 
                product.price, 
                product.description, 
                product.in_stock,
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

// Создаем папки для загрузок
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