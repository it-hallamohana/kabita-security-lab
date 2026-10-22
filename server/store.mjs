import pg from 'pg';

export async function createStore(env=process.env) {
  if (env.DB_BACKEND && env.DB_BACKEND!=='postgres') throw Error('This replica uses PostgreSQL directly.');
  const pool=new pg.Pool({connectionString:env.DATABASE_URL,max:5,statement_timeout:3000});
  return {
    async list(kind){return (await pool.query('SELECT id,kind,owner_id,data FROM kabita_lab_records WHERE kind=$1 ORDER BY id',[kind])).rows;},
    async get(kind,id){return (await pool.query('SELECT id,kind,owner_id,data FROM kabita_lab_records WHERE kind=$1 AND id=$2',[kind,id])).rows[0]??null;},
    async put(row){await pool.query('INSERT INTO kabita_lab_records(kind,id,owner_id,data) VALUES($1,$2,$3,$4) ON CONFLICT(kind,id) DO UPDATE SET owner_id=excluded.owner_id,data=excluded.data',[row.kind,row.id,row.owner_id,row.data]);return row;},
    async close(){await pool.end();}
  };
}
