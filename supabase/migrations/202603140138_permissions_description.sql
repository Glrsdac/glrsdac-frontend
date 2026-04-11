-- Add description column to permissions table
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS description TEXT;
