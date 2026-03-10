INSERT INTO storage.buckets (id, name, public) VALUES ('app-icons', 'app-icons', true);

CREATE POLICY "Anyone can upload app icons" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'app-icons');
CREATE POLICY "Anyone can read app icons" ON storage.objects FOR SELECT TO public USING (bucket_id = 'app-icons');
CREATE POLICY "Anyone can update app icons" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'app-icons');
CREATE POLICY "Anyone can delete app icons" ON storage.objects FOR DELETE TO public USING (bucket_id = 'app-icons');