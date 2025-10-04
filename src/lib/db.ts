import { sqlClient } from './sqlClient';

// Lightweight PG -> MySQL SQL shim to support legacy API code that used pg-style queries
// This adapter converts $1 placeholders to ?, handles ILIKE, basic ::type casts,
// expands = ANY($n) into IN (...), and emulates RETURNING by issuing a follow-up SELECT when possible.

type QueryResult<T = any> = {
  rows: T[];
  rowCount: number;
};

function replacePgPlaceholders(sql: string): { sql: string } {
  // Replace $1, $2, ... with ? in order. We don't need the indices here because
  // params are already ordered; we just collapse to positional '?'.
  const replaced = sql.replace(/\$(\d+)/g, '?');
  return { sql: replaced };
}

function replaceILike(sql: string): string {
  // Simple replacement: ILIKE -> LIKE. In most MySQL collations LIKE is case-insensitive.
  return sql.replace(/\bILIKE\b/gi, 'LIKE');
}

function stripPgCasts(sql: string): string {
  // Remove ::type casts e.g., column::text -> column
  return sql.replace(/::[a-zA-Z0-9_]+/g, '');
}

function stripQuotedIdentifiers(sql: string): string {
  // Convert "identifier" -> identifier (MySQL uses backticks; we'll unquote to bare)
  return sql.replace(/"([a-zA-Z0-9_]+)"/g, '$1');
}

function replaceSqliteFunctions(sql: string): string {
  // datetime('now') -> CURRENT_TIMESTAMP (MySQL compatible)
  return sql.replace(/datetime\('\s*now\s*'\)/gi, 'CURRENT_TIMESTAMP');
}

function stripPgOnlySyntax(sql: string): string {
  let s = sql;
  s = replaceILike(s);
  s = stripPgCasts(s);
  s = stripQuotedIdentifiers(s);
  s = replaceSqliteFunctions(s);
  return s;
}

function extractReturningClause(sql: string): { baseSql: string; returning?: string } {
  const match = /\bRETURNING\b\s+([\s\S]+)$/i.exec(sql);
  if (!match) return { baseSql: sql };
  const baseSql = sql.slice(0, match.index).trim();
  const returning = match[1].trim();
  return { baseSql, returning };
}

function extractTableNameFromUpdate(sql: string): string | undefined {
  const m = /\bUPDATE\s+([`\"']?)([a-zA-Z0-9_]+)\1\s+/i.exec(sql);
  return m ? m[2] : undefined;
}

function extractTableNameFromInsert(sql: string): { table?: string; columns?: string[] } {
  const m = /\bINSERT\s+INTO\s+([`\"']?)([a-zA-Z0-9_]+)\1\s*\(([^)]+)\)/i.exec(sql);
  if (!m) return {};
  const table = m[2];
  const columns = m[3].split(',').map(c => c.trim().replace(/[`\"']/g, ''));
  return { table, columns };
}

function extractWhereIdParamIndex(sql: string): number | undefined {
  // Look for "WHERE ... id = $N" pattern to locate id param index
  const m = /\bWHERE[\s\S]*?\bid\s*=\s*\$(\d+)/i.exec(sql);
  if (!m) return undefined;
  return parseInt(m[1], 10);
}

function expandAnyWithIn(sql: string, params: any[]): { sql: string; params: any[] } {
  // Transforms occurrences of '= ANY($n)' where params[n-1] is an array
  // into 'IN (?, ?, ...)' and flattens the params accordingly.
  let transformedSql = sql;
  let transformedParams = [...params];

  // Find all matches with their indices to process left-to-right
  const anyRegex = /=\s*ANY\s*\(\$(\d+)\)/gi;
  let match: RegExpExecArray | null;
  // Track offset shifts in params as we expand arrays
  while ((match = anyRegex.exec(sql)) !== null) {
    const indexStr = match[1];
    const paramIndex = parseInt(indexStr, 10) - 1;
    const arrayValue = transformedParams[paramIndex];

    if (Array.isArray(arrayValue)) {
      const placeholders = arrayValue.length > 0 ? arrayValue.map(() => '?').join(', ') : 'NULL';
      // Replace this occurrence in transformedSql (use a fresh regex segment-specific)
      transformedSql = transformedSql.replace(match[0], `IN (${placeholders})`);

      // Replace the single array param with its elements
      transformedParams = [
        ...transformedParams.slice(0, paramIndex),
        ...arrayValue,
        ...transformedParams.slice(paramIndex + 1)
      ];
    } else {
      // If not an array, degrade to single-value IN (?) to avoid syntax errors
      transformedSql = transformedSql.replace(match[0], 'IN (?)');
    }
  }

  return { sql: transformedSql, params: transformedParams };
}

async function emulateReturning(
  originalSql: string,
  baseSql: string,
  returning: string,
  params: any[] = []
): Promise<QueryResult> {
  // Execute the base statement first
  let rowCount = 0;
  if (sqlClient.execute) {
    const res = await sqlClient.execute(baseSql, params);
    rowCount = res.rowCount;
  } else {
    // Fallback
    const res = await sqlClient.query(baseSql, params);
    rowCount = Array.isArray(res) ? res.length : 0;
  }

  // Try to fetch the requested data using id if we can detect it
  // Handle UPDATE ... WHERE id = $N RETURNING ...
  const updateTable = extractTableNameFromUpdate(originalSql);
  if (updateTable) {
    const idIndex = extractWhereIdParamIndex(originalSql);
    if (idIndex && params[idIndex - 1] !== undefined) {
      const idValue = params[idIndex - 1];
      const cols = returning.trim() === '*' ? '*' : returning;
      const selectSql = `SELECT ${cols} FROM ${updateTable} WHERE id = ?`;
      const rows = await sqlClient.query(selectSql, [idValue]);
      return { rows, rowCount: rows.length };
    }
  }

  // Handle INSERT INTO table (cols...) VALUES (...) RETURNING ...
  const { table: insertTable, columns } = extractTableNameFromInsert(originalSql);
  if (insertTable && columns && columns.length > 0) {
    // If id is part of the insert columns, we can read it from params by its position
    const idPos = columns.findIndex(c => c.toLowerCase() === 'id');
    if (idPos >= 0 && params[idPos] !== undefined) {
      const idValue = params[idPos];
      const cols = returning.trim() === '*' ? '*' : returning;
      const selectSql = `SELECT ${cols} FROM ${insertTable} WHERE id = ?`;
      const rows = await sqlClient.query(selectSql, [idValue]);
      return { rows, rowCount: rows.length };
    }
  }

  // As a safe fallback, we return empty rows with affected count
  return { rows: [], rowCount };
}

function normalize(sql: string, params: any[] = []): { sql: string; params: any[]; returning?: string; originalSql: string } {
  const originalSql = sql;
  let normalizedSql = stripPgOnlySyntax(originalSql);
  const { baseSql, returning } = extractReturningClause(normalizedSql);
  const { sql: anyExpandedSql, params: anyExpandedParams } = expandAnyWithIn(baseSql, params);
  const { sql: placeholderSql } = replacePgPlaceholders(anyExpandedSql);
  return { sql: placeholderSql, params: anyExpandedParams, returning, originalSql };
}

const db = {
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const { sql: normSql, params: normParams, returning, originalSql } = normalize(sql, params);

    if (returning) {
      const result = await emulateReturning(originalSql, normSql, returning, normParams);
      return result as QueryResult<T>;
    }

    const isSelect = /^\s*SELECT\b/i.test(normSql);
    if (isSelect) {
      const rows = await sqlClient.query<T>(normSql, normParams);
      return { rows, rowCount: rows.length };
    }

    if (sqlClient.execute) {
      const res = await sqlClient.execute(normSql, normParams);
      return { rows: [], rowCount: res.rowCount } as QueryResult<T>;
    } else {
      const rows = await sqlClient.query<T>(normSql, normParams);
      return { rows, rowCount: rows.length };
    }
  },

  prepare(sql: string) {
    return {
      all: async <T = any>(...params: any[]): Promise<T[]> => {
        const { sql: normSql, params: normParams } = normalize(sql, params);
        const rows = await sqlClient.query<T>(normSql, normParams);
        return rows;
      },
      get: async <T = any>(...params: any[]): Promise<T | null> => {
        const { sql: normSql, params: normParams } = normalize(sql, params);
        if (sqlClient.queryOne) {
          return (await sqlClient.queryOne<T>(normSql, normParams)) as T | null;
        }
        const rows = await sqlClient.query<T>(normSql, normParams);
        return (rows[0] ?? null) as T | null;
      },
      run: async (...params: any[]): Promise<{ changes: number }> => {
        const { sql: normSql, params: normParams } = normalize(sql, params);
        if (sqlClient.execute) {
          const res = await sqlClient.execute(normSql, normParams);
          return { changes: res.rowCount };
        }
        const rows = await sqlClient.query(normSql, normParams);
        return { changes: Array.isArray(rows) ? rows.length : 0 };
      }
    };
  },

  async exec(sql: string): Promise<void> {
    const { sql: normSql } = normalize(sql);
    if (sqlClient.execute) {
      await sqlClient.execute(normSql, []);
      return;
    }
    await sqlClient.query(normSql, []);
  }
};

export default db;