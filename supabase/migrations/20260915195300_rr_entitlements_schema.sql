-- Create enums
CREATE TYPE public.family_category AS ENUM ('owner', 'tenant', 'agricultural_laborer', 'artisan');
CREATE TYPE public.entitlement_type AS ENUM ('housing', 'land', 'cash', 'employment', 'transportation');
CREATE TYPE public.rr_status AS ENUM ('pending', 'approved', 'provided');

-- Create affected_families table
CREATE TABLE public.affected_families (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
    head_of_family_name text NOT NULL,
    family_size integer NOT NULL DEFAULT 1,
    category public.family_category NOT NULL,
    status public.rr_status NOT NULL DEFAULT 'pending'::public.rr_status,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT affected_families_pkey PRIMARY KEY (id)
);

-- Create rr_entitlements table
CREATE TABLE public.rr_entitlements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.affected_families(id) ON DELETE CASCADE,
    entitlement_type public.entitlement_type NOT NULL,
    amount double precision,
    description text,
    status public.rr_status NOT NULL DEFAULT 'pending'::public.rr_status,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT rr_entitlements_pkey PRIMARY KEY (id)
);

-- RLS Policies
ALTER TABLE public.affected_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rr_entitlements ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (similar to projects)
CREATE POLICY "Allow read access to authenticated users on affected_families"
    ON public.affected_families FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users on rr_entitlements"
    ON public.rr_entitlements FOR SELECT TO authenticated USING (true);

-- Restrict insert/update to specific roles
-- (Assuming application-level checks in Next.js handle deeper logic, giving service_role full access)
CREATE POLICY "Allow service_role full access to affected_families"
    ON public.affected_families FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access to rr_entitlements"
    ON public.rr_entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);