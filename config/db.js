const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using Mongoose
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri || mongoUri.trim() === '') {
    const err = new Error('MONGODB_URI is not set in .env. Please configure your MongoDB Atlas connection string.');
    console.error(`❌ [MongoDB] ${err.message}`);
    throw err;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // Fast fail in 5s if host or network unreachable
    });

    console.log(`✅ [MongoDB] Connected successfully: ${conn.connection.host}`);
    console.log(`📦 [MongoDB] Database name: ${conn.connection.name || 'ecommerce'}`);
    return conn;
  } catch (error) {
    console.error(`❌ [MongoDB] Connection error: ${error.message}`);

    // Context-specific beginner-friendly diagnostic tips
    if (error.message.includes('querySrv ENOTFOUND') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 [Diagnosis] Cluster host not found:');
      console.error('   Your connection string contains a hostname that does not exist on DNS.');
      console.error('   Make sure you copied your full cluster URI from MongoDB Atlas (e.g. cluster0.abcde.mongodb.net instead of just cluster0.mongodb.net).\n');
    } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('\n💡 [Diagnosis] Authentication failed:');
      console.error('   The username or password in your MONGODB_URI is incorrect.');
      console.error('   Verify your database user credentials in MongoDB Atlas under Security > Database Access.\n');
    } else if (error.message.includes('timed out') || error.message.includes('ETIMEDOUT') || error.message.includes('Server selection timed out')) {
      console.error('\n💡 [Diagnosis] Connection timed out:');
      console.error('   Your current IP address may not be allowed in MongoDB Atlas.');
      console.error('   Go to Security > Network Access in MongoDB Atlas and add your IP or allow access from anywhere (0.0.0.0/0).\n');
    }

    throw error;
  }
};

module.exports = connectDB;
