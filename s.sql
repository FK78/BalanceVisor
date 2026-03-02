DO $$ BEGIN
  CREATE TYPE shared_resource_type AS ENUM ('account', 'budget');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE shared_permission AS ENUM ('view', 'edit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE shared_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS shared_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  shared_with_id UUID,
  shared_with_email VARCHAR(255) NOT NULL,
  resource_type shared_resource_type NOT NULL,
  resource_id UUID NOT NULL,
  permission shared_permission NOT NULL DEFAULT 'edit',
  status shared_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_share ON shared_access (shared_with_email, resource_type, resource_id);

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE email = lower(lookup_email) LIMIT 1;
$$;