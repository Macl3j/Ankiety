import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

// Zabezpieczenie przed środowiskiem przeglądarki (w razie kompilacji po stronie klienta)
const isServer = typeof window === 'undefined';

if (isServer) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');

  // Rejestracja czcionek z public/fonts (używamy woff, które zostały pobrane)
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(fontsDir, 'Roboto-Regular.woff') },
      { src: path.join(fontsDir, 'Roboto-Bold.woff'), fontWeight: 'bold' }
    ]
  });
} else {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: '/fonts/Roboto-Regular.woff' },
      { src: '/fonts/Roboto-Bold.woff', fontWeight: 'bold' }
    ]
  });
}

// Belka z logotypami dofinansowania UE - wymagana na kazdym generowanym dokumencie
const footerBannerSrc = isServer
  ? path.join(process.cwd(), 'public', 'footer-eu-banner.png')
  : '/footer-eu-banner.png';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 70,
    fontFamily: 'Roboto',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    flex: 1,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cccccc',
    marginTop: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    minHeight: 30,
  },
  tableColNr: {
    width: '8%',
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableColQuestion: {
    width: '46%',
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
    padding: 5,
    justifyContent: 'center',
  },
  tableColAnswer: {
    width: '46%',
    padding: 5,
    justifyContent: 'center',
  },
  tableCellHeader: {
    fontWeight: 'bold',
    fontSize: 10,
    fontFamily: 'Roboto',
  },
  tableCell: {
    fontSize: 10,
    fontFamily: 'Roboto',
  },
  tableCellBold: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  footerBanner: {
    position: 'absolute',
    bottom: 15,
    left: 40,
    width: 260,
    height: 25,
  },
});

interface AnswerItem {
  nr: number;
  question: string;
  answer: string | string[];
}

interface SurveyArchiveTemplateProps {
  studentName: string;
  studentCode: string;
  school: string;
  studentClass: string;
  dateStr: string;
  consent: boolean;
  surveyTitle: string;
  taskId: number;
  version: string;
  answersList: AnswerItem[];
}

export const SurveyArchiveTemplate: React.FC<SurveyArchiveTemplateProps> = ({
  studentName,
  studentCode,
  school,
  studentClass,
  dateStr,
  consent,
  surveyTitle,
  taskId,
  version,
  answersList
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Karta Odpowiedzi Ankiety</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>1. Dane Uczestnika</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Imię i Nazwisko:</Text>
          <Text style={styles.value}>{studentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Kod Ucznia:</Text>
          <Text style={styles.value}>{studentCode}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Szkoła:</Text>
          <Text style={styles.value}>{school}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Klasa:</Text>
          <Text style={styles.value}>{studentClass}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data:</Text>
          <Text style={styles.value}>{dateStr}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Zgoda RODO:</Text>
          <Text style={styles.value}>{consent ? 'TAK' : 'NIE'}</Text>
        </View>

        <Text style={styles.sectionTitle}>2. Szczegóły Ankiety</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Tytuł:</Text>
          <Text style={styles.value}>{surveyTitle}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Zadanie:</Text>
          <Text style={styles.value}>{taskId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Wersja:</Text>
          <Text style={styles.value}>{version === 'P' ? 'Początkowa' : 'Ewaluacyjna'}</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Odpowiedzi</Text>
        
        <View style={styles.table}>
          {/* Nagłówek Tabeli */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableColNr}>
              <Text style={styles.tableCellHeader}>Nr</Text>
            </View>
            <View style={styles.tableColQuestion}>
              <Text style={styles.tableCellHeader}>Pytanie</Text>
            </View>
            <View style={styles.tableColAnswer}>
              <Text style={styles.tableCellHeader}>Odpowiedź Ucznia</Text>
            </View>
          </View>

          {/* Wiersze z odpowiedziami */}
          {answersList.map((item, i) => {
            const answerText = Array.isArray(item.answer) 
              ? item.answer.join(', ') 
              : item.answer || '---';

            // Ostatni element nie ma dolnego marginesu, zeby tabela byla zamknieta
            const isLast = i === answersList.length - 1;

            return (
              <View key={i} style={[styles.tableRow, isLast ? { borderBottomWidth: 0 } : {}]} wrap={false}>
                <View style={styles.tableColNr}>
                  <Text style={styles.tableCell}>{item.nr}</Text>
                </View>
                <View style={styles.tableColQuestion}>
                  <Text style={styles.tableCell}>{item.question}</Text>
                </View>
                <View style={styles.tableColAnswer}>
                  <Text style={styles.tableCellBold}>{answerText}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Image src={footerBannerSrc} style={styles.footerBanner} fixed />
      </Page>
    </Document>
  );
};
