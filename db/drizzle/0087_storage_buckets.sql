-- Custom SQL migration file, put your code below! --

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'storage' 
        AND table_name = 'buckets'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES 
            ('public-uploads', 'public-uploads', true),
            ('private-uploads', 'private-uploads', false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
