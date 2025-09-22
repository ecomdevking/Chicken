const express = require('express')
const cors = require('cors')
const { AnalysisBetStatus, SelectLevel } = require('./gameController/calculator')

const app = express()
app.use(cors())
app.use(express.json())

// Try to connect to MongoDB, fallback to in-memory storage if not available
let User, connectToDatabase, disconnectFromDatabase;

async function initializeDatabase() {
  try {
    const db = require('./db/database');
    User = db.User;
    connectToDatabase = db.connectToDatabase;
    disconnectFromDatabase = db.disconnectFromDatabase;
    await connectToDatabase();
  } catch (error) {
    console.log('MongoDB not available, using fallback database');
    const fallback = require('./db/database-fallback');
    User = fallback.User;
    connectToDatabase = fallback.connectToDatabase;
    disconnectFromDatabase = fallback.disconnectFromDatabase;
    await connectToDatabase();
  }
}

// Initialize database on startup
initializeDatabase()

function randomUserId(){
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Generate random value between 0 and 1
function generateRandomValue(){
  return Math.random()
}

// Generate random value that can be exactly 0 (for testing lose scenarios)
function generateRandomValueForTesting(){
  // For testing purposes, sometimes return exactly 0 to trigger lose
  // In production, you might want to use a different approach
  const testValue = Math.random()
  if (testValue < 0.1) { // 10% chance to return 0 for testing
    return 0
  }
  return Math.random()
}

// Calculate win probability based on odds and step (user's custom formula)
// Probability = (1 / odd * 100) - (odd * step)
// Clamped to [0,100]
function calculateWinProbability(odd, step){
  if (!odd || odd <= 0) return 0
  const base = (1 / odd) * 100
  const penalty = odd * (Number(step) || 0)
  const p = base - penalty
  return Math.max(0, Math.min(100, p))
}

// Determine win/lose based on random value and odds
function determineBetResult(randomValue, odd, step){
  const winProbability = calculateWinProbability(odd, step)
  const loseProbability = 100 - winProbability
  
  // If random value is between 0 and winProbability%, it's a win
  // If random value is between winProbability% and 100%, it's a lose
  return randomValue <= (winProbability / 100)
}

// Create demo user (if not provided) and/or return current user data
app.post('/api/session', async (req, res) => {
  console.log('[SESSION] create/open request:', req.body)
  const { userId } = req.body || {}
  
  try {
    let user;
    
    if (userId) {
      // Try to find existing user
      user = await User.findOne({ userId });
    }
    
    if (!user) {
      // Create new user with initial amount of 100000.00
      const newUserId = userId || randomUserId();
      user = new User({
        userId: newUserId,
        totalAmount: 100000.00
      });
      await user.save();
      console.log('[SESSION] Created new user:', newUserId);
    }
    
    const resp = { userId: user.userId, totalAmount: user.totalAmount }
    console.log('[SESSION] response:', resp)
    res.json(resp)
  } catch (error) {
    console.error('[SESSION] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Delete demo user (called when user leaves)
app.post('/api/session/delete', async (req, res) => {
  const { userId } = req.body || {}
  console.log('[SESSION] delete request:', { userId })
  
  try {
    if (userId) {
      await User.deleteOne({ userId });
      console.log('[SESSION] Deleted user:', userId);
    }
    res.json({ ok: true })
  } catch (error) {
    console.error('[SESSION] Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Validate bet amount per requirements
function validateBetAmount(amount){
  if (typeof amount !== 'number' || !isFinite(amount)) return 'Invalid bet amount'
  if (amount < 2) return 'Min bet amount is 2'
  if (amount > 200) return 'Max bet amount is 200'
  return null
}

// Resolve a coin click bet
// body: { userId, betAmount, betLevel: 'low'|'medium'|'high', betSteps: number, totalAmount, extra }
app.post('/api/bet', async (req, res) => {
  const { userId, betAmount, betLevel, betSteps, totalAmount, extra } = req.body || {}
  console.log('[BET] request:', { userId, betAmount, betLevel, betSteps, totalAmount, extra })
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'Invalid userId' })
    }
    
    const err = validateBetAmount(betAmount)
    if (err) return res.status(400).json({ error: err })

    const user = await User.findOne({ userId })
    if (!user) {
      return res.status(400).json({ error: 'User not found' })
    }
    
    // Validate client-reported balance when provided; otherwise use server stored
    const balanceToCheck = typeof totalAmount === 'number' ? totalAmount : user.totalAmount
    if (balanceToCheck < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

  const odd = SelectLevel(betLevel, betSteps)
  
  // Generate random value between 0 and 1
  // Use testing function for first coin to ensure we can test lose scenarios
  const randomValue = (betSteps === 1 && extra === 'game_start') ? generateRandomValueForTesting() : generateRandomValue()
  
  // Calculate win probability as percentage
  const winProbabilityPercent = calculateWinProbability(odd, betSteps)
  const loseProbabilityPercent = 100 - winProbabilityPercent
  
  // Determine win/lose based on random value and odds
  const isWin = determineBetResult(randomValue, odd, betSteps)
  const betResult = isWin ? 'win' : 'lose'

  // Compute projected totals without mutating server balance yet.
  // Balance will be updated only on cashout via a dedicated endpoint.
  const analysis = AnalysisBetStatus(betResult, betAmount, betLevel, betSteps, user.totalAmount)
  const winAmount = analysis.winAmount || 0
  const lossAmount = analysis.lossAmount || 0
  
  // Calculate earning amount (what user would earn if they cashout now)
  const earningAmount = isWin ? winAmount : 0

    const response = {
      userId,
      totalAmount: user.totalAmount,
      earningAmount,
      betResult,
      winAmount,
      lossAmount,
      betAmount,
      betLevel,
      betSteps,
      odd,
      randomValue, // The generated random value (0-1)
      winProbabilityPercent, // Win probability as percentage
      loseProbabilityPercent, // Lose probability as percentage
      p: winProbabilityPercent / 100, // Win probability as decimal (for backward compatibility)
      extra // Echo back the extra field
    }
    console.log('[BET] result:', {
      userId,
      betSteps,
      odd,
      randomValue,
      winProbabilityPercent,
      betResult,
      winAmount,
      lossAmount,
      earningAmount,
      serverTotal: user.totalAmount,
      extra
    })
    res.json(response)
  } catch (error) {
    console.error('[BET] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Cashout: persist earnings to server balance
app.post('/api/cashout', async (req, res) => {
  const { userId, amount } = req.body || {}
  console.log('[CASHOUT] request:', { userId, amount })
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'Invalid userId' })
    }
    
    const amt = Number(amount)
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }
    
    const user = await User.findOne({ userId })
    if (!user) {
      return res.status(400).json({ error: 'User not found' })
    }
    
    user.totalAmount += amt
    await user.save()
    
    const resp = { userId, totalAmount: user.totalAmount }
    console.log('[CASHOUT] response:', resp)
    res.json(resp)
  } catch (error) {
    console.error('[CASHOUT] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

const port = process.env.PORT || 4000
const server = app.listen(port, () => console.log('Server listening on', port))

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });
});
