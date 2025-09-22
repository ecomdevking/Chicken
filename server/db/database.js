const mongoose = require('mongoose');

// MongoDB connection string - you can change this to your MongoDB instance
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chicken-crash-game';

// User schema for MongoDB
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 100000.00
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create User model
const User = mongoose.model('User', userSchema);

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.log('Please ensure MongoDB is running on your system.');
    console.log('You can start MongoDB with: mongod');
    console.log('Or install MongoDB if not already installed.');
    process.exit(1);
  }
}

// Disconnect from MongoDB
async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  User
};
