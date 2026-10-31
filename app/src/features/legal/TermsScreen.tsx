import { LEGAL_CONTACT } from "./constants";
import { LegalLayout, usePickLanguage, type LegalDoc } from "./LegalLayout";

/** Terms of use. Keep in step with the privacy policy and bump LEGAL_LAST_UPDATED on substantive changes. */
const EN: LegalDoc = {
  title: "Terms of use",
  intro:
    "These terms apply to your use of Finansai, on the web at finances.valiunas.dev and in the iOS and Android apps. By creating an account you agree to them. Please also read the privacy policy, which explains how your data is handled.",
  sections: [
    {
      heading: "1. The service",
      blocks: [
        {
          p: "Finansai is a personal budgeting tool provided by Tomas Valiūnas, an individual developer based in Lithuania. It helps you record and review your own salary, expenses and incomes. It is free and offered as is; features may change or be withdrawn.",
        },
      ],
    },
    {
      heading: "2. Your account",
      blocks: [
        {
          bullets: [
            "You need to be at least 16 and to give a valid email address.",
            "Keep your password secret; you are responsible for activity on your account.",
            "Use Finansai only for your own finances and only lawfully. Don't try to access other people's data or disrupt the service.",
          ],
        },
      ],
    },
    {
      heading: "3. Bank connections",
      blocks: [
        {
          bullets: [
            "Connecting a bank is optional. It works through Enable Banking Oy, a licensed account information service provider; you sign in on your bank's own page and approve read-only access there. Finansai can never move money or make payments.",
            "Access lasts until the consent expires (at most 180 days, depending on the bank) or until you disconnect it in Settings → Bank connections, whichever comes first.",
            "Bank data is shown as your bank provides it. Delays, missing transactions or temporary outages on the bank's or Enable Banking's side are outside our control.",
          ],
        },
      ],
    },
    {
      heading: "4. Bank notifications (Android)",
      blocks: [
        {
          p: "If you choose bank notifications as the transaction source, Finansai reads notifications posted by the Swedbank app on your phone and turns them into suggestions. You grant this access in Android's settings and can revoke it there or in Finansai at any time. Notification wording may change without notice, so some notifications may be missed or read incorrectly.",
        },
      ],
    },
    {
      heading: "5. Suggestions are not advice",
      blocks: [
        {
          p: "Categories, vendors, amounts and dates suggested by Finansai, including those produced by AI, are automated proposals and can be wrong. Nothing is recorded until you accept it, and you remain responsible for checking your figures. Finansai does not provide financial, investment, tax or legal advice.",
        },
      ],
    },
    {
      heading: "6. Your content",
      blocks: [
        {
          p: "The data you enter or import stays yours. You give us only the permission needed to store it and process it to run the app, as described in the privacy policy.",
        },
      ],
    },
    {
      heading: "7. Availability and liability",
      blocks: [
        {
          p: "We aim to keep Finansai available and your data safe, but we cannot guarantee uninterrupted or error-free operation. To the extent the law allows, Finansai is provided without warranties and we are not liable for indirect losses or for decisions you make based on the app. Nothing in these terms limits liability that cannot be limited by law, or your rights as a consumer.",
        },
      ],
    },
    {
      heading: "8. Ending your use",
      blocks: [
        {
          p: `You can stop using Finansai at any time and delete your account and data in Settings → Account → Delete account, or by writing to ${LEGAL_CONTACT}. We may suspend an account that breaks these terms or puts the service at risk, after telling you where possible.`,
        },
      ],
    },
    {
      heading: "9. Changes and governing law",
      blocks: [
        {
          p: "We may update these terms; the date at the top shows the current version, and significant changes are announced in the app. These terms are governed by the law of the Republic of Lithuania, without depriving you of the protection of the mandatory consumer law of your country of residence.",
        },
      ],
    },
  ],
};

const LT: LegalDoc = {
  title: "Naudojimo sąlygos",
  intro:
    "Šios sąlygos taikomos naudojantis Finansai – svetainėje finances.valiunas.dev ir iOS bei Android programėlėse. Susikurdami paskyrą su jomis sutinkate. Taip pat perskaitykite privatumo politiką, kurioje paaiškinta, kaip tvarkomi jūsų duomenys.",
  sections: [
    {
      heading: "1. Paslauga",
      blocks: [
        {
          p: "Finansai – asmeninio biudžeto įrankis, kurį teikia Tomas Valiūnas, Lietuvoje veikiantis individualus kūrėjas. Jis padeda fiksuoti ir peržiūrėti jūsų pačių atlyginimą, išlaidas ir pajamas. Paslauga nemokama ir teikiama tokia, kokia yra; funkcijos gali keistis ar būti panaikintos.",
        },
      ],
    },
    {
      heading: "2. Jūsų paskyra",
      blocks: [
        {
          bullets: [
            "Turite būti ne jaunesni nei 16 metų ir nurodyti galiojantį el. pašto adresą.",
            "Slaptažodį laikykite paslaptyje; už veiksmus jūsų paskyroje atsakote jūs.",
            "Naudokite Finansai tik savo finansams ir tik teisėtai. Nebandykite pasiekti kitų žmonių duomenų ar trikdyti paslaugos.",
          ],
        },
      ],
    },
    {
      heading: "3. Banko ryšiai",
      blocks: [
        {
          bullets: [
            "Banko prijungimas neprivalomas. Jis veikia per Enable Banking Oy – licencijuotą sąskaitos informacijos paslaugų teikėją; jungiatės paties banko puslapyje ir ten patvirtinate prieigą tik skaitymui. Finansai niekada negali pervesti pinigų ar atlikti mokėjimų.",
            "Prieiga galioja, kol baigiasi sutikimas (daugiausia 180 dienų, priklauso nuo banko) arba kol jį atjungiate skiltyje Nustatymai → Banko ryšiai – kas įvyks anksčiau.",
            "Banko duomenys rodomi tokie, kokius pateikia jūsų bankas. Vėlavimai, trūkstamos operacijos ar laikini sutrikimai banko ar Enable Banking pusėje nuo mūsų nepriklauso.",
          ],
        },
      ],
    },
    {
      heading: "4. Banko pranešimai (Android)",
      blocks: [
        {
          p: "Jei operacijų šaltiniu pasirenkate banko pranešimus, Finansai skaito Swedbank programėlės jūsų telefone skelbiamus pranešimus ir paverčia juos pasiūlymais. Šią prieigą suteikiate Android nustatymuose ir galite bet kada ją atšaukti ten arba Finansai. Pranešimų formuluotės gali pasikeisti be įspėjimo, todėl kai kurie pranešimai gali būti praleisti ar perskaityti netiksliai.",
        },
      ],
    },
    {
      heading: "5. Pasiūlymai nėra patarimai",
      blocks: [
        {
          p: "Finansai siūlomos kategorijos, pardavėjai, sumos ir datos, įskaitant sugeneruotas DI, yra automatiniai pasiūlymai ir gali būti klaidingi. Niekas neužfiksuojama, kol nepriimate, o už savo skaičių patikrinimą atsakote jūs. Finansai neteikia finansinių, investavimo, mokesčių ar teisinių patarimų.",
        },
      ],
    },
    {
      heading: "6. Jūsų turinys",
      blocks: [
        {
          p: "Jūsų įvesti ar importuoti duomenys lieka jūsų. Suteikiate mums tik tokį leidimą, kokio reikia juos saugoti ir tvarkyti programėlės veikimui, kaip aprašyta privatumo politikoje.",
        },
      ],
    },
    {
      heading: "7. Prieinamumas ir atsakomybė",
      blocks: [
        {
          p: "Siekiame, kad Finansai veiktų, o jūsų duomenys būtų saugūs, tačiau negalime garantuoti nepertraukiamo ar klaidų neturinčio veikimo. Kiek leidžia įstatymai, Finansai teikiama be garantijų, ir mes neatsakome už netiesioginius nuostolius ar sprendimus, kuriuos priimate remdamiesi programėle. Šios sąlygos neriboja atsakomybės, kurios negalima riboti pagal įstatymus, ir jūsų, kaip vartotojo, teisių.",
        },
      ],
    },
    {
      heading: "8. Naudojimosi nutraukimas",
      blocks: [
        {
          p: `Galite bet kada nustoti naudotis Finansai ir ištrinti paskyrą bei duomenis skiltyje Nustatymai → Paskyra → Ištrinti paskyrą arba parašę ${LEGAL_CONTACT}. Pažeidus šias sąlygas ar keliant grėsmę paslaugai, paskyrą galime sustabdyti, kai įmanoma – apie tai pranešę.`,
        },
      ],
    },
    {
      heading: "9. Pakeitimai ir taikoma teisė",
      blocks: [
        {
          p: "Šias sąlygas galime atnaujinti; data viršuje rodo galiojančią versiją, o apie reikšmingus pakeitimus pranešame programėlėje. Sąlygoms taikoma Lietuvos Respublikos teisė, neatimant iš jūsų imperatyviųjų jūsų gyvenamosios šalies vartotojų teisių apsaugos normų.",
        },
      ],
    },
  ],
};

export function TermsScreen() {
  return <LegalLayout doc={usePickLanguage(EN, LT)} current="terms" />;
}
