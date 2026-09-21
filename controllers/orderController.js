const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * @desc    Create a new order & deduct product stock
 * @route   POST /api/orders
 * @access  Public / Optional Auth (Supports logged-in and guest checkouts)
 */
const createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod = 'cod',
      customer = {}
    } = req.body;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided in the cart'
      });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.city || !shippingAddress.zip) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full shipping details (Full Name, Address, City, Zip Code)'
      });
    }

    // 1. Verify products & check inventory stock in database
    const validatedItems = [];
    let itemsPrice = 0;

    for (const item of orderItems) {
      const productId = item.product || item.id || item._id;

      let productDoc = null;
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        productDoc = await Product.findById(productId);
      }

      if (productDoc) {
        if (productDoc.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${productDoc.name}". Only ${productDoc.stock} available in inventory.`
          });
        }

        const price = Number(productDoc.price);
        const qty = Number(item.quantity) || 1;
        itemsPrice += price * qty;

        validatedItems.push({
          product: productDoc._id,
          name: productDoc.name,
          image: productDoc.image || item.image,
          price: price,
          quantity: qty
        });
      } else {
        // Fallback for custom or direct item object
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        itemsPrice += price * qty;

        validatedItems.push({
          product: (productId && mongoose.Types.ObjectId.isValid(productId)) ? productId : undefined,
          name: item.name || 'Catalog Item',
          image: item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
          price: price,
          quantity: qty
        });
      }
    }

    // 2. Decrement inventory atomically for verified products
    for (const item of validatedItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // 3. Pricing calculations
    const shippingPrice = 0; // Free express shipping
    const totalPrice = Number((itemsPrice + shippingPrice).toFixed(2));

    // Generate readable random order number
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const isPaid = paymentMethod === 'card' || paymentMethod === 'upi';

    // 4. Create and save order in MongoDB
    const order = new Order({
      orderNumber,
      user: req.user ? req.user._id : undefined,
      customer: {
        name: shippingAddress.fullName || customer.name || (req.user ? req.user.name : 'Valued Customer'),
        email: customer.email || (req.user ? req.user.email : 'guest@example.com'),
        phone: customer.phone || ''
      },
      orderItems: validatedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        address: shippingAddress.address,
        city: shippingAddress.city,
        zip: shippingAddress.zip,
        country: shippingAddress.country || 'US'
      },
      paymentMethod,
      itemsPrice: Number(itemsPrice.toFixed(2)),
      shippingPrice,
      totalPrice,
      status: 'Processing',
      isPaid,
      paidAt: isPaid ? new Date() : undefined
    });

    const savedOrder = await order.save();

    res.status(201).json({
      success: true,
      message: `Order ${orderNumber} placed successfully!`,
      data: savedOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process order',
      error: error.message
    });
  }
};

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/myorders
 * @access  Private / Optional
 */
const getMyOrders = async (req, res) => {
  try {
    let query = {};

    if (req.user) {
      query = {
        $or: [
          { user: req.user._id },
          { 'customer.email': req.user.email.toLowerCase() }
        ]
      };
    } else {
      const email = req.query.email;
      if (email) {
        query = { 'customer.email': email.toLowerCase() };
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

/**
 * @desc    Get single order by ID or order number
 * @route   GET /api/orders/:id
 * @access  Public
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id).populate('user', 'name email');
    }

    if (!order) {
      order = await Order.findOne({ orderNumber: id }).populate('user', 'name email');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with identifier: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById
};
