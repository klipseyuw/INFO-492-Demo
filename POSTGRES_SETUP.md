# PostgreSQL Local Setup - Quick Start

## ✅ PATH Already Set Up
PostgreSQL is now in your PATH!

## 🗄️ Create Database

### Option 1: Using pgAdmin (Recommended)
1. Open pgAdmin 4 from Start Menu
2. Connect to PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name: `logistics_defense`
5. Save

### Option 2: Using SQL Shell (psql)
1. Open "SQL Shell (psql)" from Start Menu
2. Press Enter for all prompts (use defaults)
3. Enter your password when prompted
4. Run: `CREATE DATABASE logistics_defense;`
5. Run: `\q` to quit

## 🔧 Update Your .env

Open `.env` and update the password:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/logistics_defense"
```

## 🚀 Run Migrations

After database is created and .env is updated:

```powershell
# Generate Prisma Client
npx prisma generate

# Create tables
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

## ❓ Forgot Your Password?

### Reset via pgAdmin:
1. Open pgAdmin 4
2. Right-click "PostgreSQL 15" server
3. Properties → Connection
4. Reset password if needed

### OR Edit pg_hba.conf (Advanced):
1. Find: `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
2. Change: `md5` to `trust` temporarily
3. Restart service: `Restart-Service postgresql-x64-15`
4. Create database
5. Change back to `md5` for security

## 🎯 Once Working

Your app will work both locally AND on Render since both use PostgreSQL!

```powershell
# Deploy to Render
git add .
git commit -m "Switch to PostgreSQL for all environments"
git push

# Render will now deploy successfully! 🎉
```
