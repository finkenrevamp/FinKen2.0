-- Password History Table Migration
-- This migration adds indexes and constraints for optimal password history performance

-- Index on user_id and created_at for efficient history queries
CREATE INDEX IF NOT EXISTS idx_password_history_user_created 
ON public.password_history(user_id, created_at DESC);

-- Index on user_id alone for user lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user 
ON public.password_history(user_id);

-- Add comment to table
COMMENT ON TABLE public.password_history IS 'Stores password history for preventing password reuse';

-- Add column comments
COMMENT ON COLUMN public.password_history.id IS 'Primary key';
COMMENT ON COLUMN public.password_history.user_id IS 'Reference to auth.users';
COMMENT ON COLUMN public.password_history.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN public.password_history.created_at IS 'When password was created';
