-- ============================================================
-- Migration: 018_advanced_sla_config.sql
-- Description: Configurable SLA by Issue Type and Business Hours exclusion
-- ============================================================

-- 1. Insert Advanced SLA Settings
INSERT INTO public.global_settings (key, value, description)
VALUES 
(
  'sla_config_by_type', 
  '{
    "Software": 4,
    "Hardware": 24,
    "Network": 2,
    "System": 8,
    "Access": 1,
    "Other": 12,
    "Default": 8
  }', 
  'SLA Hours mapping based on issue_type'
),
(
  'business_hours', 
  '{
    "exclude_periods": [
      {"start": "02:30", "end": "08:30"}
    ],
    "timezone": "Asia/Bangkok"
  }', 
  'Configurable periods to exclude from SLA clock'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Create a smart SLA calculation function
-- This function calculates the expiration time by skipping excluded periods
CREATE OR REPLACE FUNCTION public.calculate_sla_expiration(
    p_start_time TIMESTAMPTZ,
    p_sla_hours NUMERIC
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_current_time TIMESTAMPTZ;
    v_target_seconds NUMERIC;
    v_step_seconds INT := 300; -- Check every 5 mins for efficiency
    v_is_excluded BOOLEAN;
    v_exclude_config JSONB;
    v_period RECORD;
    v_time_str TEXT;
BEGIN
    v_current_time := p_start_time;
    v_target_seconds := p_sla_hours * 3600;
    
    -- Load config
    SELECT value INTO v_exclude_config FROM public.global_settings WHERE key = 'business_hours';

    WHILE v_target_seconds > 0 LOOP
        v_current_time := v_current_time + (v_step_seconds || ' seconds')::INTERVAL;
        
        -- Convert current time to string format "HH:MM" for comparison
        v_time_str := TO_CHAR(v_current_time AT TIME ZONE 'Asia/Bangkok', 'HH24:MI');
        
        v_is_excluded := FALSE;
        
        -- Check if current time falls into any exclude period
        FOR v_period IN SELECT * FROM jsonb_to_recordset(v_exclude_config->'exclude_periods') AS x(start TEXT, "end" TEXT) LOOP
            IF v_time_str >= v_period.start AND v_time_str < v_period."end" THEN
                v_is_excluded := TRUE;
                EXIT;
            END IF;
        END LOOP;

        IF NOT v_is_excluded THEN
            v_target_seconds := v_target_seconds - v_step_seconds;
        END IF;
        
        -- Safety breakout (max 7 days)
        IF v_current_time > p_start_time + INTERVAL '7 days' THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN v_current_time;
END;
$$ LANGUAGE plpgsql STABLE;
