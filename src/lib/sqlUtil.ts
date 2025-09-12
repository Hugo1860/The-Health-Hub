import { isPostgres } from './sqlClient';

export function nowMinusDays(days: number): string {
  return isPostgres
    ? `CURRENT_TIMESTAMP - INTERVAL '${days} days'`
    : `datetime('now', '-${days} days')`;
}


