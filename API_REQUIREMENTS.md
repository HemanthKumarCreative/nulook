# API Requirements for NUSENSE TryON Extension

## Overview
This document outlines the API requirements for implementing a complete authentication system for the NUSENSE TryON Chrome Extension. The extension currently uses simulated authentication and needs real backend APIs for production use.

## Base URL
```
https://try-on-server-v1-294135365335.europe-west9.run.app
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. User Registration API

### Endpoint
```
POST /api/auth/register
```

### Description
Creates a new user account with email and password authentication.

### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Request Validation
- **name**: Required, string, min 2 characters, max 100 characters
- **email**: Required, valid email format, unique in database
- **password**: Required, string, min 6 characters, max 128 characters

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://via.placeholder.com/40x40/4285F4/FFFFFF?text=JD",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Email is required",
    "password": "Password must be at least 6 characters"
  }
}
```

#### 409 Conflict - Email Already Exists
```json
{
  "success": false,
  "message": "Email already registered",
  "error": "EMAIL_EXISTS"
}
```

---

## 2. User Login API

### Endpoint
```
POST /api/auth/login
```

### Description
Authenticates a user with email and password, returns JWT token.

### Request Body
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Request Validation
- **email**: Required, valid email format
- **password**: Required, string

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://via.placeholder.com/40x40/4285F4/FFFFFF?text=JD",
      "lastLoginAt": "2024-01-01T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Email is required",
    "password": "Password is required"
  }
}
```

#### 401 Unauthorized - Invalid Credentials
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error": "INVALID_CREDENTIALS"
}
```

#### 404 Not Found - User Not Found
```json
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}
```

---

## 3. Token Validation API

### Endpoint
```
GET /api/auth/validate
```

### Description
Validates the JWT token and returns current user information.

### Headers
```
Authorization: Bearer <jwt_token>
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "user_123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://via.placeholder.com/40x40/4285F4/FFFFFF?text=JD",
      "lastLoginAt": "2024-01-01T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

### Error Responses

#### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}
```

#### 401 Unauthorized - Missing Token
```json
{
  "success": false,
  "message": "Authorization token required",
  "error": "MISSING_TOKEN"
}
```

---

## 4. User Logout API

### Endpoint
```
POST /api/auth/logout
```

### Description
Logs out the user and invalidates the JWT token.

### Headers
```
Authorization: Bearer <jwt_token>
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Error Responses

#### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}
```

---

## 5. Password Reset Request API (Optional)

### Endpoint
```
POST /api/auth/forgot-password
```

### Description
Sends a password reset email to the user.

### Request Body
```json
{
  "email": "john@example.com"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

## 6. Password Reset API (Optional)

### Endpoint
```
POST /api/auth/reset-password
```

### Description
Resets the user's password using a reset token.

### Request Body
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Implementation Priority

### Phase 1 (Essential - 4 APIs)
1. **User Registration API** - For new user signup
2. **User Login API** - For existing user signin
3. **Token Validation API** - For session management
4. **User Logout API** - For proper session cleanup

### Phase 2 (Enhanced Features - 2 APIs)
5. **Password Reset Request API** - For forgot password functionality
6. **Password Reset API** - For password reset completion

---

## Security Requirements

### JWT Token
- **Algorithm**: HS256 or RS256
- **Expiration**: 24 hours (86400 seconds)
- **Issuer**: Your application name
- **Audience**: Chrome extension users

### Password Security
- **Hashing**: Use bcrypt with salt rounds >= 12
- **Minimum Length**: 6 characters
- **Maximum Length**: 128 characters

### Rate Limiting
- **Registration**: 5 attempts per hour per IP
- **Login**: 10 attempts per hour per IP
- **Password Reset**: 3 attempts per hour per email

### CORS
- **Allowed Origins**: Chrome extension origins
- **Allowed Methods**: GET, POST, PUT, DELETE
- **Allowed Headers**: Content-Type, Authorization

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);
```

### Password Reset Tokens Table (Optional)
```sql
CREATE TABLE password_reset_tokens (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Error Codes Reference

| Code | Description |
|------|-------------|
| `EMAIL_EXISTS` | Email address is already registered |
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `USER_NOT_FOUND` | User account does not exist |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `MISSING_TOKEN` | Authorization header is missing |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests from this IP/email |
| `SERVER_ERROR` | Internal server error |

---

## Testing Endpoints

### Test User Registration
```bash
curl -X POST https://try-on-server-v1-294135365335.europe-west9.run.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### Test User Login
```bash
curl -X POST https://try-on-server-v1-294135365335.europe-west9.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### Test Token Validation
```bash
curl -X GET https://try-on-server-v1-294135365335.europe-west9.run.app/api/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## Integration with Chrome Extension

### Current Implementation
The extension currently uses simulated authentication in `popup.js`. To integrate with real APIs:

1. Replace `authenticateUser()` function with real API calls
2. Add proper error handling for network requests
3. Implement token storage and validation
4. Add loading states and error messages

### Example Integration Code
```javascript
// Replace the current authenticateUser function with:
async function authenticateUser(email, password, type, name = null) {
  try {
    const endpoint = type === "signup" ? "/api/auth/register" : "/api/auth/login";
    const requestBody = type === "signup" 
      ? { name, email, password }
      : { email, password };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.success) {
      // Store user data and token
      currentUser = data.data.user;
      currentUser.accessToken = data.data.token;
      saveToStorage(STORAGE_KEYS.USER_AUTH, currentUser);
      updateUserInterface(true);
      setStatus("✅ " + data.message);
    } else {
      setStatus("❌ " + data.message);
    }
  } catch (error) {
    console.error("Authentication error:", error);
    setStatus("❌ Erreur de connexion. Veuillez réessayer.");
  }
}
```

---

## Conclusion

This API specification provides a complete authentication system for the NUSENSE TryON Chrome Extension. Start with Phase 1 APIs for basic functionality, then add Phase 2 APIs for enhanced user experience.

The APIs are designed to be RESTful, secure, and easy to integrate with the existing Chrome extension code.
