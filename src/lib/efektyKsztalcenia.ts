// efektyKsztalcenia.ts
// Treść drugiej strony certyfikatu (efekty kształcenia wg klasy) — przekazana przez
// Stolicę Experymentu mailem "Certyfikaty" (Barbara Redzik, 24.07.2026), plik
// "ETAP II – KLASY 2.docx". Treść jest przepisana 1:1 ze źródła, bez zmian merytorycznych.

export interface EfektKsztalcenia {
  numer: number;
  kompetencja: string;
  punkty: string[];
  kryterium: string;
}

export interface EfektyKlasy {
  klasa: string; // etykieta do wyswietlenia, np. "2", "5", "7"
  efekty: EfektKsztalcenia[];
  walidacja?: string[]; // opcjonalne — brak w źródle dla klasy 7
  wymiarZajec: string;
}

export const EFEKTY_KSZTALCENIA: Record<string, EfektyKlasy> = {
  '2': {
    klasa: '2',
    efekty: [
      {
        numer: 1,
        kompetencja: 'Kompetencje matematyczne oraz kompetencje w zakresie nauk przyrodniczych, technologii i inżynierii:',
        punkty: [
          'uczeń rozróżnia podstawowe elementy zestawów konstrukcyjnych oraz urządzeń wykorzystywanych do budowy i programowania modeli oraz wskazuje elementy odpowiedzialne za ich ruch;',
          'uczeń potrafi zaplanować i ułożyć prostą sekwencję poleceń umożliwiającą wykonanie określonego zadania przez model lub robota.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
      {
        numer: 2,
        kompetencja: 'Kompetencje cyfrowe poprzez:',
        punkty: [
          'uczeń zna podstawowe zasady programowania blokowego oraz wykorzystuje proste instrukcje sterujące ruchem, światłem i dźwiękiem;',
          'uczeń uzasadnia konieczność sprawdzania i poprawiania programu w przypadku wystąpienia błędów oraz wybiera właściwy sposób ich eliminowania.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
      {
        numer: 3,
        kompetencja: 'Kompetencje w zakresie przedsiębiorczości poprzez:',
        punkty: [
          'uczeń wskazuje przykłady praktycznego zastosowania technologii cyfrowych, narzędzi konstrukcyjnych oraz długopisu 3D do wykonywania prostych modeli i dekoracji;',
          'uczeń zna i stosuje zasady planowania trasy oraz analizowania kolejnych kroków prowadzących do osiągnięcia celu podczas programowania i wykonywania zadań konstrukcyjnych.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
    ],
    walidacja: [
      'Walidacja została przeprowadzona w oparciu o zdefiniowane w efektach uczenia się kryteria ich weryfikacji.',
      'Zastosowano rozwiązania zapewniające rozdzielenie procesów kształcenia i szkolenia od walidacji.',
    ],
    wymiarZajec: 'Łączny wymiar zajęć: 9 godzin lekcyjnych (9 × 45 min)',
  },
  '5': {
    klasa: '5',
    efekty: [
      {
        numer: 1,
        kompetencja: 'Kompetencje matematyczne oraz kompetencje w zakresie nauk przyrodniczych, technologii i inżynierii poprzez:',
        punkty: [
          'uczeń rozróżnia elementy konstrukcyjne oraz urządzenia wykorzystywane do budowy i programowania modeli, wskazując ich funkcje i zastosowanie;',
          'uczeń potrafi zaplanować, zbudować i zmodyfikować model oraz opracować sekwencję poleceń umożliwiającą wykonanie określonego zadania z wykorzystaniem elementów wykonawczych i czujników.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
      {
        numer: 2,
        kompetencja: 'Kompetencje cyfrowe poprzez:',
        punkty: [
          'uczeń zna i wykorzystuje podstawowe zasady programowania blokowego oraz stosuje instrukcje sterujące ruchem, światłem, dźwiękiem i innymi funkcjami urządzeń programowalnych;',
          'uczeń analizuje działanie programu, testuje jego poprawność oraz dobiera właściwe rozwiązania w przypadku wystąpienia błędów.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
      {
        numer: 3,
        kompetencja: 'Kompetencje cyfrowe poprzez:',
        punkty: [
          'uczeń wskazuje praktyczne zastosowania technologii cyfrowych, narzędzi projektowych 3D oraz aplikacji multimedialnych do tworzenia własnych modeli, projektów i materiałów;',
          'uczeń potrafi zaplanować kolejne etapy realizacji projektu, organizować swoją pracę oraz wykorzystywać dostępne narzędzia do osiągnięcia założonego celu.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
    ],
    walidacja: [
      'Walidacja została przeprowadzona w oparciu o zdefiniowane w efektach uczenia się kryteria ich weryfikacji.',
      'Zastosowano rozwiązania zapewniające rozdzielenie procesów kształcenia i szkolenia od walidacji.',
    ],
    wymiarZajec: 'Łączny wymiar zajęć: 9 godzin lekcyjnych (9 × 45 min)',
  },
  '7': {
    klasa: '7',
    efekty: [
      {
        numer: 1,
        kompetencja: 'Kompetencje matematyczne oraz kompetencje w zakresie nauk przyrodniczych, technologii i inżynierii poprzez:',
        punkty: [
          'uczeń analizuje budowę oraz działanie elementów konstrukcyjnych, elektronicznych i programowalnych wykorzystywanych do tworzenia modeli technicznych;',
          'uczeń potrafi projektować, modyfikować i testować rozwiązania konstrukcyjne, dobierając odpowiednie elementy wykonawcze, czujniki oraz mechanizmy umożliwiające realizację określonego zadania.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
      {
        numer: 2,
        kompetencja: 'Kompetencje cyfrowe poprzez:',
        punkty: [
          'uczeń zna i stosuje zasady programowania blokowego oraz tworzy algorytmy sterujące działaniem urządzeń wykorzystujących czujniki, światło, dźwięk i ruch;',
          'uczeń analizuje działanie stworzonego programu, interpretuje wyniki jego działania oraz wprowadza modyfikacje w celu poprawy skuteczności rozwiązania.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
      {
        numer: 3,
        kompetencja: 'Kompetencje w zakresie przedsiębiorczości poprzez:',
        punkty: [
          'uczeń projektuje i realizuje własne rozwiązania wykorzystujące technologie cyfrowe, modelowanie 3D oraz narzędzia multimedialne;',
          'uczeń planuje i organizuje proces tworzenia projektu, przygotowuje scenariusz działania, dobiera odpowiednie narzędzia oraz prezentuje wykonane rozwiązanie.',
        ],
        kryterium: 'test kompetencji, pytania zamknięte.',
      },
    ],
    // Źródło nie zawiera akapitu o walidacji dla klasy 7 (w przeciwieństwie do klas 2 i 5).
    wymiarZajec: 'Łączny wymiar zajęć: 9 godzin lekcyjnych (9 × 45 min)',
  },
};
