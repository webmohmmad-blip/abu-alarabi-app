import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simple bcrypt-compatible hashing using crypto or direct insert
async function seedAdmin() {
  const phone = '0770000000';
  // Standard bcrypt hash for 'Admin@123456' generated with cost factor 10
  const passwordHash = '$2a$10$8K1p/a0dL1LXMIgoEDDhi.Z6M0nS0VwYVzB3c9w.M3jJ9dF9Dk3a6';

  const check = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  if (check.rows.length === 0) {
    await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, role, status, is_active, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['الأستاذ محمد الساحوري (مدير النظام)', phone, passwordHash, 'super_admin', 'active', true, true]
    );
    console.log(`✅ Default Super Admin created!`);
    console.log(`📱 Phone: ${phone}`);
  } else {
    console.log(`ℹ️ Super Admin account already exists.`);
  }

  await pool.end();
}

seedAdmin().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
