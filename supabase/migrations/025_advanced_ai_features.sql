-- ============================================================
-- Advanced AI Features Migration
-- Adds tables and columns for executive-grade AI insights and recommendations.
-- ============================================================

-- Table to store cached AI insights for the executive dashboard
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    insight_type VARCHAR(50) NOT NULL, -- e.g., 'daily_summary', 'trend_analysis'
    content     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_daily_insight UNIQUE(report_date, insight_type)
);

-- Store more granular AI data on tickets without adding dozens of columns
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{
  "suggested_category": null,
  "suggested_priority": null,
  "suggested_reply": null,
  "resolution_summary": null,
  "last_updated_at": null
}'::jsonb;

COMMENT ON TABLE  public.ai_insights IS 'Stores processed AI insights for dashboard visualizations.';
COMMENT ON COLUMN public.tickets.ai_metadata IS 'Unified storage for AI-assisted support features (suggestions, resolution summaries, etc.).';
