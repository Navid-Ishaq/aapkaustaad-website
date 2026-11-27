BEGIN;
ALTER TABLE public.learn_tests ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.learn_tests ADD COLUMN IF NOT EXISTS edited_by uuid;
ALTER TABLE public.learn_attempts ADD COLUMN IF NOT EXISTS test_revision integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS public.learn_test_revisions (
 test_id uuid NOT NULL REFERENCES public.learn_tests(id) ON DELETE CASCADE,
 revision integer NOT NULL, questions jsonb NOT NULL, max_errors integer NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT now(), replaced_by uuid,
 PRIMARY KEY(test_id,revision)
);
ALTER TABLE public.learn_test_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learn_test_revisions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.learn_test_revisions TO service_role;
CREATE OR REPLACE FUNCTION public.learn_archive_test_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.questions IS DISTINCT FROM OLD.questions OR NEW.max_errors IS DISTINCT FROM OLD.max_errors THEN
  INSERT INTO public.learn_test_revisions(test_id,revision,questions,max_errors,replaced_by)
  VALUES(OLD.id,OLD.revision,OLD.questions,OLD.max_errors,NEW.edited_by);
  NEW.revision := OLD.revision+1;
 ELSE
  NEW.revision := OLD.revision;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.learn_archive_test_revision() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learn_archive_test_revision() TO service_role;
DROP TRIGGER IF EXISTS learn_archive_test_revision ON public.learn_tests;
CREATE TRIGGER learn_archive_test_revision BEFORE UPDATE ON public.learn_tests
FOR EACH ROW EXECUTE FUNCTION public.learn_archive_test_revision();
NOTIFY pgrst,'reload schema';
COMMIT;
