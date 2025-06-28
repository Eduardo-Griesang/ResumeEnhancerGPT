import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalCloseButton, ModalBody, Button, Box, Heading, Text, HStack
} from '@chakra-ui/react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ResumePdfDocument from './ResumePdfDocument';

type ModalProps = {
  resume: any
  isOpen: boolean;
  onClose: () => void;
};

type experienceModel = {
  role: string;
  company: string;
  period: string;
  description: string;
  bullets?: string[];
}

export default function ResumeModal({ resume, isOpen, onClose }: ModalProps) {
  if (!resume) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxH="70vh" maxW="2xl" bgColor='bg-modal'>
        <ModalHeader>Your Resume</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={4} maxH="50vh" overflowY="auto">
          <Box
            bg="gray.800"
            color="white"
            p={4}
            borderRadius="md"
            borderColor="gray.700"
            borderWidth={1}
            overflowY="auto"
          >
            <Heading size="md" textAlign="center">{resume.name}</Heading>
            <Text textAlign="center" mb={2}>{resume.title} | {resume.location} | {resume.email}</Text>
            <Text fontWeight="bold" mt={2}>Summary</Text>
            <Text mb={2}>{resume.summary}</Text>
            <Text fontWeight="bold" mt={2}>Skills</Text>
            <Text mb={2}>{resume.skills?.join(', ')}</Text>
            <Text fontWeight="bold" mt={2}>Experience</Text>
            {resume.experience?.map((exp: experienceModel, i: number) => (
              <Box key={i} mb={2}>
                <Text fontWeight="bold">{exp.role} @ {exp.company} <Text as="span" fontWeight="normal">({exp.period})</Text></Text>
                <Text fontStyle="italic">{exp.description}</Text>
                <ul>
                  {exp.bullets?.map((b, j) => (
                    <li key={j}><Text>{b}</Text></li>
                  ))}
                </ul>
              </Box>
            ))}
            <Text fontWeight="bold" mt={2}>Education</Text>
            <Text>{resume.education?.degree}, {resume.education?.institution}</Text>
            <Text>{resume.education?.period}</Text>
            <Text>{resume.education?.details}</Text>
          </Box>
        </ModalBody>
        <ModalFooter>
          <PDFDownloadLink
            document={<ResumePdfDocument resume={resume} />}
            fileName={`${resume.title.replace(/\s+/g, ' ')}_Resume.pdf`}
          >
            {({ loading }) => (
              <Button colorScheme="purple" size="sm">
                {loading ? 'Preparing PDF...' : 'Download as PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}