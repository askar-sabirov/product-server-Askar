import express from 'express';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware для парсинга JSON
app.use(express.json());

// Массив товаров (временное хранилище)
let products = [
    {
        id: 1,
        name: "iPhone 15",
        category: "Electronics",
        price: 999,
        description: "Latest Apple smartphone",
        inStock: true
    },
    {
        id: 2,
        name: "MacBook Pro",
        category: "Electronics",
        price: 1999,
        description: "Professional laptop",
        inStock: true
    },
    {
        id: 3,
        name: "AirPods Pro",
        category: "Electronics",
        price: 249,
        description: "Wireless headphones",
        inStock: false
    }
];

// Вспомогательные функции
const generateId = () => {
    return products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
};

// 📋 1. Получить все товары
app.get('/products', (req, res) => {
    try {
        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// 🔍 2. Получить товар по ID
app.get('/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        const product = products.find(p => p.id === id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ➕ 3. Добавить новый товар
app.post('/products', (req, res) => {
    try {
        const { name, category, price, description, inStock } = req.body;

        // Валидация обязательных полей
        if (!name || !category || !price) {
            return res.status(400).json({
                success: false,
                message: 'Name, category and price are required fields'
            });
        }

        // Валидация цены
        if (isNaN(price) || price < 0) {
            return res.status(400).json({
                success: false,
                message: 'Price must be a positive number'
            });
        }

        const newProduct = {
            id: generateId(),
            name: name.toString().trim(),
            category: category.toString().trim(),
            price: parseFloat(price),
            description: description ? description.toString().trim() : '',
            inStock: inStock !== undefined ? Boolean(inStock) : true
        };

        products.push(newProduct);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: newProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ✏️ 4. Обновить товар по ID
app.put('/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        const productIndex = products.findIndex(p => p.id === id);

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const { name, category, price, description, inStock } = req.body;

        // Валидация цены если она передана
        if (price !== undefined && (isNaN(price) || price < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Price must be a positive number'
            });
        }

        // Обновляем только переданные поля
        const updatedProduct = {
            ...products[productIndex],
            ...(name !== undefined && { name: name.toString().trim() }),
            ...(category !== undefined && { category: category.toString().trim() }),
            ...(price !== undefined && { price: parseFloat(price) }),
            ...(description !== undefined && { description: description.toString().trim() }),
            ...(inStock !== undefined && { inStock: Boolean(inStock) })
        };

        products[productIndex] = updatedProduct;

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// 🗑️ 5. Удалить товар по ID
app.delete('/products/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        const productIndex = products.findIndex(p => p.id === id);

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const deletedProduct = products.splice(productIndex, 1)[0];

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
            data: deletedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ℹ️ 6. Информация об API
app.get('/', (req, res) => {
    res.json({
        message: 'Products API',
        endpoints: {
            'GET /products': 'Get all products',
            'GET /products/:id': 'Get product by ID',
            'POST /products': 'Create new product',
            'PUT /products/:id': 'Update product by ID',
            'DELETE /products/:id': 'Delete product by ID'
        }
    });
});

// ✅ ИСПРАВЛЕННЫЙ КОД: Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}`);
});