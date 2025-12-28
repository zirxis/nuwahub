# 🔧 Developer Integration Guide - NUWAHUB Login System

## For Developers: How to Extend & Deploy

This guide explains how to integrate the NUWAHUB login system with a real backend and database.

---

## 📋 Table of Contents
1. [Backend Setup](#backend-setup)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Deployment](#deployment)
6. [Security Best Practices](#security-best-practices)

---

## Backend Setup

### Option 1: Node.js + Express (Recommended)

#### Step 1: Install Dependencies
```bash
npm init -y
npm install express bcryptjs jsonwebtoken dotenv mongoose cors
npm install --save-dev nodemon
```

#### Step 2: Create `.env` file
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nuwahub
JWT_SECRET=your_super_secret_key_here_change_in_production
JWT_EXPIRE=7d
```

#### Step 3: Basic Server Setup
```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('DB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

#### Step 4: User Model
```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false // Don't return password by default
    },
    userType: {
        type: String,
        enum: ['student', 'professor', 'admin'],
        default: 'student'
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    notifications: {
        type: Boolean,
        default: true
    },
    privacy: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public'
    },
    lastPasswordChange: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

#### Step 5: Authentication Routes
```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, userType } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide all required fields' 
            });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Create user
        user = await User.create({
            name,
            email,
            password,
            userType: userType || 'student'
        });

        // Create JWT token
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide email and password' 
            });
        }

        // Find user and check password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                joinDate: user.joinDate
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No token provided' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
}

module.exports = router;
```

---

## Database Schema

### MongoDB with Mongoose

```javascript
// User Collection Structure
{
    _id: ObjectId,
    name: String,           // User's full name
    email: String,          // Unique email
    password: String,       // Hashed password (bcrypt)
    userType: String,       // 'student' | 'professor' | 'admin'
    joinDate: Date,         // Account creation date
    notifications: Boolean, // Email notifications enabled
    privacy: String,        // 'public' | 'friends' | 'private'
    lastPasswordChange: Date,
    createdAt: Date,
    updatedAt: Date
}
```

### SQL Alternative (PostgreSQL)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) DEFAULT 'student',
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notifications BOOLEAN DEFAULT true,
    privacy VARCHAR(50) DEFAULT 'public',
    last_password_change TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/update` | Update user profile |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password/:token` | Reset password with token |

### Request/Response Examples

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
    "name": "محمد علي",
    "email": "student@example.com",
    "password": "password123",
    "userType": "student"
}

Response (201):
{
    "success": true,
    "message": "Account created successfully",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "id": "507f1f77bcf86cd799439011",
        "name": "محمد علي",
        "email": "student@example.com",
        "userType": "student"
    }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
    "email": "student@example.com",
    "password": "password123"
}

Response (200):
{
    "success": true,
    "message": "Logged in successfully",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "id": "507f1f77bcf86cd799439011",
        "name": "محمد علي",
        "email": "student@example.com",
        "userType": "student",
        "joinDate": "2024-01-15T10:30:00Z"
    }
}
```

---

## Frontend Integration

### Update auth.js for Backend

Replace the localStorage-based functions with API calls:

```javascript
// js/auth.js (Updated for Backend)

const API_URL = 'http://localhost:5000/api/auth';

// Register with backend
async function registerUser(name, email, userType, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                userType,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store token
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true, message: 'تم التسجيل بنجاح' };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Login with backend
async function loginUser(email, password, rememberMe = false) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store token and user
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }
            return { success: true, message: 'تم تسجيل الدخول بنجاح' };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get current user from backend
async function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

// Logout
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    window.location.href = 'login.html';
}

// Update user data
async function updateUserData(updatedUser) {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch(`${API_URL}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedUser)
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
}
```

---

## Deployment

### Deploy to Heroku (Node.js Backend)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add MongoDB Atlas
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your_secret_key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Deploy Frontend to Netlify

```bash
# Build (if using build tools)
npm run build

# Deploy
netlify deploy --prod

# Or use GitHub integration for auto-deploy
```

### Update API URL in Frontend

Create `config.js`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export default API_URL;
```

---

## Security Best Practices

### ✅ DO

1. **Hash Passwords** - Use bcrypt with salt rounds 10+
2. **Use HTTPS** - Always in production
3. **Validate Input** - Server-side validation required
4. **JWT Expiration** - Set reasonable expiry times
5. **Rate Limiting** - Prevent brute force attacks
6. **CORS Configuration** - Only allow trusted origins
7. **Secure Cookies** - Use HttpOnly, Secure flags
8. **Environment Variables** - Store secrets safely
9. **SQL Injection Prevention** - Use parameterized queries
10. **XSS Prevention** - Sanitize and escape data

### ❌ DON'T

1. ❌ Store passwords in plain text
2. ❌ Expose sensitive data in client-side code
3. ❌ Use weak JWT secrets
4. ❌ Allow unlimited login attempts
5. ❌ Skip server-side validation
6. ❌ Commit `.env` file to git
7. ❌ Use old cryptographic algorithms
8. ❌ Trust client-side validation alone
9. ❌ Log sensitive information
10. ❌ Disable CORS entirely (use specific origins)

### Helmet.js (Secure Headers)

```javascript
const helmet = require('helmet');
app.use(helmet());

// Additional security
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize()); // Prevent NoSQL injection
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123","userType":"student"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Get Current User (replace TOKEN)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Create new workspace
2. Import the requests above
3. Use environment variables for base URL and token
4. Test each endpoint

---

## Monitoring & Logging

### Winston Logger

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Use in routes
logger.info('User registered', { userId: user._id, email: user.email });
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Add frontend URL to CORS whitelist |
| Token expired | Refresh token mechanism or re-login |
| DB connection fails | Check MongoDB connection string |
| Bcrypt errors | Ensure bcryptjs is installed, not bcrypt |
| JWT errors | Verify secret key matches |

---

## Additional Resources

- [Mongoose Documentation](https://mongoosejs.com)
- [JWT Guide](https://jwt.io)
- [OWASP Security](https://owasp.org)
- [Express.js Best Practices](https://expressjs.com)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

**Happy coding! Your authentication system is ready for production.** 🚀

For questions or issues, refer back to the main documentation or code comments.
