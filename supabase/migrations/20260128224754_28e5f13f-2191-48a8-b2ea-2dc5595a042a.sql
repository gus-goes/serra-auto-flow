-- Allow anyone (including unauthenticated users on login page) to view app_download_links
CREATE POLICY "Anyone can view app download links"
ON public.company_settings
FOR SELECT
USING (key = 'app_download_links');