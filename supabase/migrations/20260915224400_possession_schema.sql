-- Create enums
CREATE TYPE public.possession_status AS ENUM ('pending', 'scheduled', 'handed_over');

-- Create possession_records table
CREATE TABLE public.possession_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
    status public.possession_status NOT NULL DEFAULT 'pending'::public.possession_status,
    possession_date date,
    remarks text,
    documents jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT possession_records_pkey PRIMARY KEY (id)
);

-- RLS Policies
ALTER TABLE public.possession_records ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to authenticated users on possession_records"
    ON public.possession_records FOR SELECT TO authenticated USING (true);

-- Allow service_role full access
CREATE POLICY "Allow service_role full access to possession_records"
    ON public.possession_records FOR ALL TO service_role USING (true) WITH CHECK (true);