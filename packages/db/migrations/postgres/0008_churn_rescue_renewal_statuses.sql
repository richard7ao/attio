-- Extend churn_rescue_queue.status with post-call renewal/monitor states.
-- Set by the voice backend's SLNG call_end listener (handleCallEnd):
--   completed call (real conversation) -> 'new_renewal' (pending renewal action)
--   non-conversation outcomes          -> 'monitor'    (watch + retry)

ALTER TABLE "churn_rescue_queue"
  DROP CONSTRAINT IF EXISTS "churn_rescue_queue_status_check";

ALTER TABLE "churn_rescue_queue"
  ADD CONSTRAINT "churn_rescue_queue_status_check"
  CHECK (status IN ('pending', 'in_progress', 'resolved', 'dismissed', 'new_renewal', 'monitor'));
