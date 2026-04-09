
-- Add ata_url column to clientes
ALTER TABLE public.clientes ADD COLUMN ata_url text DEFAULT NULL;

-- Create storage bucket for atas
INSERT INTO storage.buckets (id, name, public) VALUES ('atas', 'atas', true);

-- Storage policies
CREATE POLICY "Admins can do all on atas" ON storage.objects FOR ALL USING (bucket_id = 'atas' AND public.is_admin());

CREATE POLICY "Clientes can upload own atas" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'atas' AND public.is_cliente_owner((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Anyone can view atas" ON storage.objects FOR SELECT USING (bucket_id = 'atas');
