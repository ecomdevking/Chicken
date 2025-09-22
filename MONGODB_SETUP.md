# MongoDB Setup Instructions

## Prerequisites
1. Install MongoDB on your system
   - Windows: Download from https://www.mongodb.com/try/download/community
   - macOS: `brew install mongodb-community`
   - Linux: Follow official MongoDB installation guide

## Setup Steps

### 1. Start MongoDB Service
```bash
# Windows (if installed as service)
net start MongoDB

# macOS/Linux
mongod --dbpath /path/to/your/db
# or if installed as service
sudo systemctl start mongod
```

### 2. Environment Variables (Optional)
Create a `.env` file in the project root:
```
MONGODB_URI=mongodb://localhost:27017/chicken-crash-game
PORT=4000
```

### 3. Run the Application
```bash
# Install dependencies
npm install

# Start the server (MongoDB will be used automatically)
npm run start:server

# Or start both frontend and backend
npm run dev:all
```

## Database Schema

The application uses the following MongoDB schema:

### User Collection
```javascript
{
  userId: String (unique, indexed),
  totalAmount: Number (default: 100000.00),
  createdAt: Date,
  updatedAt: Date
}
```

## Features

- **Persistent User Data**: User balances are stored in MongoDB
- **Initial Balance**: New users start with $100,000.00
- **Automatic Connection**: MongoDB connection is established on server startup
- **Graceful Shutdown**: Proper cleanup on server termination

## Troubleshooting

### Connection Issues
1. Ensure MongoDB is running
2. Check if the default port 27017 is available
3. Verify the connection string in your environment

### Database Access
You can connect to MongoDB using:
```bash
mongo
# or
mongosh
```

Then switch to the database:
```javascript
use chicken-crash-game
db.users.find()
```
