const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Your MySQL password
    database: 'gatewise',
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await connection.execute(
    'INSERT INTO community_admins (name, email, mobile_number, password, community_id, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['Community Admin', 'admin@gatewise.com', '+919876543210', adminPassword, 1, 'admin']
  );

  console.log('✅ Admin created: admin@gatewise.com / admin123');
  await connection.end();
}

setupAdmin();