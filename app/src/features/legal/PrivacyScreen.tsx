import { LEGAL_CONTACT } from "./constants";
import { LegalLayout, usePickLanguage, type LegalDoc } from "./LegalLayout";

/**
 * The privacy policy. Written from what the code actually does: keep it in step with the backend
 * (backend/src), the AI processor (backend/src/ai-processor), the Android notification module
 * (app/modules/bank-notifications) and infra/ when a data flow or a provider changes, and bump
 * LEGAL_LAST_UPDATED. It also backs the App Store privacy label and the Play Data safety form:
 * no advertising, no tracking, no analytics SDKs.
 */
const EN: LegalDoc = {
  title: "Privacy policy",
  intro:
    "Finansai is a personal budgeting app: you record your monthly salary, expenses and incomes, and you can optionally let it suggest expenses from your bank transactions. This policy explains what personal data Finansai handles, why, who helps us process it and the rights you have. There is no advertising, no tracking and no analytics.",
  sections: [
    {
      heading: "1. Who is responsible",
      blocks: [
        {
          p: `Finansai is built and run by Tomas Valiūnas, an individual developer based in Lithuania, who is the data controller for the personal data described here ("we", "us"). For anything about this policy or your data, write to ${LEGAL_CONTACT}.`,
        },
      ],
    },
    {
      heading: "2. What we collect",
      blocks: [
        {
          bullets: [
            "Account: your email address and password, used to sign in. The password is handled by our authentication provider (Supabase Auth) and stored only as a one-way hash.",
            "Profile and settings: your display name, preferred language and currency. Theme and accent colour stay on your device.",
            "Your budget: the months you create with their salary and notes, expenses (item, amount, category, vendor, date, comment, paid or not), incomes, categories, vendors and recurring expense templates.",
            "Bank connection (optional, only if you connect a bank): which bank you connected, the consent's validity date, your account names, the account currency, a masked account number (only the last four digits are kept) and a one-way hash of the full account number, used only to recognise transfers between your own accounts.",
            "Bank transactions (only with a bank connection): for each imported transaction its amount, currency, direction (in or out), booking date and status, the counterparty name, the payment description, the merchant category code and the full transaction record as the bank sent it.",
            "Bank notifications (Android only, only if you choose \"Bank notifications\" as the transaction source): the title, text and time of notifications posted by the Swedbank app on your phone. Notifications from any other app are ignored on the device and never stored or sent.",
            "Suggestions: the category and vendor suggested for each transaction, whether you accepted, dismissed or linked it, and per-merchant rules that remember your choices.",
          ],
        },
        {
          p: "We do not collect your location, contacts, photos, device identifiers for advertising, or your bank password: you always sign in to your bank on the bank's own page, and Finansai never sees those credentials.",
        },
      ],
    },
    {
      heading: "3. Why we use it and on what legal basis",
      blocks: [
        {
          bullets: [
            "To provide the app you signed up for: storing your budget and showing it on your devices (performance of a contract, GDPR Art. 6(1)(b)).",
            "To import bank transactions and read bank notifications, and to suggest expenses from them: only after you connect a bank or turn on notification reading (your consent, Art. 6(1)(a)). You can withdraw consent at any time by disconnecting the bank or switching the source back, without affecting earlier processing.",
            "To keep the service secure and working, for example error logs (legitimate interests, Art. 6(1)(f)).",
          ],
        },
      ],
    },
    {
      heading: "4. Automated suggestions (AI)",
      blocks: [
        {
          p: "Finansai uses OpenAI's API to suggest a category and vendor for imported transactions and to read bank notifications (to work out the amount, merchant and date). For this we send OpenAI your category names and, per transaction, the counterparty name, a shortened payment description, the merchant category code and the amount; for notifications, their title, text and time. We never send account numbers, account names, your name, email or any user identifier.",
        },
        {
          p: "Suggestions are only proposals: nothing is added to your budget until you accept it, and you can change every field first. Your own choices are remembered and always take priority over the AI. OpenAI processes this data on our behalf and, under its API terms, does not use it to train its models; it may keep API inputs for up to 30 days for abuse monitoring.",
        },
      ],
    },
    {
      heading: "5. Who processes data for us",
      blocks: [
        {
          bullets: [
            "Supabase: database and sign-in, hosted in the EU (Frankfurt, Germany).",
            "Amazon Web Services: the app's servers, the website and the queue for AI jobs, in the EU (Frankfurt, Germany).",
            "Enable Banking Oy (Finland): a licensed account information service provider that connects to your bank with your consent and passes your accounts and transactions to Finansai. Its own terms and privacy notice apply to the bank sign-in step.",
            "OpenAI (United States): AI suggestions as described above. Transfers to the US rely on the European Commission's Standard Contractual Clauses.",
            "Expo (United States): delivers app updates to installed apps; it does not receive your budget or bank data.",
          ],
        },
        {
          p: "We do not sell your data or share it with anyone else, except where the law requires it.",
        },
      ],
    },
    {
      heading: "6. How long we keep it",
      blocks: [
        {
          bullets: [
            "Your budget, bank transactions, suggestions and rules: for as long as you have an account.",
            "A bank connection stops working when its consent expires (at most 180 days, depending on the bank) or when you disconnect it; the transactions already imported stay in your account until you delete them or the account.",
            "Notifications waiting on your phone are deleted from it as soon as they are uploaded.",
            "When you delete your account, its data is erased; copies in our database provider's backups expire within their retention period.",
          ],
        },
      ],
    },
    {
      heading: "7. Your rights",
      blocks: [
        {
          p: `You can ask for access to your data, a copy in a portable format, correction, erasure, restriction, or object to processing based on legitimate interests, and you can withdraw consent at any time. You can delete your account and all its data yourself in Settings → Account → Delete account (or at finances.valiunas.dev/delete-account). For anything else write to ${LEGAL_CONTACT}; we reply within one month. You can also complain to the Lithuanian State Data Protection Inspectorate (vdai.lrv.lt) or the authority where you live.`,
        },
      ],
    },
    {
      heading: "8. Security",
      blocks: [
        {
          p: "Data is encrypted in transit (HTTPS) and at rest with our providers. Access to your data in the database is limited to your own account. On your phone your session is kept in the app's private storage.",
        },
      ],
    },
    {
      heading: "9. Children",
      blocks: [{ p: "Finansai is not intended for anyone under 16." }],
    },
    {
      heading: "10. Changes",
      blocks: [
        {
          p: "When this policy changes in substance we update the date at the top and, for significant changes, tell you in the app.",
        },
      ],
    },
  ],
};

const LT: LegalDoc = {
  title: "Privatumo politika",
  intro:
    "Finansai – asmeninio biudžeto programėlė: joje fiksuojate mėnesio atlyginimą, išlaidas ir pajamas, o jei norite – leidžiate jai siūlyti išlaidas pagal jūsų banko operacijas. Ši politika paaiškina, kokius asmens duomenis Finansai tvarko, kodėl, kas padeda juos tvarkyti ir kokias teises turite. Jokios reklamos, sekimo ar analitikos.",
  sections: [
    {
      heading: "1. Kas atsakingas",
      blocks: [
        {
          p: `Finansai kuria ir valdo Tomas Valiūnas, Lietuvoje veikiantis individualus kūrėjas, kuris yra čia aprašytų asmens duomenų valdytojas („mes“). Visais su šia politika ar jūsų duomenimis susijusiais klausimais rašykite ${LEGAL_CONTACT}.`,
        },
      ],
    },
    {
      heading: "2. Ką renkame",
      blocks: [
        {
          bullets: [
            "Paskyra: el. pašto adresas ir slaptažodis prisijungimui. Slaptažodį tvarko autentifikacijos paslaugų teikėjas (Supabase Auth), jis saugomas tik kaip negrįžtama maiša (hash).",
            "Profilis ir nustatymai: rodomas vardas, pageidaujama kalba ir valiuta. Tema ir akcento spalva lieka jūsų įrenginyje.",
            "Jūsų biudžetas: sukurti mėnesiai su atlyginimu ir pastabomis, išlaidos (pavadinimas, suma, kategorija, vieta, data, komentaras, apmokėta ar ne), pajamos, kategorijos, pardavėjai ir pasikartojančių išlaidų šablonai.",
            "Banko ryšys (neprivaloma, tik prijungus banką): kurį banką prijungėte, sutikimo galiojimo data, sąskaitų pavadinimai, sąskaitos valiuta, užmaskuotas sąskaitos numeris (saugomi tik paskutiniai keturi skaitmenys) ir negrįžtama viso numerio maiša, naudojama tik pervedimams tarp jūsų pačių sąskaitų atpažinti.",
            "Banko operacijos (tik prijungus banką): kiekvienos importuotos operacijos suma, valiuta, kryptis (pajamos ar išlaidos), įskaitymo data ir būsena, kitos šalies pavadinimas, mokėjimo paskirtis, prekybininko kategorijos kodas ir visas operacijos įrašas, kokį atsiuntė bankas.",
            "Banko pranešimai (tik Android, tik jei operacijų šaltiniu pasirinkote „Banko pranešimai“): Swedbank programėlės jūsų telefone paskelbtų pranešimų pavadinimas, tekstas ir laikas. Kitų programėlių pranešimai įrenginyje ignoruojami – niekada nesaugomi ir nesiunčiami.",
            "Pasiūlymai: kiekvienai operacijai pasiūlyta kategorija ir pardavėjas, ar pasiūlymą priėmėte, atmetėte ar susiejote, bei taisyklės, įsimenančios jūsų pasirinkimus kiekvienam pardavėjui.",
          ],
        },
        {
          p: "Nerenkame jūsų buvimo vietos, kontaktų, nuotraukų, reklaminių įrenginio identifikatorių ar banko slaptažodžio: į banką visada jungiatės paties banko puslapyje, o Finansai tų prisijungimo duomenų nemato.",
        },
      ],
    },
    {
      heading: "3. Kam naudojame ir kokiu teisiniu pagrindu",
      blocks: [
        {
          bullets: [
            "Kad teiktume programėlę, kuria užsiregistravote: saugotume jūsų biudžetą ir rodytume jį jūsų įrenginiuose (sutarties vykdymas, BDAR 6 str. 1 d. b p.).",
            "Kad importuotume banko operacijas, skaitytume banko pranešimus ir pagal juos siūlytume išlaidas – tik jums prijungus banką ar įjungus pranešimų skaitymą (jūsų sutikimas, 6 str. 1 d. a p.). Sutikimą galite bet kada atšaukti atjungdami banką ar grąžindami kitą šaltinį; tai neturi įtakos ankstesniam tvarkymui.",
            "Kad paslauga būtų saugi ir veiktų, pvz., klaidų žurnalai (teisėtas interesas, 6 str. 1 d. f p.).",
          ],
        },
      ],
    },
    {
      heading: "4. Automatiniai pasiūlymai (DI)",
      blocks: [
        {
          p: "Finansai naudoja OpenAI API, kad pasiūlytų kategoriją ir pardavėją importuotoms operacijoms ir perskaitytų banko pranešimus (nustatytų sumą, pardavėją ir datą). Tam OpenAI siunčiame jūsų kategorijų pavadinimus ir kiekvienos operacijos kitos šalies pavadinimą, sutrumpintą mokėjimo paskirtį, prekybininko kategorijos kodą ir sumą; pranešimų atveju – jų pavadinimą, tekstą ir laiką. Niekada nesiunčiame sąskaitų numerių, sąskaitų pavadinimų, jūsų vardo, el. pašto ar jokio naudotojo identifikatoriaus.",
        },
        {
          p: "Pasiūlymai yra tik pasiūlymai: niekas nepatenka į jūsų biudžetą, kol jo nepriimate, ir prieš tai galite pakeisti kiekvieną lauką. Jūsų pasirinkimai įsimenami ir visada turi pirmenybę prieš DI. OpenAI šiuos duomenis tvarko mūsų vardu ir pagal savo API sąlygas nenaudoja jų modeliams mokyti; API užklausas piktnaudžiavimo stebėsenai gali saugoti iki 30 dienų.",
        },
      ],
    },
    {
      heading: "5. Kas tvarko duomenis mūsų vardu",
      blocks: [
        {
          bullets: [
            "Supabase: duomenų bazė ir prisijungimas, ES (Frankfurtas, Vokietija).",
            "Amazon Web Services: programėlės serveriai, svetainė ir DI užduočių eilė, ES (Frankfurtas, Vokietija).",
            "Enable Banking Oy (Suomija): licencijuotas sąskaitos informacijos paslaugų teikėjas, kuris su jūsų sutikimu jungiasi prie jūsų banko ir perduoda sąskaitas bei operacijas Finansai. Prisijungimo prie banko žingsniui taikomos jo sąlygos ir privatumo pranešimas.",
            "OpenAI (JAV): DI pasiūlymai, kaip aprašyta aukščiau. Duomenų perdavimas į JAV grindžiamas Europos Komisijos standartinėmis sutarčių sąlygomis.",
            "Expo (JAV): pristato programėlės atnaujinimus į įdiegtas programėles; jūsų biudžeto ar banko duomenų negauna.",
          ],
        },
        {
          p: "Jūsų duomenų neparduodame ir niekam kitam neteikiame, išskyrus atvejus, kai to reikalauja įstatymai.",
        },
      ],
    },
    {
      heading: "6. Kiek laiko saugome",
      blocks: [
        {
          bullets: [
            "Biudžetą, banko operacijas, pasiūlymus ir taisykles – tol, kol turite paskyrą.",
            "Banko ryšys nustoja veikti pasibaigus sutikimui (daugiausia 180 dienų, priklauso nuo banko) arba jį atjungus; jau importuotos operacijos lieka jūsų paskyroje, kol jų ar paskyros neištrinate.",
            "Telefone laukiantys pranešimai iš jo ištrinami iškart juos įkėlus.",
            "Ištrynus paskyrą, jos duomenys ištrinami; kopijos duomenų bazės teikėjo atsarginėse kopijose pasibaigia per jų saugojimo laikotarpį.",
          ],
        },
      ],
    },
    {
      heading: "7. Jūsų teisės",
      blocks: [
        {
          p: `Galite prašyti susipažinti su savo duomenimis, gauti jų kopiją perkeliamu formatu, juos ištaisyti, ištrinti, apriboti tvarkymą ar nesutikti su tvarkymu teisėto intereso pagrindu, taip pat bet kada atšaukti sutikimą. Paskyrą ir visus jos duomenis galite ištrinti patys: Nustatymai → Paskyra → Ištrinti paskyrą (arba finances.valiunas.dev/delete-account). Kitais klausimais rašykite ${LEGAL_CONTACT}; atsakome per vieną mėnesį. Taip pat galite pateikti skundą Valstybinei duomenų apsaugos inspekcijai (vdai.lrv.lt) arba savo gyvenamosios vietos priežiūros institucijai.`,
        },
      ],
    },
    {
      heading: "8. Saugumas",
      blocks: [
        {
          p: "Duomenys šifruojami perduodant (HTTPS) ir saugant pas mūsų paslaugų teikėjus. Prieiga prie jūsų duomenų duomenų bazėje apribota tik jūsų paskyra. Telefone jūsų sesija laikoma privačioje programėlės saugykloje.",
        },
      ],
    },
    {
      heading: "9. Vaikai",
      blocks: [{ p: "Finansai neskirta jaunesniems nei 16 metų asmenims." }],
    },
    {
      heading: "10. Pakeitimai",
      blocks: [
        {
          p: "Iš esmės pakeitę šią politiką atnaujiname datą viršuje, o apie reikšmingus pakeitimus pranešame programėlėje.",
        },
      ],
    },
  ],
};

export function PrivacyScreen() {
  return <LegalLayout doc={usePickLanguage(EN, LT)} current="privacy" />;
}
