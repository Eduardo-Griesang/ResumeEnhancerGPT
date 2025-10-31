import { type CoverLetter, type Job } from "wasp/entities";
import {
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton,
  ModalBody,
  Tooltip,
  Textarea,
  Button,
  useClipboard,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEdit } from 'react-icons/ai';
import { PDFDownloadLink } from "@react-pdf/renderer";
import CoverLetterPdfDocument from "./CoverLetterPdfDocument";

type CoverLetterWithJob = CoverLetter & { job: Job };

type ModalProps = {
  coverLetterData: CoverLetterWithJob[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  title?: string;
};

export default function ModalElement({ coverLetterData, isOpen, onOpen, onClose, title }: ModalProps) {
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<CoverLetterWithJob>(coverLetterData[0]);

  const { hasCopied, onCopy } = useClipboard(selectedCoverLetter.content);

  const navigate = useNavigate();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const copyButtonRef = useRef(null);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCoverLetterId = e.target.value;
    const selectedCoverLetter = coverLetterData.find((coverLetter) => coverLetter.id === selectedCoverLetterId);
    if (selectedCoverLetter) {
      setSelectedCoverLetter(selectedCoverLetter);
    }
  };

  const convertDateToLocaleString = (date: Date) => {
    return date.toLocaleDateString() + ' - ' + date.toLocaleTimeString().split(':').slice(0, 2).join(':');
  };

  const sanitizeFilenameSegment = (value: string) =>
    value.trim().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');

  const coverLetterFileName = selectedCoverLetter.job?.company
    ? `${sanitizeFilenameSegment(selectedCoverLetter.job.company) || 'CoverLetter'}_cover_letter.pdf`
    : 'CoverLetter.pdf';

  return (
    <Modal isOpen={isOpen} onClose={onClose} initialFocusRef={copyButtonRef}>
      <ModalOverlay backdropFilter='auto' backdropInvert='15%' backdropBlur='2px' />
      <ModalContent maxH='2xl' maxW='2xl' bgColor='bg-modal'>
        {title ? (<ModalHeader>Your Resume</ModalHeader>)
        : <ModalHeader>Your Cover Letter{coverLetterData.length > 1 && 's'}</ModalHeader>  }
        <ModalCloseButton />
        <ModalBody>
          {coverLetterData.length > 1 && (
            <Select
              placeholder='Select Cover Letter'
              defaultValue={selectedCoverLetter.id}
              onChange={handleSelectChange}
            >
              {coverLetterData.map((coverLetter) => (
                <option key={coverLetter.id} value={coverLetter.id}>
                  {coverLetter.title} - {convertDateToLocaleString(coverLetter.createdAt)}
                </option>
              ))}
            </Select>
          )}
          <Textarea
            readOnly
            ref={textAreaRef}
            height='md'
            top='50%'
            left='50%'
            transform={'translate(-50%, 0%)'}
            resize='none'
            variant='filled'
            dropShadow='lg'
            value={selectedCoverLetter.content}
            overflow='scroll'
          />
        </ModalBody>

        <ModalFooter alignItems='center' gap={3}>
          <Tooltip
            label={hasCopied ? 'Copied!' : 'Copy Letter to Clipboard'}
            placement='top'
            hasArrow
            closeOnClick={false}
          >
            <Button ref={copyButtonRef} colorScheme='brand' size='sm' onClick={onCopy}>
              Copy
            </Button>
          </Tooltip>
          <PDFDownloadLink
            document={<CoverLetterPdfDocument coverLetter={selectedCoverLetter.content} />}
            fileName={coverLetterFileName}
          >
            {({ loading }) => (
              <Button colorScheme="brand" size="sm">
                {loading ? 'Preparing PDF...' : 'Download as PDF'}
              </Button>
            )}
          </PDFDownloadLink>
          {!title ? (
            <Button
            leftIcon={<AiOutlineEdit />}
            colorScheme='brand'
            variant='outline'
            size='sm'
            onClick={() => navigate(`/cover-letter/${selectedCoverLetter.id}`)}
          >
            Edit
          </Button>)
          : <></>
          }
          
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
