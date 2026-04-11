-- Migration: Add unique constraints for safe upserts
-- Ensures ON CONFLICT works for churches and departments

ALTER TABLE churches ADD CONSTRAINT uq_churches_name UNIQUE (name);
ALTER TABLE departments ADD CONSTRAINT uq_departments_name_church UNIQUE (name, church_id);
