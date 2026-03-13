-- ============================================================
-- Migration: 020_hospital_statistics_view.sql
-- Description: Detailed performance metrics per hospital
-- ============================================================

CREATE OR REPLACE VIEW public.view_hospital_performance AS
WITH hospital_sla AS (
    SELECT 
        hospital_name,
        sla_status,
        status,
        issue_type
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
    END AS sla_success_rate
FROM hospital_sla
GROUP BY hospital_name
ORDER BY total_tickets DESC;

GRANT SELECT ON public.view_hospital_performance TO authenticated;

COMMENT ON VIEW public.view_hospital_performance IS 'Detailed metrics for each hospital client, including SLA and ticket volume.';
