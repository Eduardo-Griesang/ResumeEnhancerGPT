import { VStack, HStack, Text, Link, Divider } from '@chakra-ui/react';
import { FaGithub, FaLinkedinIn } from 'react-icons/fa';
import { Link as WaspLink } from 'wasp/client/router';

export function Footer() {
  return (
    <VStack width='full' py={5} textAlign='center' gap={4}>
      <Divider />
      <VStack gap={3}>
        <Link href='https://github.com/Eduardo-Griesang/coverlettergpt-main' color='brand.300' target='_blank'>
          <HStack justify='center'>
            <FaGithub />
            <Text fontSize='sm' color='brand.300'>
              Built with Wasp & 100% Open-Source
            </Text>
          </HStack>
        </Link>

        <Link href='https://www.linkedin.com/in/eduardo-griesang/' target='_blank' color='brand.300'>
          <HStack justify='center'>
            <FaLinkedinIn />
            <Text fontSize='sm' color='brand.300'>
              Let's connect on LinkedIn
            </Text>
          </HStack>
        </Link>
        <WaspLink to='/tos'>
          <Text fontSize='sm' color='brand.300'>
            Terms of Service
          </Text>
        </WaspLink>
        <WaspLink to='/privacy'>
          <Text fontSize='sm' color='brand.300'>
            Privacy Policy
          </Text>
        </WaspLink>
      </VStack>
    </VStack>
  );
}
