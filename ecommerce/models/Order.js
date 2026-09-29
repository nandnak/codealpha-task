const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: '' }
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, default: 'US' }
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'card', 'upi'],
      default: 'cod'
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Processing'
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
