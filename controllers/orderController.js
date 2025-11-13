import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';

class OrderController {
    // Получить заказы пользователя
    async getUserOrders(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user.id;

            const result = await Order.findByUserId(userId, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            // Добавляем элементы заказа для каждого заказа
            const ordersWithItems = await Promise.all(
                result.orders.map(async (order) => {
                    const items = await OrderItem.findByOrderId(order.id);
                    return {
                        ...order,
                        items
                    };
                })
            );

            res.json({
                success: true,
                data: ordersWithItems,
                pagination: result.pagination
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить заказ по ID
    async getOrderById(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findById(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Проверяем права доступа (пользователь может видеть только свои заказы, админ - все)
            if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const items = await OrderItem.findByOrderId(id);

            res.json({
                success: true,
                data: {
                    ...order,
                    items
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Создать новый заказ
    async createOrder(req, res) {
        try {
            const { items } = req.body; // items: [{ product_id, quantity }]

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Order items are required'
                });
            }

            let totalAmount = 0;
            const orderItems = [];

            // Проверяем наличие товаров и рассчитываем общую сумму
            for (const item of items) {
                const product = await Product.findById(item.product_id);
                
                if (!product) {
                    return res.status(400).json({
                        success: false,
                        message: `Product with ID ${item.product_id} not found`
                    });
                }

                if (product.stock_quantity < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Not enough stock for product: ${product.name}`
                    });
                }

                const itemTotal = product.price * item.quantity;
                totalAmount += itemTotal;

                orderItems.push({
                    product_id: item.product_id,
                    price_at_time: product.price,
                    quantity: item.quantity,
                    product_name: product.name
                });
            }

            // Создаем заказ
            const order = await Order.create({
                user_id: req.user.id,
                amount: totalAmount,
                status: 'pending'
            });

            // Создаем элементы заказа
            const orderItemsData = orderItems.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                price_at_time: item.price_at_time,
                quantity: item.quantity
            }));

            await OrderItem.createMultiple(orderItemsData);

            // Обновляем количество товаров на складе
            for (const item of items) {
                const product = await Product.findById(item.product_id);
                const newStock = product.stock_quantity - item.quantity;
                await Product.updateStock(item.product_id, newStock);
            }

            // Получаем полную информацию о заказе
            const fullOrder = await Order.findById(order.id);
            const orderItemsFull = await OrderItem.findByOrderId(order.id);

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: {
                    ...fullOrder,
                    items: orderItemsFull
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Обновить статус заказа (только для админа)
    async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }

            const order = await Order.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const updatedOrder = await Order.updateStatus(id, status);

            res.json({
                success: true,
                message: 'Order status updated successfully',
                data: updatedOrder
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить все заказы (для админа)
    async getAllOrders(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;

            const result = await Order.getAll({
                page: parseInt(page),
                limit: parseInt(limit),
                status: status || null
            });

            // Добавляем элементы заказа для каждого заказа
            const ordersWithItems = await Promise.all(
                result.orders.map(async (order) => {
                    const items = await OrderItem.findByOrderId(order.id);
                    return {
                        ...order,
                        items
                    };
                })
            );

            res.json({
                success: true,
                data: ordersWithItems,
                pagination: result.pagination
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
}

export default new OrderController();