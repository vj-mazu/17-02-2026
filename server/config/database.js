const { Sequelize } = require('sequelize');

// Database configuration with performance optimizations
let dbUrl = process.env.DATABASE_URL;

// Sanitize the URL if it exists (remove quotes and whitespace)
if (dbUrl) {
  dbUrl = dbUrl.trim();
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1);
  }
}

if (dbUrl) {
  console.log('Attempting to connect with DATABASE_URL (masked):', dbUrl.replace(/:([^:@]+)@/, ':****@'));
} else {
  console.log('No DATABASE_URL found, using individual environment variables.');
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    minifyAliases: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for some PaaS providers like Render/Supabase
      },
      statement_timeout: 30000,           // Database-level timeout (30s)
      query_timeout: 25000,               // Sequelize-level timeout (25s) - fires before DB timeout
      idle_in_transaction_session_timeout: 60000,
      application_name: 'mother_india_stock_mgmt'
    },
    pool: {
      max: 12,  // Set below Supabase pool_size limit (15) to prevent connection errors
      min: 2,   // Safe minimum for lower memory usage and pooler compatibility
      acquire: 60000,
      idle: 10000,
      evict: 1000,
      maxUses: 2000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  })
  : new Sequelize({
    database: process.env.DB_NAME || 'mother_india',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgresql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    minifyAliases: true,

    // Connection pool configuration for better performance
    pool: {
      max: 12,  // Set below Supabase pool_size limit (15) to prevent connection errors
      min: 2,   // Safe minimum for lower memory usage and pooler compatibility
      acquire: 60000,
      idle: 10000,
      evict: 1000,
      maxUses: 2000
    },

    // Query optimization settings
    dialectOptions: {
      statement_timeout: 30000,           // Database-level timeout (30s)
      query_timeout: 25000,               // Sequelize-level timeout (25s) - fires before DB timeout
      idle_in_transaction_session_timeout: 60000,
      application_name: 'mother_india_stock_mgmt'
    },

    // Model defaults
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },

    // Performance settings
    benchmark: process.env.NODE_ENV === 'development',
    logQueryParameters: process.env.NODE_ENV === 'development',

    // Retry configuration
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/
      ]
    }
  });

const { Client } = require('pg');

async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME || 'mother_india';
  let clientConfig = {};
  let dbToCreate = dbName;
  
  if (process.env.DATABASE_URL) {
    let url = process.env.DATABASE_URL.trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1);
    }
    try {
      const parsedUrl = new URL(url);
      dbToCreate = parsedUrl.pathname.substring(1);
      parsedUrl.pathname = '/postgres';
      clientConfig = {
        connectionString: parsedUrl.toString(),
        ssl: { rejectUnauthorized: false }
      };
    } catch (e) {
      console.error('Failed to parse DATABASE_URL for auto-creation check:', e.message);
      return;
    }
  } else {
    clientConfig = {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '12345',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'postgres',
    };
    dbToCreate = process.env.DB_NAME || 'mother_india';
  }

  console.log(`Checking if database "${dbToCreate}" exists...`);
  const client = new Client(clientConfig);
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbToCreate]);
    if (res.rowCount === 0) {
      console.log(`Database "${dbToCreate}" does not exist. Creating it automatically...`);
      await client.query(`CREATE DATABASE "${dbToCreate}"`);
      console.log(`Database "${dbToCreate}" created successfully.`);
    } else {
      console.log(`Database "${dbToCreate}" already exists.`);
    }
  } catch (err) {
    console.error('ensureDatabaseExists warning:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

module.exports = { sequelize, ensureDatabaseExists };