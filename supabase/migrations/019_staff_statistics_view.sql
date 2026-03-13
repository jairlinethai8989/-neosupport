-- ============================================================
-- Migration: 019_staff_statistics_view.sql
-- Description: View for tracking individual staff performance
-- ============================================================

CREATE OR REPLACE VIEW public.view_staff_performance AS
WITH staff_sla AS (
    SELECT 
        assignee_name,
        sla_status,
        status,
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
    END AS sla_success_rate
FROM staff_sla
GROUP BY assignee_name
ORDER BY total_resolved DESC;

GRANT SELECT ON public.view_staff_performance TO authenticated;

COMMENT ON VIEW public.view_staff_performance IS 'Aggregates performance metrics (tickets, SLA) per staff member.';
