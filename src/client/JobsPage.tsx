import { type Job, type User } from "wasp/entities";

import {
  useAction,
  type OptimisticUpdateDefinition,
  updateJob,
  useQuery,
  getJobs,
  getCoverLetters,
  getOptimizedResumes,
  getOptimizedResume,
} from "wasp/client/operations";

import { useState, useEffect } from 'react';
import {
  Heading,
  Spacer,
  VStack,
  HStack,
  Button,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useDisclosure,
  Divider,
  Checkbox,
  Spinner,
  Stack,
} from '@chakra-ui/react';
import ModalElement from './components/Modal';
import DescriptionModal from './components/DescriptionModal';
import BorderBox from './components/BorderBox';
import { useNavigate } from 'react-router-dom';
import { DeleteJob } from './components/AlertDialog';
import { FiDelete } from 'react-icons/fi';
import ResumeModal from "./components/ResumeModal";

function JobsPage({ user }: { user: User }) {
  const [jobId, setJobId] = useState<string>('');
  const [descriptionText, setDescriptionText] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState(null);
  const { isOpen: isResumeOpen, onOpen: onResumeOpen, onClose: onResumeClose } = useDisclosure();

  const navigate = useNavigate();

  useEffect(() => {
    if (user.subscriptionStatus === 'past_due') {
      navigate('/profile');
    }
  }, [user.subscriptionStatus]);

  const { data: jobs, isLoading, error } = useQuery(getJobs);
  const { data: coverLetter } = useQuery(getCoverLetters, { id: jobId }, { enabled: jobId.length > 0 });

  const updateJobOptimistically = useAction(updateJob, {
    optimisticUpdates: [
      {
        getQuerySpecifier: () => [getJobs],
        updateQuery: ({ isCompleted, id }, oldData) => {
          return oldData && oldData.map((job) => (job.id === id ? { ...job, isCompleted } : job));
        },
      } as OptimisticUpdateDefinition<Pick<Job, 'id' | 'isCompleted'>, Job[]>,
    ],
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: desIsOpen, onOpen: desOnOpen, onClose: desOnClose } = useDisclosure();
  const { isOpen: deleteIsOpen, onOpen: deleteOnOpen, onClose: deleteOnClose } = useDisclosure();

  const coverLetterHandler = (job: Job) => {
    if (job) {
      setJobId(job.id);
      onOpen();
    }
  };

  const resumeHandler = async (job: Job) => {
    const resume = await getOptimizedResumes({ id: job.id });
    if (resume && resume.content) {
      try {
        setResumeData(JSON.parse(resume.content));
        onResumeOpen();
      } catch (e) {
        setResumeData(null);
      }
    }
  };

  const checkboxHandler = async (e: any, job: Job) => {
    try {
      const payload = {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        isCompleted: e.target.checked,
      };
      updateJobOptimistically(payload);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <VStack gap={1}>
      <BorderBox>
        <Heading size='md'>Your Jobs</Heading>
        {isLoading && <Spinner />}
        {!!jobs && (
          <Accordion width='100%'>
            {jobs.length > 0 ? (
              jobs.map((job: Job) => (
                <AccordionItem key={job.id}>
                  <h2>
                    <HStack flex='1' justifyContent='space-between'>
                      <AccordionButton _focus={{ boxShadow: '0px -1px 0px 0px var(--chakra-colors-active)' }}>
                        <Text textDecoration={job.isCompleted ? 'line-through' : ''}>
                          <b>{job.title}</b> @ {job.company}
                        </Text>
                        <Spacer />
                        <Text fontSize='sm' color={!job.isCompleted ? 'text-contrast-xs' : 'text-contrast-lg'}>
                          Applied
                        </Text>
                        <Checkbox mx={1} isChecked={job.isCompleted} onChange={(e) => checkboxHandler(e, job)} />
                        <AccordionIcon />
                      </AccordionButton>
                    </HStack>
                  </h2>
                  <AccordionPanel pb={4} pt={2}>
                    <HStack justify='space-between' align='center'>
                      <Divider maxW='40%' variant='dashed' />
                      <Button
                        leftIcon={<FiDelete />}
                        mr={3}
                        size='xs'
                        fontSize='sm'
                        onClick={() => {
                          setJobId(job.id);
                          deleteOnOpen();
                        }}
                      >
                        Delete
                      </Button>
                    </HStack>
                    <VStack alignItems={'space-between'} my={1}>
                      <Text>
                        <b>Location:</b> {job.location}
                      </Text>
                      <HStack pb={1}>
                        <Text>
                          <b>Description:</b>
                        </Text>
                        <Button
                          size='xs'
                          fontSize='sm'
                          onClick={() => {
                            setDescriptionText(job.description);
                            desOnOpen();
                          }}
                        >
                          Display
                        </Button>
                      </HStack>
                      <Stack
                        py={1}
                        spacing={2}
                        direction={['column', 'row']}
                        justify='space-between'
                        width="100%"
                      >
                        <Button colorScheme='purple' onClick={() => coverLetterHandler(job)} size='sm'>
                          Display Cover Letter
                        </Button>
                        <Button colorScheme='purple' onClick={() => resumeHandler(job)} size='sm'>
                          Display Resume
                        </Button>
                      </Stack>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              ))
            ) : (
              <Text textAlign='center'>no jobs yet...</Text>
            )}
          </Accordion>
        )}
      </BorderBox>
      <Button size='sm' mt={3} colorScheme='purple' alignSelf='flex-end' onClick={() => navigate('/')}>
        Create New Job
      </Button>
      {coverLetter && coverLetter.length > 0 && (
        <ModalElement coverLetterData={coverLetter} isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
      )}
      {descriptionText && (
        <DescriptionModal description={descriptionText} isOpen={desIsOpen} onOpen={desOnOpen} onClose={desOnClose} />
      )}
      {resumeData && (
        <ResumeModal
          resume={resumeData}
          isOpen={isResumeOpen}
          onClose={onResumeClose}
        />
      )}
      <DeleteJob jobId={jobId} isOpen={deleteIsOpen} onOpen={deleteOnOpen} onClose={deleteOnClose} />
    </VStack>
  );
}

export default JobsPage;
