const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * @desc    Fetch all products (supports optional category & search filter)
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Keyword search if provided
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let queryExec = Product.find(query);

    // Sorting
    if (sort === 'price-asc') {
      queryExec = queryExec.sort({ price: 1 });
    } else if (sort === 'price-desc') {
      queryExec = queryExec.sort({ price: -1 });
    } else {
      queryExec = queryExec.sort({ createdAt: -1 });
    }

    const products = await queryExec;

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error(`Error in getProducts: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
};

/**
 * @desc    Fetch single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: "${id}". Expected a 24-character hexadecimal string.`
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`Error in getProductById: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Public (No auth for now)
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;

    // Required fields validation
    const missingFields = [];
    if (!name || name.trim() === '') missingFields.push('name');
    if (!description || description.trim() === '') missingFields.push('description');
    if (price === undefined || price === null || price === '') missingFields.push('price');
    if (!category || category.trim() === '') missingFields.push('category');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(', ')}`
      });
    }

    // Number validation
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product price must be a valid non-negative number'
      });
    }

    const parsedStock = stock !== undefined ? Number(stock) : 0;
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product stock must be a valid non-negative number'
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      image: image && image.trim() !== '' ? image.trim() : undefined,
      category: category.trim(),
      stock: parsedStock
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error(`Error in createProduct: ${error.message}`);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating product',
      error: error.message
    });
  }
};

/**
 * @desc    Update an existing product
 * @route   PUT /api/products/:id
 * @access  Public (No auth for now)
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: "${id}"`
      });
    }

    // Validate numeric fields if provided
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Product price must be a valid non-negative number'
        });
      }
      req.body.price = price;
    }

    if (req.body.stock !== undefined) {
      const stock = Number(req.body.stock);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Product stock must be a valid non-negative number'
        });
      }
      req.body.stock = stock;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true, // Return modified document
        runValidators: true // Run schema validators on update
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error(`Error in updateProduct: ${error.message}`);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Public (No auth for now)
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: "${id}"`
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" deleted successfully`,
      data: {
        id: product._id
      }
    });
  } catch (error) {
    console.error(`Error in deleteProduct: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
