# Render Deployment Troubleshooting - Agent Not Activating

## Issue
Agent shows as activated but doesn't analyze threats on Render.

## Potential Causes & Fixes

### 1. NEXTAUTH_URL Mismatch
**Problem**: `render.yaml` has hardcoded URL that might not match your actual Render URL.

**Check**: What is your actual Render URL?
- If it's NOT `https://logistics-defense-ai.onrender.com`, update `render.yaml`:

```yaml
- key: NEXTAUTH_URL
  value: https://YOUR-ACTUAL-APP-NAME.onrender.com
```

### 2. Internal API Calls Failing
**Problem**: `simulate-attack` calls `/api/ai` internally, but authentication might be failing.

**Debug Steps**:

1. **Check Render Logs** for errors:
   - Look for "Defense agent analysis failed"
   - Look for 401/403 authentication errors
   - Look for connection errors

2. **Check Environment Variables** in Render dashboard:
   - `NEXTAUTH_URL` is set correctly
   - `OPENROUTER_API_KEY` is set
   - `DATABASE_URL` is connected

### 3. Agent Status Not Persisting
**Problem**: Agent toggle works locally but not on Render.

**Fix**: Verify user exists in production database.

```bash
# In Render Shell or connect to database
npx prisma studio
# Check Users table for agentActive=true
```

### 4. OPENROUTER_API_KEY Not Set
**Problem**: AI analysis fails silently if API key is missing.

**Check Render Dashboard**:
- Environment → `OPENROUTER_API_KEY` → Should be set
- If not set, add it manually

### 5. Cookie Forwarding Issue
The simulate-attack route forwards cookies for authentication:

```typescript
const cookieHeader = req.headers.get('cookie') || '';
await axios.post('/api/ai', data, { headers: { Cookie: cookieHeader } });
```

**Problem**: If user is not properly authenticated, this fails.

**Fix**: Ensure you're logged in as ADMIN before activating agent.

## Quick Diagnostic Commands

### Test AI Endpoint Directly
```bash
# From Render Shell or your terminal
curl -X POST https://your-app.onrender.com/api/ai \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=YOUR_AUTH_TOKEN" \
  -d '{
    "routeId": "TEST-123",
    "expectedETA": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "userId": "YOUR_USER_ID"
  }'
```

### Check Agent Status
```bash
curl https://your-app.onrender.com/api/agent/status \
  -H "Cookie: auth=YOUR_AUTH_TOKEN"
```

### Check Logs in Render
1. Go to Render dashboard
2. Click your web service
3. Go to "Logs" tab
4. Look for these messages:
   - ✅ "Defense agent analysis successful"
   - ❌ "Defense agent analysis failed"
   - ❌ "ECONNREFUSED"
   - ❌ "401 Unauthorized"
   - ❌ "403 Forbidden"

## Most Likely Issue

Based on the error patterns, the most common issue is:

**NEXTAUTH_URL mismatch** causing internal API calls to fail.

### Solution:
1. Get your actual Render URL (e.g., `logistics-defense-ai-xyz.onrender.com`)
2. Update `render.yaml`:
   ```yaml
   - key: NEXTAUTH_URL
     value: https://logistics-defense-ai-xyz.onrender.com
   ```
3. Commit and push
4. Redeploy

## Alternative: Use Relative URLs

Instead of calling `${NEXTAUTH_URL}/api/ai`, use a relative URL or construct it dynamically:

```typescript
// In simulate-attack/route.ts
const baseUrl = req.headers.get('host');
const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
const apiUrl = `${protocol}://${baseUrl}/api/ai`;
```

This would make it work regardless of the deployed URL.

## Testing Checklist

After making changes:

- [ ] Can login to Render deployment
- [ ] User is ADMIN role
- [ ] Agent toggle shows as ON
- [ ] Clicking "Simulate Attack" creates a shipment
- [ ] Alert appears (check /api/alerts)
- [ ] Recent Activity shows analysis
- [ ] No errors in Render logs

## Need More Help?

Share the following from Render logs:
1. Full error message when simulating attack
2. Any 401/403 errors
3. NEXTAUTH_URL value (check: `echo $NEXTAUTH_URL` in Render shell)
4. Result of: `curl http://localhost:3000/api/health`
