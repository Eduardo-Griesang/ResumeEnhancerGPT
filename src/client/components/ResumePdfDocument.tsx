import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subHeader: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 4, borderBottom: 1, borderColor: '#000' },
  text: { fontSize: 12, marginBottom: 4 },
  bullet: { marginLeft: 12, fontSize: 12 },
  role: { fontSize: 13, fontWeight: 'bold', marginBottom: 0 },
  company: { fontSize: 12, fontWeight: 'normal', fontStyle: 'italic', marginBottom: 0 },
  period: { fontSize: 12, fontWeight: 'normal', marginLeft: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  bold: { fontWeight: 'bold', fontSize: 12 },
});

type experienceModel = {
  role: string;
  company: string;
  period: string;
  description: string;
  bullets: string[];
}

const legalSize = { width: 612, height: 1008 };

export default function ResumePdfDocument({ resume }:any) {
  return (
    <Document>
      <Page size={legalSize} style={styles.page}>
        <Text style={styles.header}>{resume.name}</Text>
        <Text style={styles.title}>{resume.title}</Text>
        <Text style={styles.subHeader}>| {resume.location} | {resume.email} |</Text>
        <Text style={styles.sectionTitle}>{resume.summaryTitle}</Text>
        <Text style={styles.text}>{resume.summary}</Text>
        <Text style={styles.sectionTitle}>{resume.skillsTitle}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {resume.skills.map((skill: string, i: number) => (
            <Text key={i} style={styles.bullet}>• {skill}</Text>
          ))}
        </View>
        <Text style={styles.sectionTitle}>{resume.experienceTitle}</Text>
        {resume.experience.map((exp: experienceModel, i: number) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <View style={styles.row}>
              <Text style={styles.role}>{exp.role}</Text>
              <Text style={styles.period}>{exp.period}</Text>
            </View>
            <Text style={styles.company}>{exp.company}</Text>
            <Text style={styles.text}>{exp.description}</Text>
            {exp.bullets.map((b, j) => (
              <Text key={j} style={styles.bullet}>• {b}</Text>
            ))}
          </View>
        ))}
        <Text style={styles.sectionTitle}>{resume.educationTitle}</Text>
        <View style={styles.row}>
          <Text style={styles.bold}>{resume.education.degree}</Text>
          <Text style={styles.text}>{resume.education.period}</Text>
        </View>
        <Text style={styles.company}>{resume.education.institution}</Text>
        <Text style={styles.text}>{resume.education.details}</Text>
      </Page>
    </Document>
  );
}