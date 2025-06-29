import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
    backgroundColor: '#fff',
    color: '#222',
  },
  body: {
    marginBottom: 20,
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
});

export default function CoverLetterPdfDocument({ coverLetter }: { coverLetter: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.body}>
          <Text>{coverLetter}</Text>
        </View>
      </Page>
    </Document>
  );
}