// CertificateTemplate.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
import { normalizeClass } from '@/lib/schoolClassNormalize';
import { EFEKTY_KSZTALCENIA } from '@/lib/efektyKsztalcenia';

// Zabezpieczenie przed środowiskiem przeglądarki (w razie kompilacji po stronie klienta)
const isServer = typeof window === 'undefined';

if (isServer) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  
  Font.register({
    family: 'Merriweather',
    fonts: [
      { src: path.join(fontsDir, 'Merriweather-Regular.woff') },
      { src: path.join(fontsDir, 'Merriweather-Bold.woff'), fontWeight: 'bold' },
      { src: path.join(fontsDir, 'Merriweather-Italic.woff'), fontStyle: 'italic' }
    ]
  });

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(fontsDir, 'Roboto-Regular.woff') },
      { src: path.join(fontsDir, 'Roboto-Bold.woff'), fontWeight: 'bold' }
    ]
  });
} else {
  Font.register({
    family: 'Merriweather',
    fonts: [
      { src: '/fonts/Merriweather-Regular.woff' },
      { src: '/fonts/Merriweather-Bold.woff', fontWeight: 'bold' },
      { src: '/fonts/Merriweather-Italic.woff', fontStyle: 'italic' }
    ]
  });

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: '/fonts/Roboto-Regular.woff' },
      { src: '/fonts/Roboto-Bold.woff', fontWeight: 'bold' }
    ]
  });
}

// Wczytujemy obrazy jako bufory ({data, format}) zamiast surowej ścieżki po stronie serwera —
// @react-pdf/renderer po ścieżce plikowej próbuje ją zresolvować jak URL, co potrafi się wysypać
// na ścieżkach z odstępami/znakami diakrytycznymi (np. katalogi OneDrive). Bufor omija ten problem.
function readServerImage(filename: string): { data: Buffer; format: 'png' } | string {
  if (!isServer) return `/${filename}`;
  const filePath = path.join(process.cwd(), 'public', filename);
  return { data: fs.readFileSync(filePath), format: 'png' };
}

// Domyslne obrazy zbundlowane w public/ - wczytywane leniwie (dopiero gdy faktycznie
// potrzebne), zeby brak lokalnego pliku nie wywalal renderu w przypadkach, gdy wywolujacy
// i tak dostarcza wlasny bannerImage/signatureImage (np. pobrany z Supabase Storage).
function defaultBannerSrc() {
  return readServerImage('footer-eu-banner.png');
}
function defaultSignatureSrc() {
  return readServerImage('signature-kania.png');
}

// Definicje stylów dla @react-pdf
const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: '#fcfcf9', // Ciepły odcień papieru czerpanego
    fontFamily: 'Merriweather',
    height: '100%',
    width: '100%',
  },
  outerBorder: {
    margin: 30,
    padding: 4,
    borderWidth: 2,
    borderColor: '#c5a059', // Cienki złoty pasek zewnętrzny
    height: '90%',
  },
  innerBorder: {
    borderWidth: 6,
    borderColor: '#c5a059', // Gruby złoty pasek wewnętrzny
    padding: 30,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#1a2a3a',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    color: '#555555',
    fontStyle: 'italic',
    marginTop: 8,
  },
  studentNameSection: {
    alignItems: 'center',
    marginVertical: 15,
    width: '70%',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 5,
  },
  studentName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#c5a059',
    fontFamily: 'Roboto',
  },
  infoSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#444444',
    fontStyle: 'italic',
    marginBottom: 5,
    textAlign: 'center',
  },
  surveyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2a3a',
    textAlign: 'center',
  },
  // --- PORÓWNANIE WYNIKÓW ---
  comparisonContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginVertical: 15,
  },
  scoreCard: {
    backgroundColor: '#f7f5f0',
    borderWidth: 1,
    borderColor: '#e2dccf',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 120,
  },
  scoreCardGrowth: {
    backgroundColor: '#edf7ed',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 120,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#777777',
    textTransform: 'uppercase',
    marginBottom: 3,
    letterSpacing: 0.5,
    fontFamily: 'Roboto',
  },
  scoreLabelGrowth: {
    fontSize: 9,
    color: '#2e7d32',
    textTransform: 'uppercase',
    marginBottom: 3,
    letterSpacing: 0.5,
    fontFamily: 'Roboto',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2a3a',
    fontFamily: 'Roboto',
  },
  scoreValueGrowth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    fontFamily: 'Roboto',
  },
  metaInfo: {
    fontSize: 13,
    color: '#777777',
    marginTop: 6,
  },
  dateSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 14,
    color: '#555555',
    fontStyle: 'italic',
  },
  dateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2a3a',
    marginTop: 2,
  },
  signatureSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  signatureImage: {
    width: 140,
    height: 21.3,
    marginBottom: 2,
  },
  signatureLine: {
    width: 160,
    borderTopWidth: 1,
    borderTopColor: '#999999',
    marginTop: 2,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2a3a',
    marginTop: 4,
  },
  signatureTitle: {
    fontSize: 10,
    color: '#777777',
    fontStyle: 'italic',
  },
  footerBannerSection: {
    alignItems: 'center',
  },
  footerBanner: {
    width: 340,
    height: 32.5,
  },
  // --- STRONA 2: EFEKTY KSZTAŁCENIA ---
  page2: {
    padding: 0,
    backgroundColor: '#fcfcf9',
    fontFamily: 'Merriweather',
  },
  page2OuterBorder: {
    margin: 30,
    padding: 4,
    borderWidth: 2,
    borderColor: '#c5a059',
    height: '90%',
  },
  page2InnerBorder: {
    borderWidth: 6,
    borderColor: '#c5a059',
    padding: 28,
    height: '100%',
  },
  page2Title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2a3a',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  page2Subtitle: {
    fontSize: 11,
    color: '#555555',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  effectBlock: {
    marginBottom: 8,
  },
  effectHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a2a3a',
    marginBottom: 3,
    fontFamily: 'Roboto',
  },
  effectPoint: {
    fontSize: 9.5,
    color: '#333333',
    marginBottom: 2,
    paddingLeft: 10,
  },
  effectCriterion: {
    fontSize: 9,
    color: '#777777',
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 10,
  },
  page2Validation: {
    fontSize: 9,
    color: '#555555',
    marginTop: 8,
    marginBottom: 4,
  },
  page2Hours: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a2a3a',
    marginTop: 10,
    textAlign: 'center',
  },
});

interface CertificateData {
  studentName: string;
  surveyTitle: string;
  version: string;
  taskId: number;
  dateStr: string;
  wynikP: string;
  wynikE: string;
  przyrost: string;
  studentClass?: string;
  bannerImage?: { data: Buffer; format: 'png' } | string;
  signatureImage?: { data: Buffer; format: 'png' } | string;
}

export const CertificateTemplate = ({
  studentName,
  surveyTitle,
  version,
  taskId,
  dateStr,
  wynikP,
  wynikE,
  przyrost,
  studentClass,
  bannerImage,
  signatureImage,
}: CertificateData) => {
  // Pole `class` u ucznia bywa puste (błąd wpisu przy imporcie/ankiecie) - w takim przypadku
  // sięgamy po klasę zakodowaną w tytule ankiety ("Ankieta Ewaluacyjna - Klasa 5"), która jest
  // ustalona dla każdej ankiety i dużo pewniejsza niż ręcznie wpisywane dane ucznia.
  const classGrade = normalizeClass(studentClass).grade;
  const titleGradeMatch = surveyTitle.match(/klasa\s+(\d+)/i);
  const efektyGrade = EFEKTY_KSZTALCENIA[classGrade] ? classGrade : (titleGradeMatch?.[1] ?? classGrade);
  const efekty = EFEKTY_KSZTALCENIA[efektyGrade];
  const footerBannerSrc = bannerImage ?? defaultBannerSrc();
  const signatureImageSrc = signatureImage ?? defaultSignatureSrc();

  return (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.outerBorder}>
        <View style={styles.innerBorder}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Certyfikat Ukończenia</Text>
            <Text style={styles.subtitle}>Niniejszym zaświadcza się, że</Text>
          </View>

          {/* Student Name */}
          <View style={styles.studentNameSection}>
            <Text style={styles.studentName}>{studentName}</Text>
          </View>

          {/* Survey Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>wypełnił(a) ankietę:</Text>
            <Text style={styles.surveyTitle}>
              {surveyTitle} ({version === 'P' ? 'Początkowa' : 'Ewaluacyjna'})
            </Text>

            {/* Wyświetlanie wyników tylko gdy są punktowane */}
            {(wynikP !== '---' || wynikE !== '---') && (
              <View style={styles.comparisonContainer}>
                {version === 'E' && (
                  <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>Przed Szkoleniem</Text>
                    <Text style={styles.scoreValue}>{wynikP}</Text>
                  </View>
                )}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreLabel}>
                    {version === 'E' ? 'Po Szkoleniu' : 'Wynik Ankiety'}
                  </Text>
                  <Text style={styles.scoreValue}>{wynikE !== '---' ? wynikE : wynikP}</Text>
                </View>
                {version === 'E' && przyrost !== '---' && (
                  <View style={styles.scoreCardGrowth}>
                    <Text style={styles.scoreLabelGrowth}>Przyrost Wiedzy</Text>
                    <Text style={styles.scoreValueGrowth}>{przyrost}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.metaInfo}>w ramach zadania: Zadanie {taskId}</Text>
          </View>

          {/* Date */}
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Data wystawienia:</Text>
            <Text style={styles.dateValue}>{dateStr}</Text>
          </View>

          {/* Podpis */}
          <View style={styles.signatureSection}>
            <Image src={signatureImageSrc} style={styles.signatureImage} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Sebastian Kania</Text>
            <Text style={styles.signatureTitle}>Supervisor</Text>
          </View>

          {/* Belka dofinansowania UE */}
          <View style={styles.footerBannerSection}>
            <Image src={footerBannerSrc} style={styles.footerBanner} />
          </View>
        </View>
      </View>
    </Page>

    {/* Strona 2: Efekty kształcenia dla klasy ucznia (2/5/7) */}
    {efekty && (
      <Page size="A4" orientation="landscape" style={styles.page2}>
        <View style={styles.page2OuterBorder}>
          <View style={styles.page2InnerBorder}>
            <Text style={styles.page2Title}>Efekty kształcenia</Text>
            <Text style={styles.page2Subtitle}>
              Klasa {efekty.klasa} - w trakcie zajęć uczeń nabył następujące kompetencje:
            </Text>

            {efekty.efekty.map((e) => (
              <View key={e.numer} style={styles.effectBlock}>
                <Text style={styles.effectHeading}>
                  Efekt nr {e.numer}: {e.kompetencja}
                </Text>
                {e.punkty.map((p, i) => (
                  <Text key={i} style={styles.effectPoint}>- {p}</Text>
                ))}
                <Text style={styles.effectCriterion}>
                  Kryterium weryfikacji efektu nr {e.numer}: {e.kryterium}
                </Text>
              </View>
            ))}

            {efekty.walidacja && efekty.walidacja.map((line, i) => (
              <Text key={i} style={styles.page2Validation}>{line}</Text>
            ))}

            <Text style={styles.page2Hours}>{efekty.wymiarZajec}</Text>
          </View>
        </View>
      </Page>
    )}
  </Document>
  );
};
