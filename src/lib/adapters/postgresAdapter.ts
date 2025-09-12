import { Pool } from 'pg';
import type { SqlClient } from '../sqlClient';

function toPgPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export function createPgAdapter(databaseUrl: string): SqlClient {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });

  const client: SqlClient = {
    dialect: 'postgres',
    async query(sql, params = []) {
      const { rows } = await pool.query(toPgPlaceholders(sql), params);
      return rows as any[];
    },
    async queryOne(sql, params = []) {
      const { rows } = await pool.query(toPgPlaceholders(sql), params);
      return (rows[0] ?? null) as any;
    },
    async execute(sql, params = []) {
      const res = await pool.query(toPgPlaceholders(sql), params);
      return { rowCount: res.rowCount ?? 0 };
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn();
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  };

  return client;
}


