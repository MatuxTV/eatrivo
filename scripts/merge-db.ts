import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import { sql } from 'drizzle-orm';

const SOURCE_DB_URL = process.env.DATABASE_URL_DEVELOP!;
const TARGET_DB_URL = process.env.DATABASE_URL_MAIN!;

if (!SOURCE_DB_URL || !TARGET_DB_URL) {
  console.error('ERROR: Missing required environment variables!');
  console.error('You need: DATABASE_URL_DEVELOP and DATABASE_URL_MAIN');
  process.exit(1);
}

const sourceConnection = neon(SOURCE_DB_URL);
const targetConnection = neon(TARGET_DB_URL);
const sourceDb = drizzle(sourceConnection, { schema });
const targetDb = drizzle(targetConnection, { schema });

interface TableInfo {
  tableName: string;
  hasData: boolean;
  rowCount: number;
}

async function getTables(db: any): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row: any) => row.table_name);
}

async function getTableRowCount(db: any, tableName: string): Promise<number> {
  try {
    const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    console.warn(`WARNING: Cannot get row count for "${tableName}": ${error}`);
    return 0;
  }
}

async function copyTableData(
  sourceDb: any,
  targetDb: any,
  tableName: string
): Promise<void> {
  try {
    const data = await sourceDb.execute(sql.raw(`SELECT * FROM "${tableName}"`));
    
    if (data.rows.length === 0) {
      console.log(`   INFO: Table "${tableName}" is empty, skipping...`);
      return;
    }

    const columns = Object.keys(data.rows[0]);
    await targetDb.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE`));
    console.log(`   CLEARED: Table "${tableName}" in main DB`);

    const batchSize = 100;
    for (let i = 0; i < data.rows.length; i += batchSize) {
      const batch = data.rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return val;
        }).join(', ');

        // Quote column names to preserve case sensitivity
        const quotedColumns = columns.map(col => `"${col}"`).join(', ');
        const insertQuery = `
          INSERT INTO "${tableName}" (${quotedColumns})
          VALUES (${values})
        `;
        
        await targetDb.execute(sql.raw(insertQuery));
      }
      
      console.log(`   COPIED: ${Math.min(i + batchSize, data.rows.length)} / ${data.rows.length} records`);
    }

    console.log(`   SUCCESS: ${data.rows.length} records copied from "${tableName}"`);
  } catch (error) {
    console.error(`   ERROR: Failed to copy "${tableName}": ${error}`);
    throw error;
  }
}

async function syncDatabase() {
  console.log('\n=== DATABASE SYNCHRONIZATION START ===\n');
  console.log('SOURCE (develop):', SOURCE_DB_URL.replace(/:[^:@]+@/, ':****@'));
  console.log('TARGET (main):   ', TARGET_DB_URL.replace(/:[^:@]+@/, ':****@'));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    console.log('STEP 1: Fetching tables...\n');
    const sourceTables = await getTables(sourceDb);
    const targetTables = await getTables(targetDb);

    console.log(`Source DB (develop): ${sourceTables.length} tables`);
    console.log(`Target DB (main):    ${targetTables.length} tables\n`);

    console.log('STEP 2: Analyzing source database...\n');
    const tableInfo: TableInfo[] = [];
    
    for (const table of sourceTables) {
      const rowCount = await getTableRowCount(sourceDb, table);
      tableInfo.push({
        tableName: table,
        hasData: rowCount > 0,
        rowCount
      });
      console.log(`   ${table}: ${rowCount} records`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\nWARNING: This operation will DELETE all data in MAIN database!');
    console.log('Only proceed if you are sure!\n');
    
    const tablesWithData = tableInfo.filter(t => t.hasData);
    if (tablesWithData.length === 0) {
      console.log('INFO: No tables with data to copy.');
      return;
    }

    console.log('\nSTEP 3: Copying data...\n');
    
    const tableOrder = [
      'users',
      'user_profiles',
      'user_info',
      'shopping_lists',
      'meal_plans',
      'shopping_list_downloads',
      'food_items'
    ];

    for (const tableName of tableOrder) {
      if (!sourceTables.includes(tableName)) continue;
      
      const info = tableInfo.find(t => t.tableName === tableName);
      if (!info || !info.hasData) {
        console.log(`SKIP: "${tableName}" (no data)\n`);
        continue;
      }

      console.log(`\nCOPYING: "${tableName}" (${info.rowCount} records)`);
      await copyTableData(sourceDb, targetDb, tableName);
    }

    const remainingTables = sourceTables.filter(t => !tableOrder.includes(t));
    for (const tableName of remainingTables) {
      const info = tableInfo.find(t => t.tableName === tableName);
      if (!info || !info.hasData) continue;

      console.log(`\nCOPYING: "${tableName}" (${info.rowCount} records)`);
      await copyTableData(sourceDb, targetDb, tableName);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\nSYNCHRONIZATION COMPLETE!\n');
    console.log('Summary:');
    console.log(`   - Copied tables: ${tablesWithData.length}`);
    console.log(`   - Total records: ${tableInfo.reduce((sum, t) => sum + t.rowCount, 0)}\n`);

  } catch (error) {
    console.error('\nSYNCHRONIZATION ERROR:', error);
    process.exit(1);
  }
}

syncDatabase()
  .then(() => {
    console.log('DONE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });