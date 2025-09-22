const { connectToDatabase, disconnectFromDatabase, User } = require('./database-fallback');

async function testFallbackDatabase() {
  try {
    console.log('Testing fallback database...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✓ Connected to fallback database');
    
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
    
    console.log('All fallback database tests passed!');
    
  } catch (error) {
    console.error('Fallback database test failed:', error);
  } finally {
    await disconnectFromDatabase();
    console.log('Disconnected from fallback database');
  }
}

// Run the test
testFallbackDatabase();
