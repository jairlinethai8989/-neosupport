-- ============================================================
-- Migration: 017_reporting_views.sql
-- Description: Optimized views for analytics and dashboard charts
-- ============================================================

-- 1. View for SLA Performance (Improved)
CREATE OR REPLACE VIEW public.view_sla_performance AS
WITH sla_configs AS (
    SELECT value FROM public.global_settings WHERE key = 'sla_config_by_type'
)
SELECT 
    t.id,
    t.ticket_no,
    t.status,
    t.priority,
    t.issue_type,
    t.created_at,
    t.updated_at,
    h.name AS hospital_name,
    COALESCE(
        (SELECT (v->>COALESCE(t.issue_type, 'Default'))::NUMERIC FROM sla_configs, LATERAL (SELECT value as v) l),
        8
    ) AS sla_hours,
    public.calculate_sla_expiration(
        t.created_at, 
        COALESCE((SELECT (v->>COALESCE(t.issue_type, 'Default'))::NUMERIC FROM sla_configs, LATERAL (SELECT value as v) l), 8)
    ) AS sla_expiration_time,
    CASE
        WHEN t.status = 'Escalated' THEN 'Exempt'
        WHEN t.status IN ('Resolved', 'Closed') THEN
            CASE 
                WHEN COALESCE(t.updated_at, t.created_at) <= public.calculate_sla_expiration(
                    t.created_at, 
                    COALESCE((SELECT (v->>COALESCE(t.issue_type, 'Default'))::NUMERIC FROM sla_configs, LATERAL (SELECT value as v) l), 8)
                ) THEN 'Achieved'
                ELSE 'Breached'
            END
        ELSE 
            CASE 
                WHEN NOW() > public.calculate_sla_expiration(
                    t.created_at, 
                    COALESCE((SELECT (v->>COALESCE(t.issue_type, 'Default'))::NUMERIC FROM sla_configs, LATERAL (SELECT value as v) l), 8)
                ) THEN 'Breached'
                ELSE 'Pending'
            END
    END AS sla_status
FROM public.tickets t
JOIN public.hospitals h ON h.id = t.hospital_id;

-- 2. View for Ticket Trends (Daily Load)
CREATE OR REPLACE VIEW public.view_ticket_trends AS
SELECT 
    created_at::DATE AS report_date,
    COUNT(*) AS total_tickets,
    COUNT(*) FILTER (WHERE status = 'Resolved' OR status = 'Closed') AS resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'Pending') AS new_tickets
FROM public.tickets
GROUP BY created_at::DATE
ORDER BY report_date DESC;

-- 3. View for Department Distribution
CREATE OR REPLACE VIEW public.view_department_load AS
SELECT 
    d.name AS department_name,
    COUNT(t.id) AS active_tickets
FROM public.departments d
LEFT JOIN public.tickets t ON t.current_department_id = d.id
WHERE t.status NOT IN ('Resolved', 'Closed') OR t.id IS NULL
GROUP BY d.name;

-- 4. View for Hospital Load
CREATE OR REPLACE VIEW public.view_hospital_load AS
SELECT 
    h.name AS hospital_name,
    COUNT(t.id) AS ticket_count
FROM public.hospitals h
LEFT JOIN public.tickets t ON t.hospital_id = h.id
GROUP BY h.name
ORDER BY ticket_count DESC;

-- Grant permissions
GRANT SELECT ON public.view_sla_performance TO authenticated;
GRANT SELECT ON public.view_ticket_trends TO authenticated;
GRANT SELECT ON public.view_department_load TO authenticated;
GRANT SELECT ON public.view_hospital_load TO authenticated;

COMMENT ON VIEW public.view_sla_performance IS 'Analyzes SLA achievement based on priority and resolution time.';
COMMENT ON VIEW public.view_ticket_trends IS 'Aggregates daily ticket volumes for trend analysis.';
