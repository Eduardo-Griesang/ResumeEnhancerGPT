import { type CoverLetter } from "wasp/entities";
import { editCoverLetter, useQuery, getCoverLetter, getOptimizedResume } from "wasp/client/operations";
import { Box, HStack, Spinner, Textarea, Text, Button, VStack, useClipboard, Heading } from "@chakra-ui/react";
import { useLocation, useParams } from 'react-router-dom';
import BorderBox from './components/BorderBox';
import { useContext } from 'react';
import { TextareaContext } from './App';
import { EditAlert } from './components/AlertDialog';
import { useEffect, useState } from 'react';

export default function CoverLetterPage() {
  const { textareaState, setTextareaState } = useContext(TextareaContext);
  const [editIsLoading, setEditIsLoading] = useState<boolean>(false);
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
  } = useQuery<{ id: string }, CoverLetter>(getCoverLetter, { id }, { enabled: false });

  const { data: optimizedResume, isLoading: isResumeLoading } = useQuery(
    getOptimizedResume,
    { id: optimizedResumeId ?? '' },
    { enabled: !!optimizedResumeId }
  );

  const { hasCopied: hasCopiedCoverLetter, onCopy: onCopyCoverLetter } = useClipboard(coverLetter?.content || '');
  const { hasCopied: hasCopiedResume, onCopy: onCopyResume } = useClipboard(optimizedResume?.content || '');

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
                resize="vertical"
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
                <Button
                  onClick={onCopyCoverLetter}
                  colorScheme='purple'
                  size="sm"
                >
                  {hasCopiedCoverLetter ? 'Copied!' : 'Copy'}
                </Button>
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
              {optimizedResume ? (
                <>
                  <Textarea
                    value={optimizedResume.content}
                    readOnly
                    height={['xs', 'md', 'xl']}
                    resize="vertical"
                    p={2}
                    fontSize="sm"
                    bg="gray.800"
                    color="white"
                    borderRadius="md"
                    borderColor="gray.700"
                  />
                  <HStack spacing={2} mt={1} justify="center">
                    <Button
                      onClick={onCopyResume}
                      colorScheme='purple'
                      size="sm"
                    >
                      {hasCopiedResume ? 'Copied!' : 'Copy'}
                    </Button>
                  </HStack>
                </>
              ) : (
                <Text>No optimized resume found</Text>
              )}
            </VStack>
          </HStack>
        )}
      </BorderBox>
      <EditAlert coverLetter={!!coverLetter} />
    </>
  );
}
