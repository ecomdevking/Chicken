const { connectToDatabase, disconnectFromDatabase, User } = require('./database');

async function testMongoDB() {
  try {
    console.log('Testing MongoDB connection...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✓ Connected to MongoDB');
    
    // Test creating a user
    const testUser = new User({
      userId: 'test-user-' + Date.now(),
      totalAmount: 100000.00
    });
    
    await testUser.save();
    console.log('✓ Created test user:', testUser.userId);
    
    // Test finding the user
    const foundUser = await User.findOne({ userId: testUser.userId });
    console.log('✓ Found user:', foundUser.userId, 'Balance:', foundUser.totalAmount);
    
    // Test updating the user
    foundUser.totalAmount = 150000.00;
    await foundUser.save();
    console.log('✓ Updated user balance to:', foundUser.totalAmount);
    
    // Test deleting the user
    await User.deleteOne({ userId: testUser.userId });
    console.log('✓ Deleted test user');
    
    console.log('All MongoDB tests passed!');
    
  } catch (error) {
    console.error('MongoDB test failed:', error);
  } finally {
    await disconnectFromDatabase();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testMongoDB();
