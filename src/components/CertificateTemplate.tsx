// CertificateTemplate.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

// Zabezpieczenie przed środowiskiem przeglądarki (w razie kompilacji po stronie klienta)
const isServer = typeof window === 'undefined';

if (isServer) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  
  Font.register({
    family: 'Merriweather',
    fonts: [
      { src: path.join(fontsDir, 'Merriweather-Regular.ttf') },
      { src: path.join(fontsDir, 'Merriweather-Bold.ttf'), fontWeight: 'bold' },
      { src: path.join(fontsDir, 'Merriweather-Italic.ttf'), fontStyle: 'italic' }
    ]
  });

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(fontsDir, 'Roboto-Regular.ttf') },
      { src: path.join(fontsDir, 'Roboto-Bold.ttf'), fontWeight: 'bold' }
    ]
  });
} else {
  Font.register({
    family: 'Merriweather',
    fonts: [
      { src: '/fonts/Merriweather-Regular.ttf' },
      { src: '/fonts/Merriweather-Bold.ttf', fontWeight: 'bold' },
      { src: '/fonts/Merriweather-Italic.ttf', fontStyle: 'italic' }
    ]
  });

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: '/fonts/Roboto-Regular.ttf' },
      { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
    ]
  });
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
}: CertificateData) => (
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
        </View>
      </View>
    </Page>
  </Document>
);
