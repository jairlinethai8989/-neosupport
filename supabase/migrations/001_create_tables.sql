-- ============================================================
-- IT Support Ticketing System - Supabase Migration
-- Version: 1.0.0
-- Description: Core schema for multi-hospital IT support
-- ============================================================

-- Enable UUID extension (Supabase typically has this, but just in case)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLE: hospitals
-- Stores hospital information for 100+ hospitals.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50)  NOT NULL UNIQUE,  -- e.g., 'KOKHA', 'NANGRONG'
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.hospitals IS 'Stores hospital master data for the ticketing system.';
COMMENT ON COLUMN public.hospitals.abbreviation IS 'Short code used in ticket_no generation (e.g., KOKHA).';

-- ============================================================
-- 2. TABLE: users (LINE Users / Hospital Staff)
-- Each user is linked to a hospital via hospital_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_uid     VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    hospital_id  UUID         NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
    department   VARCHAR(255),  -- e.g., 'ห้องพยาบาล', 'ห้องทำงานแพทย์'
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users IS 'LINE users (hospital staff) who report issues.';
COMMENT ON COLUMN public.users.line_uid IS 'Unique LINE user ID from the LINE Messaging API.';
COMMENT ON COLUMN public.users.hospital_id IS 'References hospitals.id — which hospital this user belongs to.';

-- Index for fast lookup by LINE UID (login/webhook)
DROP INDEX IF EXISTS idx_users_line_uid;
CREATE INDEX idx_users_line_uid ON public.users(line_uid);
-- Index for filtering users by hospital
DROP INDEX IF EXISTS idx_users_hospital_id;
CREATE INDEX idx_users_hospital_id ON public.users(hospital_id);

-- ============================================================
-- 3. TABLE: tickets (Main issue tracking table)
-- Migrated from legacy Google Sheets system.
-- ============================================================

-- Create a custom ENUM for ticket status
CREATE TYPE public.ticket_status AS ENUM (
    'Pending',
    'In Progress',
    'Resolved',
    'Escalated',
    'Closed'
);

-- Create a custom ENUM for issue type
CREATE TYPE public.issue_type AS ENUM (
    'PB',
    'แนะนำ',
    'USER',
    'Bug',
    'Feature Request',
    'Other'
);

-- Create a custom ENUM for escalation target
CREATE TYPE public.escalation_target AS ENUM (
    'Programmer',
    'SA',
    'Infra',
    'Network',
    'DBA',
    'Other'
);

CREATE TABLE IF NOT EXISTS public.tickets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_no     VARCHAR(100) NOT NULL UNIQUE,  -- Auto-generated: SRS_{ABBR}_IPD_{000X}
    description   TEXT         NOT NULL,          -- Issue details from user
    notes         TEXT,                           -- Internal notes from support
    module        VARCHAR(255),                   -- e.g., 'ห้องพยาบาล'
    issue_type    public.issue_type DEFAULT 'PB',
    source        VARCHAR(50)  NOT NULL DEFAULT 'LINE',
    status        public.ticket_status NOT NULL DEFAULT 'Pending',
    assignee_name VARCHAR(255),                   -- Name of support person
    escalated_to  public.escalation_target,       -- Target department for escalation
    reporter_id   UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.tickets IS 'Main IT support ticket table — migrated from Google Sheets.';
COMMENT ON COLUMN public.tickets.ticket_no IS 'Auto-generated ticket number: SRS_{HOSPITAL_ABBR}_IPD_{RUNNING_NUMBER}.';
COMMENT ON COLUMN public.tickets.escalated_to IS 'Department the ticket is forwarded to when escalated.';

-- Indexes for common query patterns
DROP INDEX IF EXISTS idx_tickets_status;
CREATE INDEX idx_tickets_status       ON public.tickets(status);

DROP INDEX IF EXISTS idx_tickets_reporter_id;
CREATE INDEX idx_tickets_reporter_id  ON public.tickets(reporter_id);

DROP INDEX IF EXISTS idx_tickets_escalated_to;
CREATE INDEX idx_tickets_escalated_to ON public.tickets(escalated_to);

DROP INDEX IF EXISTS idx_tickets_created_at;
CREATE INDEX idx_tickets_created_at   ON public.tickets(created_at DESC);

DROP INDEX IF EXISTS idx_tickets_assignee;
CREATE INDEX idx_tickets_assignee     ON public.tickets(assignee_name);

-- Composite index for dashboard filtering (status + escalation)
DROP INDEX IF EXISTS idx_tickets_status_escalated;
CREATE INDEX idx_tickets_status_escalated ON public.tickets(status, escalated_to);
