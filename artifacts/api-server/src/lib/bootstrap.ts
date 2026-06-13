import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Run at server startup:
 * 1. Verify DB connectivity
 * 2. Create any missing tables / enums (idempotent DDL)
 * 3. Ensure the super admin account exists
 *
 * If the DB is completely unavailable, we log a warning and continue —
 * the auth route's built-in fallback handles that case.
 */
export async function bootstrap(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    logger.info("Database connection verified");
  } catch (err) {
    logger.warn({ err }, "Database unavailable at startup — running in degraded mode (super-admin fallback active)");
    return;
  }

  // ── Create enums idempotently ──────────────────────────────────────────────
  const enumDDL = `
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('customer','technician','admin','super_admin');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('active','pending','suspended','banned','rejected');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE approval_status AS ENUM ('pending','approved','rejected');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE request_status AS ENUM ('pending','offers_received','technician_selected','in_progress','price_change_requested','waiting_approval','completed','cancelled_by_customer','cancelled_by_technician','cancelled_by_admin','disputed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE offer_status AS ENUM ('pending','selected','rejected','withdrawn');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE message_type AS ENUM ('text','image');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE point_transaction_type AS ENUM ('credit','debit','commission');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE commission_type AS ENUM ('fixed','percentage');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE ticket_status AS ENUM ('open','in_progress','resolved','closed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE ticket_priority AS ENUM ('low','normal','high','urgent');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE notification_type AS ENUM ('new_request','new_offer','technician_selected','new_message','price_adjustment','status_change','support_reply','announcement');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE banner_location AS ENUM ('hero','below_services','before_footer');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  // ── Create tables idempotently ─────────────────────────────────────────────
  const tableDDL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      mobile VARCHAR(20) NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL DEFAULT 'customer',
      status user_status NOT NULL DEFAULT 'active',
      profile_image TEXT,
      job_title TEXT,
      suspension_reason TEXT,
      banned_until TIMESTAMP,
      banned_by_admin_id INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS users_mobile_idx ON users (mobile);
    CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

    CREATE TABLE IF NOT EXISTS governorates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      governorate_id INTEGER NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      icon TEXT,
      image TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS technician_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      national_id VARCHAR(20) NOT NULL,
      personal_photo TEXT,
      national_id_front TEXT,
      national_id_back TEXT,
      approval_status approval_status NOT NULL DEFAULT 'pending',
      rejection_reason TEXT,
      rejected_by_admin_id INTEGER,
      rejected_at TIMESTAMP,
      points_balance INTEGER NOT NULL DEFAULT 0,
      reserved_points INTEGER NOT NULL DEFAULT 0,
      primary_area_id INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS technician_services (
      id SERIAL PRIMARY KEY,
      technician_id INTEGER NOT NULL REFERENCES technician_profiles(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS technician_areas (
      id SERIAL PRIMARY KEY,
      technician_id INTEGER NOT NULL REFERENCES technician_profiles(id) ON DELETE CASCADE,
      area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES users(id),
      service_id INTEGER NOT NULL REFERENCES services(id),
      selected_technician_id INTEGER REFERENCES users(id),
      status request_status NOT NULL DEFAULT 'pending',
      full_name TEXT NOT NULL,
      mobile VARCHAR(20) NOT NULL,
      governorate_id INTEGER NOT NULL REFERENCES governorates(id),
      area_id INTEGER NOT NULL REFERENCES areas(id),
      address TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT[] NOT NULL DEFAULT '{}',
      audio_url TEXT,
      agreed_price NUMERIC(10,2),
      admin_note TEXT,
      cancel_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS requests_customer_idx ON service_requests (customer_id);
    CREATE INDEX IF NOT EXISTS requests_status_idx ON service_requests (status);
    CREATE INDEX IF NOT EXISTS requests_service_idx ON service_requests (service_id);
    CREATE INDEX IF NOT EXISTS requests_area_idx ON service_requests (area_id);

    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      technician_id INTEGER NOT NULL REFERENCES users(id),
      price NUMERIC(10,2) NOT NULL,
      spare_parts NUMERIC(10,2),
      notes TEXT,
      status offer_status NOT NULL DEFAULT 'pending',
      reserved_points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS offers_request_idx ON offers (request_id);
    CREATE INDEX IF NOT EXISTS offers_technician_idx ON offers (technician_id);

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      type message_type NOT NULL DEFAULT 'text',
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS messages_request_idx ON messages (request_id);

    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES users(id),
      technician_id INTEGER NOT NULL REFERENCES users(id),
      stars INTEGER NOT NULL,
      review TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS point_transactions (
      id SERIAL PRIMARY KEY,
      technician_id INTEGER NOT NULL REFERENCES technician_profiles(id),
      amount INTEGER NOT NULL,
      type point_transaction_type NOT NULL,
      description TEXT NOT NULL,
      balance_after INTEGER NOT NULL,
      request_id INTEGER REFERENCES service_requests(id),
      admin_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS point_txn_technician_idx ON point_transactions (technician_id);

    CREATE TABLE IF NOT EXISTS commissions (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
      area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
      type commission_type NOT NULL,
      value NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS price_adjustments (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      new_price NUMERIC(10,2) NOT NULL,
      new_description TEXT NOT NULL,
      images TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      images TEXT[] NOT NULL DEFAULT '{}',
      status ticket_status NOT NULL DEFAULT 'open',
      priority ticket_priority NOT NULL DEFAULT 'normal',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ticket_replies (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type notification_type NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      related_id INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id);
    CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (is_read);

    CREATE TABLE IF NOT EXISTS cms_settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      button_text TEXT,
      button_link TEXT,
      location banner_location NOT NULL DEFAULT 'hero',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_permissions (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      permissions TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS audit_trail_request_idx ON audit_trail (request_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS activity_logs_admin_idx ON activity_logs (admin_id);
  `;

  const alterDDL = `
    ALTER TABLE IF EXISTS services ADD COLUMN IF NOT EXISTS icon_size INTEGER NOT NULL DEFAULT 100;
    ALTER TABLE IF EXISTS services ADD COLUMN IF NOT EXISTS icon_shape TEXT NOT NULL DEFAULT 'square';
  `;

  try {
    await pool.query(enumDDL);
    await pool.query(tableDDL);
    await pool.query(alterDDL);
    logger.info("Schema verified / created successfully");
  } catch (err) {
    logger.error({ err }, "Failed to apply schema DDL");
    // Non-fatal: tables may already exist with Drizzle push
  }

  // Super admin is managed entirely in code — no DB record is created or
  // expected. See src/routes/auth.ts for the hardcoded credential check.
}
