import * as duckdb from 'duckdb';
import path from "path";


export function getBrcPage(table: string, page: number, itemsPerPage: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(path.resolve(__dirname, '../../data', 'db.duckdb'));
    const connection = db.connect();
    const offset = (page - 1) * itemsPerPage;
    let sql = connection.prepare('SELECT * FROM brc LIMIT ? OFFSET ?;');
    if (table === 'measurements') {
      sql = connection.prepare('SELECT * FROM measurements LIMIT ? OFFSET ?;');
    }
    sql.all(itemsPerPage, offset, function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}
