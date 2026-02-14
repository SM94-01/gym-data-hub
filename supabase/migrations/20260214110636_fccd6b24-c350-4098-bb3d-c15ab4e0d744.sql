-- Allow clients to read their own trainer_clients records
CREATE POLICY "Clients can view their trainers"
ON public.trainer_clients
FOR SELECT
USING (client_id = auth.uid());