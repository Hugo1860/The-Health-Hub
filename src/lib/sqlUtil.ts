import { isPostgres } from './sqlClient';

export function nowMinusDays(days: number): string {
  if (isPostgres) {
    return `CURRENT_TIMESTAMP - INTERVAL '${days} days'`;
  }
  // MySQL 语法
  return `DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${days} DAY)`;
}


