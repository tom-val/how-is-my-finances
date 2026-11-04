-- =============================================================================
-- Reservation merchants carried what was left of a two-digit-year date ("02.11.26" -> ".26 AWS EMEA"),
-- so they could not be matched to the booked payment. New rows are clean
-- (CounterpartyKey.WithoutDateRemainder); this fixes stored rows and the rules learned from them.
-- =============================================================================

UPDATE public.bank_transactions
SET counterparty_name = btrim(regexp_replace(regexp_replace(counterparty_name, '(^|\s)\.\d{2}(?=\s|$)', ' ', 'g'), '\s+', ' ', 'g')),
    counterparty_key = btrim(regexp_replace(regexp_replace(counterparty_key, '(^|\s)\.\d{2}(?=\s|$)', ' ', 'g'), '\s+', ' ', 'g'))
WHERE source = 'enable_banking'
  AND counterparty_key ~ '(^|\s)\.\d{2}(\s|$)';

-- A rule that already exists under the clean key wins; the old one then simply never matches again.
UPDATE public.bank_counterparty_rules r
SET counterparty_key = btrim(regexp_replace(regexp_replace(r.counterparty_key, '(^|\s)\.\d{2}(?=\s|$)', ' ', 'g'), '\s+', ' ', 'g'))
WHERE r.counterparty_key ~ '(^|\s)\.\d{2}(\s|$)'
  AND NOT EXISTS (
      SELECT 1 FROM public.bank_counterparty_rules c
      WHERE c.user_id = r.user_id AND c.direction = r.direction
        AND c.counterparty_key = btrim(regexp_replace(regexp_replace(r.counterparty_key, '(^|\s)\.\d{2}(?=\s|$)', ' ', 'g'), '\s+', ' ', 'g')));
