# Excel Reference — Alga.xlsx

Summary of the existing Excel-based finance tracking that this app replaces.

## Structure

- **91 sheets** spanning March 2020 to February 2026
- Each month has its own sheet (e.g. `2026-02`)
- Early months had separate credit card sheets (e.g. `2020-03 kred`) — later consolidated into single sheets
- Last sheet `Kategorijos` contains category definitions

## Monthly Sheet Layout

### Header (columns I-J)
- **Pradžia** (Start) — first day of the tracking period (not always the 1st — sometimes salary date, e.g. 9th or 10th)
- **Alga** (Salary) — monthly income
- **Likutis** (Remaining) — calculated: salary minus total expenses
- **Paskutinė diena** (Last day) — end of tracking period
- **Likęs dienų skaičius** (Days remaining) — days left in period
- **Pinigų suma vienai dienai** (Money per day) — remaining / days remaining

### Expense Rows (columns A-F)
- **Prekė** (Item) — expense description (A)
- **Kaina** (Price/Amount) — expense amount (B)
- **Vieta** (Place/Vendor) — where purchased (C)
- **Data** (Date) — expense date (D)
- **Kategorija** (Category) — expense category (E) — added from April 2020 onwards
- **Komentaras** (Comment) — optional notes (F)

### Category Summary (columns I-J, from row 12 onwards)
- **Kategorija** (Category) — category name (I)
- **Suma** (Total) — total spent in that category (J)

## Recurring Expenses Pattern

These appear at the top of every month with consistent amounts:
- Telefono planas (Phone plan) — 9.99
- Telia internetas — 32.00
- Kortelės administravimo mokestis (Card admin fee) — 1.44
- Revolut — 0.00
- Patogu paslaugos mokestis — 1.00
- Patreon — 0.00
- Youtube Premium — 0.00
- Kreditas (Loan) — varies
- Google — 1.99
- Crunchyroll — 0.00
- Šventoji Būsto draudimas (Property insurance) — 7.00
- Maistas (Food budget) — 200-300
- Šventosios būsto įmoka (Mortgage) — 453.00
- Šventosios būsto mokesčiai (Property taxes) — ~15
- Palangos ūkio sąskaita (Utility bill) — varies
- Starlink — 35.00
- Paskola (Loan) — varies
- Investavimas (Investing) — varies
- Mokesčiai (Taxes) — varies
- Mašinos Kasko draudimas (Car insurance) — 40.00

## Categories (from `Kategorijos` sheet)

1. Transporto bilietai (Transport Tickets)
2. Bolt
3. Butas (Apartment)
4. Dovanos (Gifts)
5. Indėlis (Deposit)
6. Investavimas (Investing)
7. Kelionės (Travel)
8. Knygos (Books)
9. Kompiuteriniai žaidimai (Computer Games)
10. Lizingas (Leasing)
11. Maistas (Food)
12. Maistas užsakytas (Ordered Food)
13. Mašina (Car)
14. Mokesčiai (Taxes)
15. Nenumatytos išlaidos (Unexpected Expenses)
16. Paslaugos (Services)
17. Periodiniai mokėjimai (Periodic Payments)
18. Pramogos (Entertainment)
19. Pramonės prekės (Industrial Goods)
20. Rūbai (Clothes)
21. Saldumynai (Sweets)
22. Namai (Home)
23. Skola (Debt)
24. Sveikata (Health)
25. Švaistymas (Waste)

All 25 categories are seeded as system categories in the database.

## Key Observations

- **Tracking period is salary-to-salary**, not calendar month (e.g. 2026-02 starts on Feb 10, ends Mar 9). The app currently uses calendar months — this is a simplification.
- **Negative amounts** represent money received (e.g. refunds, money from others)
- **Zero-amount items** are subscriptions paid by someone else but tracked for visibility
- **Category summary** is the most-used analytical view — total per category per month
- **Credit card sheets** (early months) tracked separate spending sources — later merged
- **Per-day budget** is the key daily decision metric
