-- 1. Helper functions for Auth Claims & Jurisdiction

-- Retrieve role from JWT claims
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::text;
END;
$$ LANGUAGE plpgsql STABLE;

-- Retrieve state code for the current user
CREATE OR REPLACE FUNCTION public.get_user_state_code()
RETURNS text AS $$
BEGIN
  RETURN (SELECT state_code FROM public.user_profiles WHERE auth_user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- Retrieve district code for the current user
CREATE OR REPLACE FUNCTION public.get_user_district_code()
RETURNS text AS $$
BEGIN
  RETURN (SELECT district_code FROM public.user_profiles WHERE auth_user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Sync user_profiles.role to Auth Claims

CREATE OR REPLACE FUNCTION public.set_user_role_claim()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || json_build_object('role', NEW.role)::jsonb
  WHERE id = NEW.auth_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profile_role_change ON public.user_profiles;
CREATE TRIGGER on_user_profile_role_change
  AFTER INSERT OR UPDATE OF role ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_role_claim();

-- 3. Enforce Role Update restriction (Only Admins)

CREATE OR REPLACE FUNCTION public.prevent_role_update_unless_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.get_user_role() != 'admin' THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_update_restriction ON public.user_profiles;
CREATE TRIGGER enforce_role_update_restriction
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_update_unless_admin();

-- 4. RLS Policies for user_profiles

DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- 5. RLS Policies for projects

-- Admins and Ministry Officers can view all
DROP POLICY IF EXISTS "Admins and Ministry can view all projects" ON public.projects;
CREATE POLICY "Admins and Ministry can view all projects"
  ON public.projects FOR SELECT
  USING (public.get_user_role() IN ('admin', 'ministry_officer'));

-- State Officers can view projects in their state
DROP POLICY IF EXISTS "State officers can view state projects" ON public.projects;
CREATE POLICY "State officers can view state projects"
  ON public.projects FOR SELECT
  USING (
    public.get_user_role() = 'state_officer' AND 
    state_code = public.get_user_state_code()
  );

-- District & Field Officers view projects in their district
DROP POLICY IF EXISTS "District and Field officers can view district projects" ON public.projects;
CREATE POLICY "District and Field officers can view district projects"
  ON public.projects FOR SELECT
  USING (
    public.get_user_role() IN ('district_officer', 'field_officer', 'project_manager') AND 
    district_code = public.get_user_district_code()
  );

-- Admin has full write access
DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;
CREATE POLICY "Admins have full access to projects"
  ON public.projects FOR ALL
  USING (public.get_user_role() = 'admin');

-- State officers can update projects in their state
DROP POLICY IF EXISTS "State officers can update state projects" ON public.projects;
CREATE POLICY "State officers can update state projects"
  ON public.projects FOR UPDATE
  USING (
    public.get_user_role() = 'state_officer' AND 
    state_code = public.get_user_state_code()
  );

-- District officers can update projects in their district
DROP POLICY IF EXISTS "District officers can update district projects" ON public.projects;
CREATE POLICY "District officers can update district projects"
  ON public.projects FOR UPDATE
  USING (
    public.get_user_role() = 'district_officer' AND 
    district_code = public.get_user_district_code()
  );

-- 6. RLS Policies for parcels
-- Parcels are generally visible to anyone who can view the parent project.
-- For simplicity, we apply similar jurisdiction rules as projects.

DROP POLICY IF EXISTS "Admins and Ministry can view all parcels" ON public.parcels;
CREATE POLICY "Admins and Ministry can view all parcels"
  ON public.parcels FOR SELECT
  USING (public.get_user_role() IN ('admin', 'ministry_officer'));

DROP POLICY IF EXISTS "State officers can view state parcels" ON public.parcels;
CREATE POLICY "State officers can view state parcels"
  ON public.parcels FOR SELECT
  USING (
    public.get_user_role() = 'state_officer' AND 
    state_code = public.get_user_state_code()
  );

DROP POLICY IF EXISTS "District and Field officers can view district parcels" ON public.parcels;
CREATE POLICY "District and Field officers can view district parcels"
  ON public.parcels FOR SELECT
  USING (
    public.get_user_role() IN ('district_officer', 'field_officer', 'project_manager') AND 
    district = public.get_user_district_code()
  );

-- Full access for admins
DROP POLICY IF EXISTS "Admins have full access to parcels" ON public.parcels;
CREATE POLICY "Admins have full access to parcels"
  ON public.parcels FOR ALL
  USING (public.get_user_role() = 'admin');

-- 7. RLS Policies for organizations
DROP POLICY IF EXISTS "Everyone can view organizations" ON public.organizations;
CREATE POLICY "Everyone can view organizations"
  ON public.organizations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify organizations" ON public.organizations;
CREATE POLICY "Only admins can modify organizations"
  ON public.organizations FOR ALL
  USING (public.get_user_role() = 'admin');
