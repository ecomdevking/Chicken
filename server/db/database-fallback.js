// Fallback database implementation using in-memory storage
// This is used when MongoDB is not available

class FallbackUser {
  constructor(data) {
    this.userId = data.userId;
    this.totalAmount = data.totalAmount || 100000.00;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    // In-memory storage simulation
    this.updatedAt = new Date();
    fallbackUsers.set(this.userId, {
      userId: this.userId,
      totalAmount: this.totalAmount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
    return this;
  }

  static async findOne(query) {
    // Simulate database lookup
    const userId = query.userId;
    if (fallbackUsers.has(userId)) {
      const userData = fallbackUsers.get(userId);
      return new FallbackUser(userData);
    }
    return null;
  }

  static async deleteOne(query) {
    const userId = query.userId;
    return fallbackUsers.delete(userId);
  }
}

// In-memory storage
const fallbackUsers = new Map();

// Fallback functions
async function connectToDatabase() {
  console.log('Using fallback in-memory database (MongoDB not available)');
  console.log('To use MongoDB, please install and start MongoDB service');
}

async function disconnectFromDatabase() {
  console.log('Disconnected from fallback database');
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  User: FallbackUser
};
