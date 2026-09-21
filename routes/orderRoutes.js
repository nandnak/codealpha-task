const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById
} = require('../controllers/orderController');
const { optionalAuth, protect } = require('../middleware/authMiddleware');

router.post('/', optionalAuth, createOrder);
router.get('/myorders', optionalAuth, getMyOrders);
router.get('/:id', getOrderById);

module.exports = router;
