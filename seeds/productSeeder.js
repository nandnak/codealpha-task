const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('../models/Product');
const connectDB = require('../config/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // fallback to root

const sampleProducts = [
  {
    name: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    description: 'Industry-leading noise cancellation with two processors and 8 microphones. Ultra-comfortable lightweight design with up to 30 hours battery life and quick charging.',
    price: 399.99,
    category: 'Electronics',
    stock: 25,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Apple MacBook Air M2 (13-inch)',
    description: 'Strikingly thin design with fast 8-core CPU and 10-core GPU. Liquid Retina display, 1080p FaceTime HD camera, and up to 18 hours battery life.',
    price: 1099.00,
    category: 'Electronics',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Keychron K2 Wireless Mechanical Keyboard',
    description: '75% layout compact Bluetooth mechanical keyboard engineered for Mac and Windows. Gateron G Pro mechanical switches with RGB backlighting.',
    price: 89.99,
    category: 'Accessories',
    stock: 40,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Logitech MX Master 3S Ergonomic Mouse',
    description: 'Quiet Click technology with 8,000 DPI track-on-glass sensor. MagSpeed electromagnetic scrolling delivers remarkable speed and precision.',
    price: 99.99,
    category: 'Accessories',
    stock: 35,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Nike Air Zoom Pegasus 40 Running Shoes',
    description: 'Springy ride for any run with breathable engineered mesh upper, dual Zoom Air units, and responsive Nike React foam technology.',
    price: 130.00,
    category: 'Footwear',
    stock: 50,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Hydro Flask 32 oz Wide Mouth Bottle',
    description: 'TempShield double-wall vacuum insulation keeps beverages cold up to 24 hours and hot up to 12 hours. BPA-free 18/8 pro-grade stainless steel.',
    price: 44.95,
    category: 'Lifestyle',
    stock: 60,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Bellroy Classic Leather Everyday Backpack',
    description: 'Modern 20L backpack crafted with sustainably sourced leather and water-resistant recycled fabric. Padded sleeve fits laptops up to 16 inches.',
    price: 169.00,
    category: 'Accessories',
    stock: 20,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Fossil Gen 6 Smartwatch',
    description: 'Snapdragon Wear 4100+ platform, SpO2 sensor, continuous heart rate tracking, customizable watch faces, and rapid charging to 80% in 30 minutes.',
    price: 229.00,
    category: 'Wearables',
    stock: 18,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Breville Barista Touch Espresso Machine',
    description: 'Automated touchscreen menu allows you to easily select classic cafe favorites. ThermoJet heating system achieves optimum extraction temperature in 3 seconds.',
    price: 999.95,
    category: 'Home & Kitchen',
    stock: 10,
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Kindle Paperwhite 16GB (6.8-inch Display)',
    description: 'Glare-free 300 ppi display, adjustable warm light, waterproof design, and battery that lasts up to 10 weeks on a single charge.',
    price: 149.99,
    category: 'Electronics',
    stock: 30,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
  }
];

const seedProducts = async () => {
  try {
    console.log('🔄 Connecting to database for seeding...');
    await connectDB();

    // Check if --destroy flag was passed
    if (process.argv.includes('--destroy')) {
      const deleteResult = await Product.deleteMany({});
      console.log(`🗑️ Destroy flag specified. Deleted ${deleteResult.deletedCount} existing products.`);
    }

    console.log(`📦 Processing ${sampleProducts.length} sample products...`);

    // Idempotent upsert: matches on unique product name so re-running won't create duplicates
    const operations = sampleProducts.map(product => ({
      updateOne: {
        filter: { name: product.name },
        update: {
          $set: {
            ...product,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await Product.bulkWrite(operations);

    console.log('\n================ SEEDING COMPLETE ================');
    console.log(`✨ Matched Existing : ${result.matchedCount}`);
    console.log(`✨ Inserted (New)    : ${result.upsertedCount}`);
    console.log(`✨ Modified         : ${result.modifiedCount}`);
    console.log(`📊 Total in Catalog : ${await Product.countDocuments()}`);
    console.log('===================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedProducts();
