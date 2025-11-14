#!/bin/bash
# Render deployment build script
# This script prepares the application for production deployment with PostgreSQL

set -e  # Exit on any error

echo "🚀 Starting Render deployment build..."

# Use production schema (PostgreSQL) - CRITICAL: Do this first!
echo "📝 Switching to production schema (PostgreSQL)..."
cp -f prisma/schema.production.prisma prisma/schema.prisma

# Verify the schema was copied correctly
echo "🔍 Verifying schema..."
if grep -q "provider = \"postgresql\"" prisma/schema.prisma; then
    echo "✅ PostgreSQL schema confirmed"
else
    echo "❌ ERROR: Schema not switched to PostgreSQL!"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client for PostgreSQL
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build Next.js application
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build complete! Ready to start application."
