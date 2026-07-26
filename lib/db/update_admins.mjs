import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupAdmins() {
  // Bcrypt hash for 'Admin@123456'
  const passwordHash = '$2a$10$8K1p/a0dL1LXMIgoEDDhi.Z6M0nS0VwYVzB3c9w.M3jJ9dF9Dk3a6';

  const admins = [
    { name: 'حمزة (مدير النظام)', phone: '0792535437' },
    { name: 'الأستاذ محمد (مدير النظام)', phone: '0798638622' }
  ];

  for (const admin of admins) {
    const check = await pool.query('SELECT * FROM users WHERE phone = $1', [admin.phone]);
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (full_name, phone, password_hash, role, status, is_active, onboarding_completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [admin.name, admin.phone, passwordHash, 'super_admin', 'active', true, true]
      );
      console.log(`✅ Created Super Admin: ${admin.name} (${admin.phone})`);
    } else {
      await pool.query(
        `UPDATE users SET full_name = $1, password_hash = $2, role = $3, status = $4, is_active = $5, onboarding_completed = $6
         WHERE phone = $7`,
        [admin.name, passwordHash, 'super_admin', 'active', true, true, admin.phone]
      );
      console.log(`✅ Updated Super Admin: ${admin.name} (${admin.phone})`);
    }
  }

  // Remove temporary seed user 0770000000 if exists
  await pool.query("DELETE FROM users WHERE phone = '0770000000'");

  console.log('\n========================================');
  console.log('Admin accounts configured successfully!');
  console.log('========================================\n');

  await pool.end();
}

setupAdmins().catch(err => {
  console.error('Admin setup failed:', err);
  process.exit(1);
});
