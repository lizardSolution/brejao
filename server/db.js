import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

// Suporta tanto DATABASE_URL (Neon/Render) quanto variáveis individuais (Docker local)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin',
      database: process.env.DB_NAME || 'LizardSolutions',
    });

export const query = (text, params) => pool.query(text, params);
export default pool;
