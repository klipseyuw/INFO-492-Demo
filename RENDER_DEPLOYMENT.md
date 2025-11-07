# Render.com Deployment Guide

## Prerequisites
1. A Render.com account (free tier available)
2. Your OpenRouter API key

## Deployment Steps

### 1. Push Your Code to GitHub
Ensure your repository is pushed to GitHub with all the latest changes.

### 2. Create a New Web Service on Render
1. Go to https://dashboard.render.com/
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect the `render.yaml` file and set up:
   - A PostgreSQL database (`logistics-defense-db`)
   - A web service (`logistics-defense-ai`)

### 3. Configure Environment Variables
After the blueprint is created, you need to manually add your OPENROUTER_API_KEY:

1. Go to your web service in the Render dashboard
2. Navigate to "Environment" tab
3. Add the following environment variable:
   - **OPENROUTER_API_KEY**: `your-openrouter-api-key-here`

The following variables are automatically configured:
- **DATABASE_URL**: Auto-populated from the PostgreSQL database
- **JWT_SECRET**: Auto-generated secure random value
- **NEXTAUTH_SECRET**: Auto-generated secure random value
- **NEXTAUTH_URL**: Set to your Render app URL
- **NODE_ENV**: Set to `production`

### 4. Deploy
The service will automatically deploy. The build process:
1. Installs dependencies (`npm install`)
2. Generates Prisma client (`npx prisma generate`)
3. Runs database migrations (`npx prisma migrate deploy`)
4. Builds the Next.js application (`npm run build`)
5. Starts the server (`npm start`)

## How Simulated Attacks Work on Render

### Agent Activation
1. Log in as an ADMIN user
2. Navigate to the dashboard
3. Use the Agent Toggle to activate the AI agent
4. The agent will automatically analyze shipments and detect threats

### Running Simulations
The simulate attack functionality works through the web API:

**Manual Trigger via API:**
```bash
# Get your auth token from browser cookies after logging in
curl -X POST https://logistics-defense-ai.onrender.com/api/simulate-attack \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=<your-auth-token>" \
  -d '{"userId": "<your-user-id>"}'
```

**Via Dashboard:**
- Use the SimulateAttackButton component in the admin dashboard
- Click to trigger a simulated attack scenario
- The agent (if active) will automatically analyze it

### How It Works
1. `POST /api/simulate-attack` creates a shipment with suspicious characteristics
2. If agent is active, it immediately calls `/api/ai` with proper auth headers
3. AI analyzes the shipment using OpenRouter GLM-4.5-air model
4. Reinforcement learning examples from past feedback improve accuracy
5. Alerts are created if risk score > 20
6. Feedback can be submitted to improve future predictions

### Continuous Simulation Script
For development/testing, you can run the simulation script:
```bash
# Ensure NEXTAUTH_URL points to your Render URL
export NEXTAUTH_URL=https://logistics-defense-ai.onrender.com
npm run simulate
```

**Note:** On Render's free tier, background workers aren't included. For production continuous simulation, consider:
- Using Render Cron Jobs (paid tier)
- External monitoring service (UptimeRobot, etc.)
- Manual API triggers via scheduled tools

## Database Management

### Viewing Data
```bash
# Set DATABASE_URL to your Render PostgreSQL connection string
export DATABASE_URL="postgresql://..."
npm run db:studio
```

### Running Migrations
Migrations run automatically during deployment. For manual runs:
```bash
npm run db:migrate:deploy
```

### Clearing Data
```bash
npm run clear
```

## Monitoring & Debugging

### Health Check
Your service includes a health endpoint:
```
GET https://logistics-defense-ai.onrender.com/api/health
```

### Logs
View logs in the Render dashboard under "Logs" tab:
- Build logs: See deployment process
- Runtime logs: See API calls, AI analysis, and errors

### Common Issues

**Issue: Migrations fail**
- Check that DATABASE_URL is properly set
- Review logs for specific Prisma errors
- May need to manually reset database in Render dashboard

**Issue: AI analysis not working**
- Verify OPENROUTER_API_KEY is set correctly
- Check logs for API errors
- Fallback analysis will activate if OpenRouter is unavailable

**Issue: Auth not working**
- Ensure JWT_SECRET and NEXTAUTH_SECRET are set
- Clear browser cookies and try logging in again
- Check that NEXTAUTH_URL matches your deployed URL

**Issue: Simulate attack fails**
- Verify user is ADMIN role
- Check agent is activated
- Review logs for authentication errors

## Production Considerations

### Scaling
- Free tier: 750 hours/month, sleeps after 15 min inactivity
- Paid tier: Always-on, auto-scaling, custom domains

### Security
- All secrets are environment variables (not in code)
- JWT tokens for authentication
- Database credentials auto-managed by Render

### Performance
- Database connection pooling via Prisma
- API response caching where appropriate
- Adaptive polling intervals reduce load

## Support
For issues specific to:
- **Render Platform**: https://render.com/docs
- **Prisma/PostgreSQL**: https://www.prisma.io/docs
- **Next.js**: https://nextjs.org/docs
