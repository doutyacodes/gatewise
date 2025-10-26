import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '68.178.163.247',
  user: 'devuser_gatewise',
  password: 'devuser_gatewise', // Change this to your MySQL root password
  database: 'devuser_gatewise',
});

export const db = drizzle(connection);

