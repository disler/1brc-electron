import * as duckdb from 'duckdb';
import path from "path";


export function getBrcPage(table: string, page: number, size: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(path.resolve(__dirname, '../../data', 'db.duckdb'));
    const offset = (page - 1) * size;
    let sql = 'SELECT * FROM brc LIMIT ? OFFSET ?;';
    if (table === 'measurements') {
      sql = 'SELECT * FROM measurements LIMIT ? OFFSET ?;';
    }
    db.all(sql, [size, offset], function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}


// New example usage:
// Assuming you have imported the getBrcPage function and have access to ipcMain from 'electron'

const data = await getBrcPage('brc', 1, 10);
console.log(`data`, data)
