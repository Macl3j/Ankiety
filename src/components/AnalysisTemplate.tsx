// AnalysisTemplate.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

// Zabezpieczenie przed środowiskiem przeglądarki (w razie kompilacji po stronie klienta)
const isServer = typeof window === 'undefined';

if (isServer) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');

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

const DELTA_COLORS: Record<string, string> = {
  green: '#2e7d32',
  red: '#c62828',
  gray: '#888888',
  none: '#000000',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 11,
    lineHeight: 1.4,
    color: '#000000',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
    fontSize: 10,
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    padding: 10,
    marginTop: 6,
  },
  summaryLine: {
    fontSize: 11,
    marginBottom: 3,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd',
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    minHeight: 26,
  },
  colQuestion: {
    width: '45%',
    borderRightWidth: 1,
    borderRightColor: '#dddddd',
    padding: 5,
    justifyContent: 'center',
  },
  colAnswer: {
    width: '20%',
    borderRightWidth: 1,
    borderRightColor: '#dddddd',
    padding: 5,
    justifyContent: 'center',
  },
  colDelta: {
    width: '15%',
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellHeader: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  cell: {
    fontSize: 8,
  },
  cellBold: {
    fontSize: 8,
    fontWeight: 'bold',
  },
});

export interface AnalysisComparisonRow {
  question: string;
  answerP: string;
  answerE: string;
  delta: string;
  deltaColor: 'green' | 'red' | 'gray' | 'none';
}

interface AnalysisTemplateProps {
  studentName: string;
  studentCode: string;
  taskId: number;
  className: string;
  dateStr: string;
  scoreP: number;
  maxScoreP: number;
  scoreE: number;
  maxScoreE: number;
  comparisonRows: AnalysisComparisonRow[];
}

export const AnalysisTemplate: React.FC<AnalysisTemplateProps> = ({
  studentName,
  studentCode,
  taskId,
  className,
  dateStr,
  scoreP,
  maxScoreP,
  scoreE,
  maxScoreE,
  comparisonRows,
}) => {
  const diff = scoreE - scoreP;
  const deltaText = diff > 0 ? `+${diff}` : `${diff}`;
  const deltaColor = diff > 0 ? DELTA_COLORS.green : diff < 0 ? DELTA_COLORS.red : '#000000';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Analiza Indywidualna Postępów</Text>

        <Text style={styles.sectionTitle}>Dane Uczestnika</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Imię i Nazwisko:</Text>
          <Text style={styles.value}>{studentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Kod ucznia:</Text>
          <Text style={styles.value}>{studentCode}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Zadanie:</Text>
          <Text style={styles.value}>Zadanie {taskId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Klasa:</Text>
          <Text style={styles.value}>{className}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data Analizy:</Text>
          <Text style={styles.value}>{dateStr}</Text>
        </View>

        <Text style={styles.sectionTitle}>Podsumowanie Punktacji</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLine}>Wynik Początkowy: {scoreP} / {maxScoreP} pkt</Text>
          <Text style={styles.summaryLine}>Wynik Końcowy: {scoreE} / {maxScoreE} pkt</Text>
          <Text style={[styles.summaryLine, { color: deltaColor, fontWeight: 'bold' }]}>
            Zanotowany Progres: {deltaText} pkt
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Porównanie Odpowiedzi</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.colQuestion}><Text style={styles.cellHeader}>Pytanie</Text></View>
            <View style={styles.colAnswer}><Text style={styles.cellHeader}>Początkowa</Text></View>
            <View style={styles.colAnswer}><Text style={styles.cellHeader}>Ewaluacyjna</Text></View>
            <View style={styles.colDelta}><Text style={styles.cellHeader}>Zmiana</Text></View>
          </View>

          {comparisonRows.map((row, i) => {
            const isLast = i === comparisonRows.length - 1;
            return (
              <View key={i} style={[styles.tableRow, isLast ? { borderBottomWidth: 0 } : {}]} wrap={false}>
                <View style={styles.colQuestion}>
                  <Text style={styles.cell}>{row.question}</Text>
                </View>
                <View style={styles.colAnswer}>
                  <Text style={styles.cell}>{row.answerP}</Text>
                </View>
                <View style={styles.colAnswer}>
                  <Text style={styles.cellBold}>{row.answerE}</Text>
                </View>
                <View style={styles.colDelta}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: DELTA_COLORS[row.deltaColor] }}>
                    {row.delta}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};
