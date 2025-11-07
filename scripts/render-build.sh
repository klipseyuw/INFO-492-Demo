#!/bin/bash
# Render deployment build script
# This script prepares the application for production deployment with PostgreSQL

echo "🚀 Starting Render deployment build..."

# Use production schema (PostgreSQL)
echo "📝 Switching to production schema (PostgreSQL)..."
cp prisma/schema.production.prisma prisma/schema.prisma

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build Next.js application
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build complete! Ready to start application."
