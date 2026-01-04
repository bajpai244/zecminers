import { Database } from 'bun:sqlite';

export interface BlockData {
  block_id: number;
  miner: string;
}

export class DB {
  private db: Database;

  constructor(dbPath: string = 'blocks.db') {
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS blocks (
        block_id INTEGER NOT NULL,
        miner TEXT NOT NULL,
        PRIMARY KEY (block_id)
      )
    `);
  }

  insert(data: BlockData): void {
    const stmt = this.db.prepare(`
      INSERT INTO blocks (block_id, miner)
      VALUES (?, ?)
    `);
    stmt.run(data.block_id, data.miner);
  }

  insertMany(dataArray: BlockData[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO blocks (block_id, miner)
      VALUES (?, ?)
    `);
    const insertMany = this.db.transaction((blocks: BlockData[]) => {
      for (const block of blocks) {
        stmt.run(block.block_id, block.miner);
      }
    });
    insertMany(dataArray);
  }

  close(): void {
    this.db.close();
  }
}
