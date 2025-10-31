import { type User, type LnPayment } from "wasp/entities";
import { useAuth } from "wasp/client/auth";

import {
  generateCoverLetter,
  createJob,
  updateCoverLetter,
  updateLnPayment,
  useQuery,
  getJob,
  getCoverLetterCount,
  optimizeResume
} from "wasp/client/operations";

import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  FormErrorMessage,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  FormHelperText,
  Code,
  Checkbox,
  Spinner,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  RadioGroup,
  Radio,
  Tooltip,
  useDisclosure,
  useColorModeValue,
  Stack,
  Divider,
  Switch,
} from '@chakra-ui/react';
import BorderBox from './components/BorderBox';
import { LeaveATip, LoginToBegin } from './components/AlertDialog';
import { convertToSliderValue, convertToSliderLabel } from './components/CreativitySlider';
import * as pdfjsLib from 'pdfjs-dist';
import { useState, useEffect, useRef } from 'react';
import { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import LnPaymentModal from './components/LnPaymentModal';
import { fetchLightningInvoice } from './lightningUtils';
import type { LightningInvoice } from './lightningUtils';
import { FaCheckCircle, FaPaperclip, FaPen, FaPlus } from "react-icons/fa";

function MainPage() {
  const [isPdfReady, setIsPdfReady] = useState<boolean>(false);
  const [jobToFetch, setJobToFetch] = useState<string>('');
  const [isCoverLetterUpdate, setIsCoverLetterUpdate] = useState<boolean>(false);
  const [isCompleteCoverLetter, setIsCompleteCoverLetter] = useState<boolean>(true);
  const [sliderValue, setSliderValue] = useState(30);
  const [showTooltip, setShowTooltip] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState<LightningInvoice | null>(null);
  const [isJobDescriptionPdfMode, setIsJobDescriptionPdfMode] = useState<boolean>(false);
  const [jobDescriptionPdfName, setJobDescriptionPdfName] = useState<string | null>(null);
  const [isJobDescriptionPdfReady, setIsJobDescriptionPdfReady] = useState<boolean>(false);

  const { data: user } = useAuth();

  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const jobIdParam = urlParams.get('job');

  const {
    data: job,
    isLoading: isJobLoading,
    error: getJobError,
  } = useQuery(getJob, { id: jobToFetch }, { enabled: jobToFetch.length > 0 });

  let { data: coverLetterCount } = useQuery(getCoverLetterCount);
  if (coverLetterCount) {
    coverLetterCount = coverLetterCount * 2
  }

  const {
    handleSubmit,
    register,
    setValue,
    reset,
    clearErrors,
    formState: { errors: formErrors, isSubmitting },
  } = useForm();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: loginIsOpen, onOpen: loginOnOpen, onClose: loginOnClose } = useDisclosure();
  const { isOpen: lnPaymentIsOpen, onOpen: lnPaymentOnOpen, onClose: lnPaymentOnClose } = useDisclosure();

  let setLoadingTextTimeout: ReturnType<typeof setTimeout>;
  const loadingTextRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobDescriptionFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (jobIdParam) {
      setJobToFetch(jobIdParam);
      setIsCoverLetterUpdate(true);
      resetJob();
    } else {
      setIsCoverLetterUpdate(false);
      reset({
        title: '',
        company: '',
        location: '',
        description: '',
      });
    }
  }, [jobIdParam, job]);

  useEffect(() => {
    resetJob();
  }, [job]);

  useEffect(() => {
    if (isCoverLetterUpdate) {
      setIsJobDescriptionPdfMode(false);
      setIsJobDescriptionPdfReady(false);
      setJobDescriptionPdfName(null);
    }
  }, [isCoverLetterUpdate]);

  function resetJob() {
    if (job) {
      reset({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
      });
    }
  }

  // pdf to text parser
  async function onFileUpload(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files == null) return;
    if (event.target.files.length == 0) return;

    setValue('pdf', null);
    setIsPdfReady(false);
    const pdfFile = event.target.files[0];

    // Read the file using file reader
    const fileReader = new FileReader();

    fileReader.onload = function () {
      // turn array buffer into typed array
      if (this.result == null || !(this.result instanceof ArrayBuffer)) {
        return;
      }
      const typedarray = new Uint8Array(this.result);

      // pdfjs should be able to read this
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
      const loadingTask = pdfjsLib.getDocument(typedarray);
      let textBuilder: string = '';
      loadingTask.promise
        .then(async (pdf) => {
          // Loop through each page in the PDF file
          for (let i = 1; i <= pdf.numPages; i++) {
            // Get the text content for the page
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items
              .map((item: any) => {
                if (item.str) {
                  return item.str;
                }
                return '';
              })
              .join(' ');
            textBuilder += text;
          }
          setIsPdfReady(true);
          setValue('pdf', textBuilder);
          clearErrors('pdf');
        })
        .catch((err) => {
          alert('An Error occured uploading your PDF. Please try again.');
          console.error(err);
        });
    };
    // Read the file as ArrayBuffer
    try {
      fileReader.readAsArrayBuffer(pdfFile);
    } catch (error) {
      alert('An Error occured uploading your PDF. Please try again.');
    }
  }

  function handleJobDescriptionModeToggle(event: ChangeEvent<HTMLInputElement>) {
    const shouldUsePdf = event.target.checked;
    setIsJobDescriptionPdfMode(shouldUsePdf);
    setIsJobDescriptionPdfReady(false);
    setJobDescriptionPdfName(null);
    if (jobDescriptionFileInputRef.current) {
      jobDescriptionFileInputRef.current.value = '';
    }
    if (shouldUsePdf) {
      setValue('description', '');
    }
    clearErrors('description');
  }

  function handleJobDescriptionFileButtonClick() {
    jobDescriptionFileInputRef.current?.click();
  }

  function onJobDescriptionPdfUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    setIsJobDescriptionPdfReady(false);
    setJobDescriptionPdfName(file.name);

    const fileReader = new FileReader();

    fileReader.onload = function () {
      if (this.result == null || !(this.result instanceof ArrayBuffer)) {
        alert('An Error occured uploading your Job Description PDF. Please try again.');
        setIsJobDescriptionPdfReady(false);
        setJobDescriptionPdfName(null);
        return;
      }
      const typedarray = new Uint8Array(this.result);

      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
      const loadingTask = pdfjsLib.getDocument(typedarray);
      let textBuilder: string = '';
      loadingTask.promise
        .then(async (pdf) => {
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items
              .map((item: any) => {
                if (item.str) {
                  return item.str;
                }
                return '';
              })
              .join(' ');
            textBuilder += text;
          }
          const trimmedText = textBuilder.trim();
          if (!trimmedText) {
            throw new Error('Parsed job description was empty.');
          }
          setValue('description', trimmedText, { shouldValidate: true });
          clearErrors('description');
          setIsJobDescriptionPdfReady(true);
        })
        .catch((err) => {
          console.error(err);
          alert('An Error occured uploading your Job Description PDF. Please try again.');
          setValue('description', '', { shouldValidate: true });
          setIsJobDescriptionPdfReady(false);
          setJobDescriptionPdfName(null);
        });
    };

    fileReader.onerror = () => {
      alert('An Error occured uploading your Job Description PDF. Please try again.');
      setIsJobDescriptionPdfReady(false);
      setJobDescriptionPdfName(null);
    };

    try {
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      alert('An Error occured uploading your Job Description PDF. Please try again.');
      setIsJobDescriptionPdfReady(false);
      setJobDescriptionPdfName(null);
    }
    event.target.value = '';
  }

  async function checkIfLnAndPay(user: Omit<User, 'password'>): Promise<LnPayment | null> {
    try {
      if (user.isUsingLn && user.credits === 0) {
        const invoice = await fetchLightningInvoice();
        let lnPayment: LnPayment;
        if (invoice) {
          invoice.status = 'pending';
          lnPayment = await updateLnPayment(invoice);
          setLightningInvoice(invoice);
          lnPaymentOnOpen();
        } else {
          throw new Error('fetching lightning invoice failed');
        }
  
        let status = invoice.status;
        while (status === 'pending') {
          lnPayment = await updateLnPayment(invoice);
          status = lnPayment.status;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (status !== 'success') {
          throw new Error('payment failed');
        }
        return lnPayment;
      } 
    } catch (error) {
      console.error('Error processing payment, please try again');
    }
    return null;
  }

  function checkIfSubPastDueAndRedirect(user: Omit<User, 'password'>) {
    if (user.subscriptionStatus === 'past_due') {
      navigate('/profile')
      return true;
    } else {
      return false;
    }
  }

  async function onSubmit(values: any): Promise<void> {
    let canUserContinue = hasUserPaidOrActiveTrial();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canUserContinue) {
      navigate('/profile');
      return;
    }

    try {
      const lnPayment = await checkIfLnAndPay(user);

      const isSubscriptionPastDue = checkIfSubPastDueAndRedirect(user);
      if (isSubscriptionPastDue) return;

      const job = await createJob(values);

      const creativityValue = convertToSliderValue(sliderValue);

      const coverLetterPayload = {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        content: values.pdf,
        description: job.description,
        isCompleteCoverLetter,
        includeWittyRemark: values.includeWittyRemark,
        temperature: creativityValue,
        gptModel: values.gptModel || 'gpt-4o-mini',
        lnPayment: lnPayment || undefined,
      };

      const resumePayload = {
        resume: values.pdf,
        jobId: job.id,
        jobDescription: job.description,
        gptModel: values.gptModel || 'gpt-4o-mini',
        lnPayment: lnPayment || undefined,
      };

      setLoadingText();

      // Run both in parallel
      const [coverLetter, optimizedResume] = await Promise.all([
        generateCoverLetter(coverLetterPayload),
        optimizeResume(resumePayload),
      ]);

      // Pass both IDs to the next page
      navigate(`/cover-letter/${coverLetter.id}?optimizedResumeId=${optimizedResume.id}`);
    } catch (error: any) {
      cancelLoadingText();
      alert(`${error?.message ?? 'Something went wrong, please try again'}`);
      console.error(error);
    }
  }

  async function onUpdate(values: any): Promise<void> {
    const canUserContinue = hasUserPaidOrActiveTrial();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canUserContinue) {
      navigate('/profile');
      return;
    }

    try {
      const lnPayment = await checkIfLnAndPay(user);

      const isSubscriptionPastDue = checkIfSubPastDueAndRedirect(user);
      if (isSubscriptionPastDue) return;

      if (!job) {
        throw new Error('Job not found');
      }

      const creativityValue = convertToSliderValue(sliderValue);
      const payload = {
        id: job.id,
        description: values.description,
        content: values.pdf,
        isCompleteCoverLetter,
        temperature: creativityValue,
        includeWittyRemark: values.includeWittyRemark,
        gptModel: values.gptModel || 'gpt-4o-mini',
        lnPayment: lnPayment || undefined,
      };

      setLoadingText();

      const coverLetterId = await updateCoverLetter(payload);

      navigate(`/cover-letter/${coverLetterId}`);
    } catch (error: any) {
      cancelLoadingText();
      alert(`${error?.message ?? 'Something went wrong, please try again'}`);
      console.error(error);
    }
  }

  function handleFileButtonClick() {
    if (!fileInputRef.current) {
      return;
    } else {
      fileInputRef.current.click();
    }
  }

  function setLoadingText() {
    setLoadingTextTimeout = setTimeout(() => {
      loadingTextRef.current && (loadingTextRef.current.innerText = ' We are building everything...');
    }, 2000);
  }

  function cancelLoadingText() {
    clearTimeout(setLoadingTextTimeout);
    loadingTextRef.current && (loadingTextRef.current.innerText = '');
  }

  function hasUserPaidOrActiveTrial(): Boolean {
    if (user) {
      if (user.isUsingLn) {
        if (user.credits < 3 && user.credits > 0) {
          onOpen();
        }
        return true;
      }
      if (!user.hasPaid && !user.isUsingLn && user.credits > 0) {
        if (user.credits < 3) {
          onOpen();
        }
        return user.credits > 0;
      }
      if (user.hasPaid) {
        return true;
      } else if (!user.hasPaid) {
        return false;
      }
    }
    return false;
  }

  const showForm = (isCoverLetterUpdate && job) || !isCoverLetterUpdate;
  const showSpinner = isCoverLetterUpdate && isJobLoading;
  const showJobNotFound = isCoverLetterUpdate && !job && !isJobLoading;
  const gptTextColor = useColorModeValue('brand.500', 'white');

  const formRef = useRef<HTMLFormElement>(null);

  const handleTryNowClick = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <VStack gap={3} marginTop={8} marginBottom={4} textAlign={"center"}>  
        <span ref={formRef}></span>
        <Heading size='2xl' color={gptTextColor}>
          Generate Resumes and Cover Letters
        </Heading>
        <Heading size='xl' color={'text-contrast-md'}>
          Perfectly customized for the job
        </Heading>
      </VStack>
      <Box
        layerStyle='card'
        px={4}
        py={2}
        mt={3}
        mb={-3}
        bgColor='bg-overlay'
        visibility={!coverLetterCount ? 'hidden' : 'visible'}
        _hover={{ bgColor: 'bg-contrast-xs' }}
        transition='0.1s ease-in-out'
      >
        <Text fontSize='md'>{coverLetterCount?.toLocaleString()} Resumes and Cover Letters Generated!</Text>
      </Box>
      <BorderBox>
        <form
          onSubmit={!isCoverLetterUpdate ? handleSubmit(onSubmit) : handleSubmit(onUpdate)}
          style={{ width: '100%' }}
        >

            <Heading size={'md'} alignSelf={'start'} mb={3} w='full'>
              Job Info {isCoverLetterUpdate && <Code ml={1}>Editing...</Code>}
            </Heading>

          {showSpinner && <Spinner />}
          {showForm && (
            <>
              <FormControl isInvalid={!!formErrors.title}>
                <Input
                  id='title'
                  borderRadius={0}
                  borderTopRadius={7}
                  placeholder='job title'
                  {...register('title', {
                    required: 'This is required',
                    minLength: {
                      value: 2,
                      message: 'Minimum length should be 2',
                    },
                  })}
                  onFocus={(e: any) => {
                    if (user === null) {
                      loginOnOpen();
                      e.target.blur();
                    }
                  }}
                  disabled={isCoverLetterUpdate}
                />
                <FormErrorMessage>{!!formErrors.title && formErrors.title.message?.toString()}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!formErrors.company}>
                <Input
                  id='company'
                  borderRadius={0}
                  placeholder='company'
                  {...register('company', {
                    required: 'This is required',
                    minLength: {
                      value: 1,
                      message: 'Minimum length should be 1',
                    },
                  })}
                  disabled={isCoverLetterUpdate}
                />
                <FormErrorMessage>{!!formErrors.company && formErrors.company.message?.toString()}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!formErrors.location}>
                <Input
                  id='location'
                  borderRadius={0}
                  placeholder='location'
                  {...register('location', {
                    required: 'This is required',
                    minLength: {
                      value: 2,
                      message: 'Minimum length should be 2',
                    },
                  })}
                  disabled={isCoverLetterUpdate}
                />
                <FormErrorMessage>{!!formErrors.location && formErrors.location.message?.toString()}</FormErrorMessage>
              </FormControl>
              <FormControl
                isInvalid={!!formErrors.description}
                display={isJobDescriptionPdfMode ? 'none' : 'block'}
              >
                <Textarea
                  id='description'
                  borderRadius={0}
                  placeholder='copy & paste the job description in any language'
                  {...register('description', {
                    validate: (value) => {
                      const descriptionValue = typeof value === 'string' ? value : '';
                      return descriptionValue.trim().length > 0 ? true : 'Please provide a job description';
                    },
                  })}
                  disabled={isCoverLetterUpdate || isJobDescriptionPdfMode}
                />
                <FormErrorMessage>
                  {!!formErrors.description && formErrors.description.message?.toString()}
                </FormErrorMessage>
              </FormControl>
              {isJobDescriptionPdfMode && (
                <FormControl isInvalid={!!formErrors.description}>
                  <Input
                    id='jobDescriptionPdfInput'
                    type='file'
                    accept='application/pdf'
                    placeholder='job-description-pdf'
                    onChange={onJobDescriptionPdfUpload}
                    display='none'
                    ref={jobDescriptionFileInputRef}
                    disabled={isCoverLetterUpdate}
                  />
                  <VStack
                    border={!!formErrors.description ? '1px solid #FC8181' : 'sm'}
                    boxShadow={!!formErrors.description ? '0 0 0 1px #FC8181' : 'none'}
                    bg='bg-contrast-xs'
                    p={3}
                    alignItems='flex-start'
                    _hover={{
                      bg: 'bg-contrast-sm',
                      borderColor: 'border-contrast-md',
                    }}
                    transition={
                      'transform 0.05s ease-in, transform 0.05s ease-out, background 0.3s, opacity 0.3s, border 0.3s'
                    }
                  >
                    <HStack width='full' justify='space-between' align='center'>
                      <FormLabel textAlign='center' htmlFor='jobDescriptionPdfInput' mb={0}>
                        <Button
                          size='sm'
                          colorScheme='contrast'
                          onClick={handleJobDescriptionFileButtonClick}
                          isDisabled={isCoverLetterUpdate}
                        >
                          Upload Job Description
                        </Button>
                      </FormLabel>
                      {jobDescriptionPdfName ? (
                        <Text fontSize='sm'>
                          {jobDescriptionPdfName}
                          {isJobDescriptionPdfReady ? ' • Uploaded!' : ' • Processing...'}
                        </Text>
                      ) : (
                        <Text fontSize='sm' color='text-contrast-md'>
                          No file selected
                        </Text>
                      )}
                    </HStack>
                    <FormHelperText mt={0.5} fontSize='xs'>
                      Upload a PDF of the job description to extract the text automatically.
                    </FormHelperText>
                  </VStack>
                  <FormErrorMessage>
                    {!!formErrors.description && formErrors.description.message?.toString()}
                  </FormErrorMessage>
                </FormControl>
              )}
              <FormControl isInvalid={!!formErrors.pdf}>
                <Input
                  id='pdf'
                  type='file'
                  accept='application/pdf'
                  placeholder='pdf'
                  {...register('pdf', {
                    required: 'Please upload a CV/Resume',
                  })}
                  onChange={(e) => {
                    onFileUpload(e);
                  }}
                  display='none'
                  ref={fileInputRef}
                />
                <VStack
                  border={!!formErrors.pdf ? '1px solid #FC8181' : 'sm'}
                  boxShadow={!!formErrors.pdf ? '0 0 0 1px #FC8181' : 'none'}
                  bg='bg-contrast-xs'
                  p={3}
                  alignItems='flex-start'
                  _hover={{
                    bg: 'bg-contrast-sm',
                    borderColor: 'border-contrast-md',
                  }}
                  transition={
                    'transform 0.05s ease-in, transform 0.05s ease-out, background 0.3s, opacity 0.3s, border 0.3s'
                  }
                >
                  <HStack width='full' align='center' justify='space-between'>
                    <HStack>
                      <FormLabel textAlign='center' htmlFor='pdf' mb={0}>
                        <Button size='sm' colorScheme='contrast' onClick={handleFileButtonClick}>
                          Upload CV
                        </Button>
                      </FormLabel>
                      {isPdfReady && <Text fontSize='sm'>Uploaded!</Text>}
                    </HStack>
                    {!isCoverLetterUpdate && (
                      <HStack>
                        <FormLabel
                          htmlFor='job-description-mode-switch'
                          mb={0}
                          fontSize='sm'
                          color='text-contrast-md'
                        >
                          Upload job description PDF
                        </FormLabel>
                        <Switch
                          id='job-description-mode-switch'
                          colorScheme='brand'
                          isChecked={isJobDescriptionPdfMode}
                          onChange={handleJobDescriptionModeToggle}
                        />
                      </HStack>
                    )}
                  </HStack>
                  <FormHelperText mt={0.5} fontSize={'xs'}>
                    Upload a PDF only of Your CV/Resumé
                  </FormHelperText>
                </VStack>
                <FormErrorMessage>{!!formErrors.pdf && formErrors.pdf.message?.toString()}</FormErrorMessage>
              </FormControl>
              {(user?.gptModel === 'gpt-4' || user?.gptModel === 'gpt-4o') && (
                <FormControl>
                  <VStack
                    border={'sm'}
                    bg='bg-contrast-xs'
                    p={3}
                    alignItems='flex-start'
                    _hover={{
                      bg: 'bg-contrast-md',
                      borderColor: 'border-contrast-md',
                    }}
                    transition={
                      'transform 0.05s ease-in, transform 0.05s ease-out, background 0.3s, opacity 0.3s, border 0.3s'
                    }
                  >
                    <RadioGroup
                      id='gptModel'
                      defaultValue='gpt-4o'
                      color='text-contrast-lg'
                      fontWeight='semibold'
                      size='md'
                    >
                      <HStack spacing={5}>
                        <Radio {...register('gptModel')} value='gpt-4o-mini'>
                          GPT 4o mini
                        </Radio>
                        <Radio {...register('gptModel')} value='gpt-4o'>
                          GPT 4o
                        </Radio>
                      </HStack>
                    </RadioGroup>
                  </VStack>
                </FormControl>
              )}
              <VStack
                border={'sm'}
                bg='bg-contrast-xs'
                px={3}
                alignItems='flex-start'
                _hover={{
                  bg: 'bg-contrast-md',
                  borderColor: 'border-contrast-md',
                }}
                transition={
                  'transform 0.05s ease-in, transform 0.05s ease-out, background 0.3s, opacity 0.3s, border 0.3s'
                }
              >
                <FormControl my={2}>
                  <Slider
                    id='temperature'
                    defaultValue={30}
                    min={0}
                    max={68}
                    colorScheme='brand'
                    onChange={(v) => setSliderValue(v)}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <Tooltip
                      hasArrow
                      bg='brand.300'
                      color='white'
                      placement='top'
                      isOpen={showTooltip}
                      label={`${convertToSliderLabel(sliderValue)}`}
                    >
                      <SliderThumb />
                    </Tooltip>
                  </Slider>
                  <FormLabel
                    htmlFor='temperature'
                    color='text-contrast-md'
                    fontSize='sm'
                    _hover={{
                      color: 'text-contrast-lg',
                    }}
                  >
                    cover letter creativity level
                  </FormLabel>
                </FormControl>
              </VStack>
              <VStack
                border={'sm'}
                bg='bg-contrast-xs'
                px={3}
                borderRadius={0}
                borderBottomRadius={7}
                alignItems='flex-start'
                _hover={{
                  bg: 'bg-contrast-md',
                  borderColor: 'border-contrast-md',
                }}
                transition={
                  'transform 0.05s ease-in, transform 0.05s ease-out, background 0.3s, opacity 0.3s, border 0.3s'
                }
              >
                <FormControl display='flex' alignItems='center' mt={3} mb={3}>
                  <Checkbox id='includeWittyRemark' defaultChecked={true} {...register('includeWittyRemark')} />
                  <FormLabel
                    htmlFor='includeWittyRemark'
                    mb='0'
                    ml={2}
                    color='text-contrast-md'
                    fontSize='sm'
                    _hover={{
                      color: 'text-contrast-lg',
                    }}
                  >
                    include a witty remark at the end of the letter
                  </FormLabel>
                </FormControl>
              </VStack>
              <HStack alignItems='flex-end' gap={1}>
                <Button
                  colorScheme='brand'
                  mt={3}
                  size='sm'
                  isLoading={isSubmitting}
                  disabled={user === null}
                  type='submit'
                >
                  {!isCoverLetterUpdate ? 'Generate Resume and Cover Letter' : 'Create Resume and Cover Letter'}
                </Button>
                <Text ref={loadingTextRef} fontSize='sm' fontStyle='italic' color='text-contrast-md'>
                  {' '}
                </Text>
              </HStack>
            </>
          )}
          {showJobNotFound && (
            <>
              <Text fontSize='sm' color='text-contrast-md'>
                Can't find that job...
              </Text>
            </>
          )}
        </form>
      </BorderBox>
      <VStack mt={12} mb={8} spacing={6} textAlign="center" w="full">
        <Heading size="lg" color="text-contrast-lg">
          How It Works
        </Heading>
        <Stack direction={['column', 'row']} spacing={12} justify="center" w="full">
          <VStack>
            <Box fontSize="3xl" color="brand.400"><FaPaperclip /></Box>
            <Text fontWeight="bold">1. Upload PDF CV</Text>
            <Text fontSize="sm" color={'text-contrast-md'}>Start with your existing CV/Resumé.</Text>
          </VStack>
          <VStack>
            <Box fontSize="3xl" color="brand.400"><FaPlus /></Box>
            <Text fontWeight="bold">2. Add Job & Customize</Text>
            <Text fontSize="sm" color={'text-contrast-md'}>Paste the description and adjust creativity level.</Text>
          </VStack>
          <VStack>
            <Box fontSize="3xl" color="brand.400"><FaCheckCircle /></Box>
            <Text fontWeight="bold">3. Generate Draft</Text>
            <Text fontSize="sm" color={'text-contrast-md'}>Let AI create a tailored first version in seconds.</Text>
          </VStack>
          <VStack>
            <Box fontSize="3xl" color="brand.400"><FaPen /></Box>
            <Text fontWeight="bold">4. Refine Instantly</Text>
            <Text fontSize="sm" color={'text-contrast-md'}>Use inline tools to make it concise, detailed, etc.</Text>
          </VStack>
        </Stack>
      </VStack>
      <VStack width={"100%"} justify={"center"}>
        <Divider/>
        <Button
          colorScheme='brand'
          mt={12}
          mb={2}
          size='lg'
          type='button'
          onClick={handleTryNowClick}
        >
          Try Now
        </Button>
        <Text color={'text-contrast-md'} marginTop={1} fontSize="sm">Test for free now with 3 credits!</Text>
        <Text color={'text-contrast-md'} fontSize="sm" marginTop={-1}>Get an UNLIMITED monthly plan for as little as $5.99</Text>
      </VStack>
      <LeaveATip
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}
        credits={user?.credits || 0}
        isUsingLn={user?.isUsingLn || false}
      />
      <LoginToBegin isOpen={loginIsOpen} onOpen={loginOnOpen} onClose={loginOnClose} />
      <LnPaymentModal isOpen={lnPaymentIsOpen} onClose={lnPaymentOnClose} lightningInvoice={lightningInvoice} />
    </>
  );
}

export default MainPage;
