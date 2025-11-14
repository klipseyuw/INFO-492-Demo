#!/usr/bin/env node
/**
 * Pre-deployment verification script
 * Ensures all required environment variables are set for production
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'OPENROUTER_API_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NODE_ENV'
];

const optionalEnvVars = [
  'JWT_SECRET', // Can use NEXTAUTH_SECRET if not set
];

console.log('🔍 Verifying deployment environment...\n');

let hasErrors = false;

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    hasErrors = true;
  } else {
    const value = process.env[varName];
    const preview = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('URL')
      ? value.substring(0, 10) + '...'
      : value;
    console.log(`✅ ${varName}: ${preview}`);
  }
});

// Check optional variables
console.log('\n📋 Optional variables:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    const value = process.env[varName];
    const preview = value.substring(0, 10) + '...';
    console.log(`✅ ${varName}: ${preview}`);
  } else {
    console.log(`ℹ️  ${varName}: not set (using fallback)`);
  }
});

// Validate DATABASE_URL format
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    console.log('\n✅ Database URL format: PostgreSQL (production-ready)');
  } else if (dbUrl.startsWith('file:')) {
    console.warn('\n⚠️  Database URL format: SQLite (not recommended for Render)');
    console.warn('   Consider using PostgreSQL for production deployments');
  } else {
    console.error('\n❌ Database URL format: Unknown');
    hasErrors = true;
  }
}

// Validate NODE_ENV
if (process.env.NODE_ENV === 'production') {
  console.log('\n✅ NODE_ENV: production');
} else {
  console.log(`\nℹ️  NODE_ENV: ${process.env.NODE_ENV || 'not set'} (development mode)`);
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('\n❌ Deployment verification failed!');
  console.error('Please set all required environment variables before deploying.\n');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Ready for deployment.\n');
  process.exit(0);
}
