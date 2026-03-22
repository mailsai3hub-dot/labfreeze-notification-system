-- ==========================================
-- FIX: Enable DELETE permissions for Samples and Hold Cases
-- Run this script in Supabase SQL Editor to fix the "Delete not working" issue.
-- ==========================================

-- 1. Allow DELETE on samples table
CREATE POLICY "Allow delete for authenticated users" ON samples FOR DELETE TO authenticated USING (true);

-- 2. Allow DELETE on hold_cases table
CREATE POLICY "Allow delete for authenticated users" ON hold_cases FOR DELETE TO authenticated USING (true);

-- 3. Allow DELETE on inventory_logs (optional, if you want to allow deleting logs)
CREATE POLICY "Allow delete for authenticated users" ON inventory_logs FOR DELETE TO authenticated USING (true);
