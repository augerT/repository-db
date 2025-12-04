import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'repos',
  password: 'tylerauger',
  port: 5432,
});

export default pool;