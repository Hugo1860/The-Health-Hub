import { isPostgres } from './sqlClient';

export function ilike(column: string, valueParam: string = '?'): string {
  if (isPostgres) return `${column} ILIKE ${valueParam}`;
  return `LOWER(${column}) LIKE LOWER(${valueParam})`;
}

export function cast(expr: string, type: string): string {
  if (isPostgres) return `${expr}::${type}`;
  return `CAST(${expr} AS ${type.toUpperCase()})`;
}

export function castToString(expr: string): string {
  if (isPostgres) return `${expr}::text`;
  return `CAST(${expr} AS CHAR)`;
}

export function jsonGet(path: string, alias?: string): string {
  // 规范路径：a.b.c → $.a.b.c
  const jsonPath = path.startsWith('$.') ? path : `$.${path}`;
  if (isPostgres) {
    // 以文本返回
    return `(${alias ?? 'data'})#>>'{${path.replace(/^\$\./, '').replace(/\./g, ',')}}'`;
  }
  return `JSON_UNQUOTE(JSON_EXTRACT(${alias ?? 'data'}, '${jsonPath}'))`;
}

export function upsertInsertClause(table: string, columns: string[], conflictKeys: string[]): {
  insert: string;
  onConflict: string;
} {
  const cols = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const insert = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
  if (isPostgres) {
    const conflict = conflictKeys.join(', ');
    const updates = columns
      .filter(c => !conflictKeys.includes(c))
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(', ');
    return { insert, onConflict: ` ON CONFLICT (${conflict}) DO UPDATE SET ${updates}` };
  } else {
    const updates = columns
      .filter(c => !conflictKeys.includes(c))
      .map(c => `${c} = VALUES(${c})`)
      .join(', ');
    return { insert, onConflict: ` ON DUPLICATE KEY UPDATE ${updates}` };
  }
}

export function limitOffset(limit?: number, offset?: number): string {
  if (limit == null && offset == null) return '';
  if (isPostgres) {
    return ` LIMIT ${limit ?? 'ALL'} OFFSET ${offset ?? 0}`;
  }
  const l = limit ?? 18446744073709551615; // MySQL 最大
  const o = offset ?? 0;
  return ` LIMIT ${o}, ${l}`;
}


