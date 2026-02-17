-- 00002_seed_categories.sql
-- Predefined system categories (from existing Excel tracking)

INSERT INTO public.categories (user_id, name, name_en, name_lt, is_system, sort_order)
VALUES
    (NULL, NULL, 'Transport Tickets', 'Transporto bilietai', true, 1),
    (NULL, NULL, 'Bolt', 'Bolt', true, 2),
    (NULL, NULL, 'Apartment', 'Butas', true, 3),
    (NULL, NULL, 'Gifts', 'Dovanos', true, 4),
    (NULL, NULL, 'Deposit', 'Indėlis', true, 5),
    (NULL, NULL, 'Investing', 'Investavimas', true, 6),
    (NULL, NULL, 'Travel', 'Kelionės', true, 7),
    (NULL, NULL, 'Books', 'Knygos', true, 8),
    (NULL, NULL, 'Computer Games', 'Kompiuteriniai žaidimai', true, 9),
    (NULL, NULL, 'Leasing', 'Lizingas', true, 10),
    (NULL, NULL, 'Food', 'Maistas', true, 11),
    (NULL, NULL, 'Ordered Food', 'Maistas užsakytas', true, 12),
    (NULL, NULL, 'Car', 'Mašina', true, 13),
    (NULL, NULL, 'Taxes', 'Mokesčiai', true, 14),
    (NULL, NULL, 'Unexpected Expenses', 'Nenumatytos išlaidos', true, 15),
    (NULL, NULL, 'Services', 'Paslaugos', true, 16),
    (NULL, NULL, 'Periodic Payments', 'Periodiniai mokėjimai', true, 17),
    (NULL, NULL, 'Entertainment', 'Pramogos', true, 18),
    (NULL, NULL, 'Industrial Goods', 'Pramonės prekės', true, 19),
    (NULL, NULL, 'Clothes', 'Rūbai', true, 20),
    (NULL, NULL, 'Sweets', 'Saldumynai', true, 21),
    (NULL, NULL, 'Home', 'Namai', true, 22),
    (NULL, NULL, 'Debt', 'Skola', true, 23),
    (NULL, NULL, 'Health', 'Sveikata', true, 24),
    (NULL, NULL, 'Waste', 'Švaistymas', true, 25);
