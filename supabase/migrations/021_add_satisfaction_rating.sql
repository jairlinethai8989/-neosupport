-- ============================================================
-- Migration: 021_add_satisfaction_rating.sql
-- Description: Store customer satisfaction ratings for tickets
-- ============================================================

-- 1. Add rating columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS rating_feedback TEXT,
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP WITH TIME ZONE;

-- 2. Update the staff performance view to include average rating
CREATE OR REPLACE VIEW public.view_staff_performance AS
WITH staff_sla AS (
    SELECT 
        assignee_name,
        sla_status,
        status,
        rating,
        created_at
    FROM public.view_sla_performance
    WHERE assignee_name IS NOT NULL AND assignee_name != ''
)
SELECT 
    assignee_name,
    COUNT(*) AS total_assigned,
    COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS total_resolved,
    COUNT(*) FILTER (WHERE status = 'Pending') AS pending_new,
    COUNT(*) FILTER (WHERE status = 'In Progress') AS pending_in_progress,
    COUNT(*) FILTER (WHERE sla_status = 'Achieved') AS sla_achieved,
    COUNT(*) FILTER (WHERE sla_status = 'Breached') AS sla_breached,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE sla_status = 'Achieved')::NUMERIC / COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed'))::NUMERIC) * 100, 2)
        ELSE 0 
    END AS sla_success_rate,
    ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL)::NUMERIC, 2) AS avg_rating
FROM staff_sla
GROUP BY assignee_name
ORDER BY total_resolved DESC;

-- 3. Update hospital performance view
CREATE OR REPLACE VIEW public.view_hospital_performance AS
WITH hospital_sla AS (
    SELECT 
        hospital_name,
        sla_status,
        status,
        rating
    FROM public.view_sla_performance
)
SELECT 
    hospital_name,
    COUNT(*) AS total_tickets,
    COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'Pending' OR status = 'In Progress') AS active_tickets,
    COUNT(*) FILTER (WHERE sla_status = 'Achieved') AS sla_achieved,
    COUNT(*) FILTER (WHERE sla_status = 'Breached') AS sla_breached,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE sla_status = 'Achieved')::NUMERIC / COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed'))::NUMERIC) * 100, 2)
        ELSE 0 
    END AS sla_success_rate,
    ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL)::NUMERIC, 2) AS avg_hospital_rating
FROM hospital_sla
GROUP BY hospital_name
ORDER BY total_tickets DESC;
