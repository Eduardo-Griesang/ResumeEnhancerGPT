import { type CoverLetter, type Job } from "wasp/entities";
import { editCoverLetter, useQuery, getCoverLetter, getOptimizedResume, editResume } from "wasp/client/operations";
import { Box, HStack, Spinner, Textarea, Text, Button, VStack, useClipboard, Heading } from "@chakra-ui/react";
import { useLocation, useParams } from 'react-router-dom';
import BorderBox from './components/BorderBox';
import { useContext } from 'react';
import { TextareaContext } from './App';
import { EditAlert } from './components/AlertDialog';
import { useEffect, useState } from 'react';
import { PDFDownloadLink } from "@react-pdf/renderer";
import ResumePdfDocument from "./components/ResumePdfDocument";
import CoverLetterPdfDocument from "./components/CoverLetterPdfDocument";
import { useAuth } from "wasp/client/auth";

export default function CoverLetterPage() {
  const { textareaState, setTextareaState } = useContext(TextareaContext);
  const [editIsLoading, setEditIsLoading] = useState<boolean>(false);
  const [editIsLoadingResume, setEditIsLoadingResume] = useState<boolean>(false);
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const optimizedResumeId = params.get("optimizedResumeId");

  const { id } = useParams();
  if (!id) {
    return <BorderBox>Error: Cover letter ID is required</BorderBox>;
  }

  const {
    data: coverLetter,
    isLoading,
    refetch,
  } = useQuery<{ id: string }, CoverLetter & { job: Job }>(getCoverLetter, { id }, { enabled: false });

  const { data: optimizedResume, isLoading: isResumeLoading } = useQuery(
    getOptimizedResume,
    { id: optimizedResumeId ?? '' },
    { enabled: !!optimizedResumeId }
  );
  let parsedResume:any;
  try {
    parsedResume = optimizedResume?.content ? JSON.parse(optimizedResume.content) : null;
  } catch (e) {
    parsedResume;
  }

  type experienceModel = {
    role: string;
    company: string;
    period: string;
    description: string;
    bullets?: string[];
  }

  const { data: user } = useAuth();

  const { hasCopied: hasCopiedCoverLetter, onCopy: onCopyCoverLetter } = useClipboard(coverLetter?.content || '');
  const { hasCopied: hasCopiedResume, onCopy: onCopyResume } = useClipboard(optimizedResume?.content || '');
  const [resumeText, setResumeText] = useState(resumeToText(parsedResume));

  useEffect(() => {
    if (parsedResume && resumeText === '') {
      setResumeText(resumeToText(parsedResume));
    }
    // eslint-disable-next-line
  }, [parsedResume]);

  const handleSaveResume = async () => {
    setEditIsLoadingResume(true);
    try {
      await editResume({ optimizedResumeId: optimizedResumeId ?? '', content: JSON.stringify(resumeText), gptModel: user?.gptModel || 'gpt-4o-mini' });
    } catch (error) {
      console.error('There was an error', error)
    }
    setEditIsLoadingResume(false);
  };

  // restrains fetching to mount only to avoid re-render issues
  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (coverLetter) {
      setTextareaState(coverLetter.content);
    }
  }, [coverLetter]);

  const handleClick = async () => {
    try {
      setEditIsLoading(true);
      if (!id) {
        throw new Error('Cover letter ID is required');
      }

      const editedCoverLetter = await editCoverLetter({ coverLetterId: id, content: textareaState });

      if (!!editedCoverLetter) {
        setIsEdited(true);
        setTimeout(() => {
          setIsEdited(false);
        }, 2500);
      }
    } catch (error) {
      console.error(error);
      alert('An error occured. Please try again.');
    }
    setEditIsLoading(false);
  };

  function resumeToText(resume: any) {
    if (!resume) return '';
    let text = '';
    if (resume.name) text += `${resume.name}\n`;
    if (resume.title || resume.location || resume.email)
      text += `${resume.title || ''} | ${resume.location || ''} | ${resume.email || ''}\n\n`;
    if (resume.summary) text += `${resume.summaryTitle}\n${resume.summary}\n\n`;
    if (resume.skills) text += `${resume.skillsTitle}\n${resume.skills.join(', ')}\n\n`;
    if (resume.experience) {
      text += `${resume.experienceTitle}\n`;
      resume.experience.forEach((exp: any) => {
        text += `${exp.role}\n${exp.company}\n${exp.period}\n${exp.description}\n`;
        if (exp.bullets) text += exp.bullets.map((b: string) => `- ${b}`).join('\n') + '\n';
        text += '\n';
      });
    }
    if (resume.education) {
      text += `${resume.educationTitle}\n${resume.education.degree}\n${resume.education.institution}\n${resume.education.period}\n${resume.education.details}\n`;
    }
    return text.trim();
  }

  const sanitizeFilenameSegment = (value: string) =>
    value.trim().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');

  const coverLetterFileName = coverLetter?.job?.company
    ? `${sanitizeFilenameSegment(coverLetter.job.company) || 'CoverLetter'}_cover_letter.pdf`
    : 'CoverLetter.pdf';

  return (
    <>
      <BorderBox px={[0.5, 0.5]} py={[0.5, 0.5]} maxWidth="900px" mx="auto">
        {isLoading || isResumeLoading ? (
          <Spinner />
        ) : (
          <HStack
            align="start"
            spacing={4}
            width="100%"
            flexDirection={['column', 'row']}
            justify="center"
          >
            <VStack
              flex={1}
              spacing={2}
              align="stretch"
              width={['100%', '100%', 'auto']}
              maxWidth={['100%', '100%', '420px']}
              mx="auto"
            >
              <Heading as="h3" size="sm" mb={1} color="gray.300" textAlign="center">
                Cover Letter
              </Heading>
              <Textarea
                onChange={(e) => setTextareaState(e.target.value)}
                value={textareaState}
                id='cover-letter-textarea'
                height={['xs', 'md', 'xl']}
                resize="none"
                p={2}
                fontSize="sm"
                bg="gray.800"
                color="white"
                borderRadius="md"
                borderColor="gray.700"
              />
              <HStack spacing={2} mt={1} justify="center">
                <Button
                  onClick={handleClick}
                  isLoading={editIsLoading}
                  loadingText='Saving...'
                  colorScheme='blue'
                  size="sm"
                >
                  Save Changes
                </Button>
                <PDFDownloadLink
                  document={<CoverLetterPdfDocument coverLetter={textareaState} />}
                  fileName={coverLetterFileName}
                >
                  {({ loading }) => (
                    <Button colorScheme="purple" size="sm">
                      {loading ? 'Preparing PDF...' : 'Download as PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              </HStack>
            </VStack>

            <VStack
              flex={1}
              spacing={2}
              align="stretch"
              mt={[4, 0]}
              width={['100%', '100%', 'auto']}
              maxWidth={['100%', '100%', '420px']}
              mx="auto"
            >
              <Heading as="h3" size="sm" mb={1} color="gray.300" textAlign="center">
                Resume
              </Heading>
              {parsedResume ? (
              <Textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                id='resume-textarea'
                height={['xs', 'md', 'xl']}
                resize="none"
                p={2}
                fontSize="sm"
                bg="gray.800"
                color="white"
                borderRadius="md"
                borderColor="gray.700"
              />): (
                <Text>No structured resume found</Text>
              )}
              <HStack spacing={2} mt={1} justify="center">
                <Button
                  onClick={handleSaveResume}
                  isLoading={editIsLoadingResume}
                  loadingText='Saving...'
                  colorScheme='blue'
                  size="sm"
                >
                  Save Changes
                </Button>
                <PDFDownloadLink
                  document={<ResumePdfDocument resume={parsedResume} />}
                  fileName={`${parsedResume?.title.replace(/\s+/g, '_')}_Resume.pdf`}
                >
                  {({ loading }) => (
                    <Button colorScheme="purple" size="sm">
                      {loading ? 'Preparing PDF...' : 'Download as PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              </HStack>
            </VStack>
          </HStack>
        )}
      </BorderBox>
      <EditAlert coverLetter={!!coverLetter} />
    </>
  );
}
