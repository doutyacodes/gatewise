import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Change this to your MySQL root password
  database: 'gatewise',
});

export const db = drizzle(connection);