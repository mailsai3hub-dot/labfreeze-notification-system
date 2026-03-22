-- ==========================================
-- LabFreeze Web Manager - Production Schema (Supabase)
-- ==========================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('Admin', 'User');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commitment_grade') THEN
        CREATE TYPE commitment_grade AS ENUM ('Good', 'Average', 'Poor', 'Unrated');
    END IF;
END $$;

-- 3. Users Table (Public Profile linked to Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Maps to auth.users.id ideally
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    role user_role DEFAULT 'User',
    permissions TEXT[] DEFAULT '{home}',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Fridges (Storage Units)
CREATE TABLE IF NOT EXISTS fridges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1000,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Samples (Inventory)
CREATE TABLE IF NOT EXISTS samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name TEXT NOT NULL,
    patient_id TEXT NOT NULL, -- Acts as Barcode/ID
    barcode TEXT,             -- Secondary barcode if needed
    tube_type TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Hold',
    storage_id UUID REFERENCES fridges(id), -- Link to Fridge
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Indexes for Dashboard Performance
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON samples(created_at);

-- 6. Inventory Logs (Activity Tracking)
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID REFERENCES samples(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'FINISH'
    details TEXT,
    performed_by TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Hold Cases (Separate Registry)
CREATE TABLE IF NOT EXISTS hold_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    test_type TEXT,
    center_name TEXT,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'FollowUp',
    is_finished BOOLEAN DEFAULT FALSE,
    finished_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Staff Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES users(id),
    staff_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    admin_id UUID,
    month TEXT, -- YYYY-MM
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Inventory Schedules
CREATE TABLE IF NOT EXISTS inventory_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES users(id),
    staff_name TEXT,
    staff_phone TEXT,
    staff_email TEXT,
    date DATE NOT NULL,
    time TIME DEFAULT '09:00',
    status TEXT DEFAULT 'pending',
    type TEXT DEFAULT 'Both',
    message TEXT,
    commitment_grade commitment_grade DEFAULT 'Unrated',
    send_advance_reminder BOOLEAN DEFAULT TRUE,
    send_same_day_reminder BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Settings & Notifications
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_day INTEGER DEFAULT 25,
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hold_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read most data (Shared Lab Environment)
CREATE POLICY "Allow read access for authenticated users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON fridges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON samples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON inventory_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON hold_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON inventory_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON notification_settings FOR SELECT TO authenticated USING (true);

-- Policy: Evaluations are private to the staff member and admins
CREATE POLICY "Staff can see own evaluations" ON evaluations FOR SELECT TO authenticated USING (auth.uid() = staff_id);
-- Note: Admin check requires a custom claim or a lookup table. For simplicity in this schema, we might need a function or just allow read if we assume all authenticated users are staff.
-- Ideally: USING (auth.uid() = staff_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'))

-- Policy: Insert/Update restrictions
-- Only authenticated users can insert samples/hold cases
CREATE POLICY "Allow insert for authenticated users" ON samples FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON samples FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated users" ON samples FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON hold_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON hold_cases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated users" ON hold_cases FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON inventory_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Only Admins should update settings (This requires app-level enforcement or complex SQL policies)
-- For now, allow authenticated users to update settings as it's a shared lab tool
CREATE POLICY "Allow update settings for authenticated" ON settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow update notification settings for authenticated" ON notification_settings FOR ALL TO authenticated USING (true);

-- Schedules: Users can manage their own schedules? Or Admins manage all?
-- Allow all authenticated for now to facilitate collaboration
CREATE POLICY "Allow all for schedules" ON inventory_schedules FOR ALL TO authenticated USING (true);


-- 12. Seed Data
-- Default Fridge
INSERT INTO fridges (name, capacity, location) VALUES ('Main Fridge A', 5000, 'Lab Zone 1') ON CONFLICT DO NOTHING;
