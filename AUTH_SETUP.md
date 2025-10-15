# 🔐 Authentication System Documentation

## Overview
A secure email/phone verification login system has been added to the Logistics Defense AI Platform.

## ✅ What Was Implemented

### 1. Database Schema Updates (`prisma/schema.prisma`)
- **User Model**: Extended with optional `email` and `phone` fields (at least one required)
- **VerificationCode Model**: Stores 6-digit codes with 5-minute expiration

```prisma
model User {
  id              String             @id @default(cuid())
  email           String?            @unique
  phone           String?            @unique
  name            String?
  agentActive     Boolean            @default(false)
  createdAt       DateTime           @default(now())
  verificationCodes VerificationCode[]
}

model VerificationCode {
  id        String   @id @default(cuid())
  code      String
  expiresAt DateTime
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

### 2. API Routes (`/app/api/auth/`)

#### `POST /api/auth/send-code`
- Accepts: `{ email }` OR `{ phone }`
- Generates 6-digit code, stores in database
- **Rate Limited**: 3 requests per minute per IP
- Logs code to console (for testing)
- Returns test code in development mode

#### `POST /api/auth/verify-code`
- Accepts: `{ email/phone, code }`
- Validates code and expiration
- Creates JWT token signed with `NEXTAUTH_SECRET`
- Sets `auth_token` HttpOnly cookie (7-day expiration)
- Deletes used verification code

#### `GET /api/auth/me`
- Returns current authenticated user info
- Requires valid `auth_token` cookie

#### `POST /api/auth/logout`
- Clears `auth_token` cookie
- Logs user out

### 3. Login Page (`/app/login/page.tsx`)
- Two tabs: **Email Login** | **Phone Login**
- Step 1: Enter email or phone → Send verification code
- Step 2: Enter 6-digit code → Verify and redirect to `/dashboard`
- **Development Mode**: Shows code in alert popup
- Clean, modern UI matching the platform design

### 4. Middleware Protection (`middleware.ts`)
- Protects `/dashboard` route
- Protects API routes: `/api/agent`, `/api/shipments`, `/api/alerts`, etc.
- Allows public access to: `/login`, `/`, `/api/auth/*`
- Redirects unauthenticated users to `/login`
- Verifies JWT token on every protected request

### 5. Security Features
✅ **JWT-based sessions** (7-day expiration)  
✅ **HttpOnly cookies** (prevents XSS attacks)  
✅ **Rate limiting** (3 requests/minute per IP)  
✅ **Auto-cleanup** of expired verification codes  
✅ **Input validation** (email regex, phone format)  
✅ **Secure tokens** signed with `NEXTAUTH_SECRET`  

## 🚀 How to Use

### 1. Environment Variables
Ensure you have `NEXTAUTH_SECRET` in your environment:

```env
NEXTAUTH_SECRET="your-secret-key-here"
DATABASE_URL="file:./dev.db"
```

### 2. Database Migration (Already Done ✅)
```bash
DATABASE_URL="file:./dev.db" npx prisma migrate dev
```

### 3. Start the Server
```bash
npm run dev
```

### 4. Test the Login Flow

1. **Navigate to Login**
   ```
   http://localhost:3002/login
   ```

2. **Email Login Example**
   - Enter email: `test@example.com`
   - Click "Send Verification Code"
   - Check browser console or alert for the 6-digit code
   - Enter code and click "Verify & Login"
   - Redirected to `/dashboard`

3. **Phone Login Example**
   - Switch to "Phone Login" tab
   - Enter phone: `1234567890`
   - Click "Send Verification Code"
   - Check console/alert for code
   - Enter code and verify

### 5. Testing Protected Routes

**Without Login:**
```
http://localhost:3002/dashboard
→ Redirects to /login
```

**With Valid Session:**
```
http://localhost:3002/dashboard
→ Access granted ✅
```

## 🧪 Testing in Development

### Console Logs
When you send a verification code, check the terminal where `npm run dev` is running:

```
🔐 VERIFICATION CODE for test@example.com:
📧 Code: 123456
⏰ Expires: 10/15/2024, 8:15:00 PM
👤 User ID: clxxx123456
```

### Alert Popup
In development mode, the code also appears in a browser alert for convenience.

## 📁 Files Created/Modified

### Created:
- ✅ `app/api/auth/send-code/route.ts`
- ✅ `app/api/auth/verify-code/route.ts`
- ✅ `app/api/auth/me/route.ts`
- ✅ `app/api/auth/logout/route.ts`
- ✅ `app/login/page.tsx`
- ✅ `middleware.ts`
- ✅ `AUTH_SETUP.md` (this file)

### Modified:
- ✅ `prisma/schema.prisma` (added VerificationCode model)
- ✅ `package.json` (added `jose` dependency)

### Not Modified:
- ✅ All existing dashboard components
- ✅ All existing API routes (agent, shipments, alerts, etc.)
- ✅ All simulation and testing scripts

## 🔒 Security Notes

### Production Checklist
Before deploying to production:

1. **Set Strong Secret**
   ```env
   NEXTAUTH_SECRET="long-random-string-min-32-chars"
   ```

2. **Implement Real Email/SMS Sending**
   - Replace console.log with actual email service (SendGrid, AWS SES)
   - Replace console.log with SMS service (Twilio, AWS SNS)

3. **Use Production Database**
   - Switch from SQLite to PostgreSQL
   - Update `DATABASE_URL` in environment

4. **Remove Test Code Display**
   - Remove the `testCode` from API response
   - Remove browser alert in login page

5. **Add HTTPS**
   - Ensure all cookies use `secure: true` flag
   - Currently automatically enabled in production

6. **Enhanced Rate Limiting**
   - Use Redis or similar for distributed rate limiting
   - Current in-memory solution works for single server only

## 🛠️ Troubleshooting

### "Not authenticated" error
- Clear cookies and try logging in again
- Check if `NEXTAUTH_SECRET` is set
- Verify JWT token hasn't expired (7-day limit)

### Code not working
- Codes expire after 5 minutes
- Each code can only be used once
- Check console for the current valid code

### Migration errors
- Run: `DATABASE_URL="file:./dev.db" npx prisma migrate dev`
- Run: `npx prisma generate`

### Rate limit errors
- Wait 1 minute before trying again
- Limit is 3 code requests per minute per IP

## 📊 Flow Diagram

```
User → /login
  ↓
Enter email/phone
  ↓
POST /api/auth/send-code
  ↓
Code generated & stored in DB
  ↓
User enters 6-digit code
  ↓
POST /api/auth/verify-code
  ↓
JWT token created
  ↓
Cookie set: auth_token
  ↓
Redirect to /dashboard
  ↓
Middleware validates token
  ↓
Access granted ✅
```

## 🎯 Next Steps

1. Test the login flow with email
2. Test the login flow with phone
3. Verify protected routes work correctly
4. Implement real email/SMS sending for production
5. Add user profile management (optional)
6. Add password recovery flow (optional)

---

**✅ Authentication System Successfully Implemented!**

All existing functionality remains intact. No breaking changes to existing features.

