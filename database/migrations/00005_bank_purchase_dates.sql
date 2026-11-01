-- =============================================================================
-- Card payments are dated by purchase, not booking (TransactionMapper.PurchaseDate).
-- One-off fix for suggestions imported before that: un-reviewed Enable Banking rows take the
-- bank's transaction_date, else the purchase date in a card payment's text
-- ("PIRKINYS 516793******4160 2026.10.28 …"), when it is 0-14 days before the stored date.
-- Rows already accepted, dismissed or linked keep their dates.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    m TEXT[];
    candidate DATE;
    spent DATE;
BEGIN
    FOR r IN
        SELECT id, booking_date, description, raw_data ->> 'transaction_date' AS transaction_date
        FROM public.bank_transactions
        WHERE source = 'enable_banking' AND review_status = 'pending' AND booking_date IS NOT NULL
    LOOP
        spent := NULL;

        IF r.transaction_date ~ '^\d{4}-\d{2}-\d{2}$' THEN
            BEGIN
                spent := r.transaction_date::date;
            EXCEPTION WHEN others THEN
                spent := NULL;
            END;
        ELSIF r.description ~ '\d*\*{2,}\d{4}' THEN
            -- First date in the text (yyyy.MM.dd or dd.MM.yyyy) that falls in the window
            FOR m IN
                SELECT regexp_matches(r.description,
                    '\m(?:(\d{4})[./-](\d{2})[./-](\d{2})|(\d{2})[./-](\d{2})[./-](\d{4}))\M', 'g')
            LOOP
                BEGIN
                    candidate := CASE
                        WHEN m[1] IS NOT NULL THEN make_date(m[1]::int, m[2]::int, m[3]::int)
                        ELSE make_date(m[6]::int, m[5]::int, m[4]::int)
                    END;
                EXCEPTION WHEN others THEN
                    candidate := NULL;
                END;

                IF candidate BETWEEN r.booking_date - 14 AND r.booking_date THEN
                    spent := candidate;
                    EXIT;
                END IF;
            END LOOP;
        END IF;

        IF spent IS NOT NULL AND spent <> r.booking_date THEN
            UPDATE public.bank_transactions SET booking_date = spent WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
