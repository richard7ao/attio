-- Emit a NOTIFY whenever a company's churn inputs change, so the long-running
-- worker (apps/worker) can recompute only the affected company.
-- Payload is the company_id. Channel: 'company_changed'.

CREATE OR REPLACE FUNCTION notify_company_changed() RETURNS trigger AS $$
DECLARE
  cid text;
BEGIN
  cid := COALESCE(NEW.company_id, OLD.company_id);
  PERFORM pg_notify('company_changed', cid);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fire when signals are added/changed/removed.
DROP TRIGGER IF EXISTS trg_company_signals_changed ON company_signals;
CREATE TRIGGER trg_company_signals_changed
AFTER INSERT OR UPDATE OR DELETE ON company_signals
FOR EACH ROW EXECUTE FUNCTION notify_company_changed();
