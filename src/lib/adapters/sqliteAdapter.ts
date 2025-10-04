import sqlite3 from 'sqlite3';
import type { SqlClient } from '../sqlClient';

export function createSqliteAdapter(): SqlClient {
  const dbPath = process.env.DB_DATABASE || './data/database.db';

  // 使用sqlite3的异步版本
  const db = new sqlite3.Database(dbPath);

  // 转换为Promise风格的API
  const runAsync = (sql: string, params: any[] = []): Promise<{ rowCount: number }> => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ rowCount: this.changes });
      });
    });
  };

  const allAsync = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  };

  const getAsync = <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | null);
      });
    });
  };

  const client: SqlClient = {
    dialect: 'mysql', // 保持兼容性
    async query(sql, params = []) {
      return await allAsync(sql, params);
    },
    async queryOne(sql, params = []) {
      return await getAsync(sql, params);
    },
    async execute(sql, params = []) {
      return await runAsync(sql, params);
    },
    async transaction(fn) {
      // SQLite事务支持
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);

            fn().then((result) => {
              db.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve(result);
              }).catch(reject);
            }).catch((error) => {
              db.run('ROLLBACK', () => reject(error));
            });
          });
        });
      });
    },
    async close() {
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };

  return client;
}
