import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'repos',
  password: 'tylerauger', // Replace with your actual password
  port: 5432,
});

export default pool;