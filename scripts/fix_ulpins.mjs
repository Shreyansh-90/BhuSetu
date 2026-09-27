import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const parcels = await sql`SELECT id, ulpin FROM parcels WHERE ulpin IS NULL`;
  for (let i = 0; i < parcels.length; i++) {
    const ulpin = `111122223333${i.toString().padStart(2, '0')}`;
    await sql`UPDATE parcels SET ulpin = ${ulpin} WHERE id = ${parcels[i].id}`;
    console.log(`Updated parcel ${parcels[i].id} with ULPIN ${ulpin}`);
  }
  
  const all = await sql`SELECT id, survey_number, ulpin FROM parcels LIMIT 3`;
  console.log("Current Parcels:");
  console.log(all);
  
  await sql.end();
}

main();
