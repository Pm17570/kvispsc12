// Helpers to work with sql.js result format

export function queryAll(db: any, sql: string, params: any[] = []): Record<string, any>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Record<string, any>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(db: any, sql: string, params: any[] = []): Record<string, any> | null {
  const rows = queryAll(db, sql, params);
  return rows[0] ?? null;
}

export function run(db: any, sql: string, params: any[] = []) {
  db.run(sql, params);
}
