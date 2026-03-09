-- Create global_settings table if not exists (it might exist but let's ensure schema)
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default values for new policies
INSERT INTO public.global_settings (key, value, description)
VALUES 
('cleanup_policy', '{"days": 30, "enabled": true}', 'File cleanup policy configuration'),
('upload_limits', '{"max_video_size_mb": 10, "max_image_size_mb": 5}', 'File upload size limits in MB')
ON CONFLICT (key) DO NOTHING;

-- Grant access (Policies might already exist but let's be safe)
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to view global settings" ON public.global_settings;
CREATE POLICY "Allow all users to view global settings" 
ON public.global_settings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update global settings" ON public.global_settings;
CREATE POLICY "Allow authenticated users to update global settings" 
ON public.global_settings FOR UPDATE 
USING (auth.role() = 'authenticated');
