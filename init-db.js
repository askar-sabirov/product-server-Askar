import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

// Создаем папки для загрузок
const createUploadsDirectories = async () => {
    try {
        await mkdir(join(__dirname, 'uploads'), { recursive: true });
        await mkdir(join(__dirname, 'uploads/categories'), { recursive: true });
        await mkdir(join(__dirname, 'uploads/products'), { recursive: true });
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

// Создание таблицы категорий с полем для изображения
db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)`);
        
        categories.forEach(category => {
            insertCategory.run([category.name, category.description], (err) => {
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id)
)`, (err) => {
    if (err) {
        console.error('Error creating products table:', err.message);
    } else {
        console.log('Products table ready.');
        
        // Добавляем тестовые продукты
        const products = [
            { name: 'iPhone 15', category_id: 1, price: 999, description: 'Latest Apple smartphone', in_stock: 1 },
            { name: 'MacBook Pro', category_id: 1, price: 1999, description: 'Professional laptop', in_stock: 1 },
            { name: 'AirPods Pro', category_id: 1, price: 249, description: 'Wireless headphones', in_stock: 0 },
            { name: 'T-Shirt', category_id: 2, price: 25, description: 'Cotton t-shirt', in_stock: 1 },
            { name: 'JavaScript Book', category_id: 3, price: 35, description: 'Programming book', in_stock: 1 }
        ];

        const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (name, category_id, price, description, in_stock) VALUES (?, ?, ?, ?, ?)`);
        
        products.forEach(product => {
            insertProduct.run([
                product.name, 
                product.category_id, 
                product.price, 
                product.description, 
                product.in_stock
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
    }
});