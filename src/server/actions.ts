import { type Job, type CoverLetter, type User, type LnPayment, type OptimizedResume } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type GenerateCoverLetter,
  type CreateJob,
  type UpdateCoverLetter,
  type EditCoverLetter,
  type GenerateEdit,
  type UpdateJob,
  type UpdateUser,
  type DeleteJob,
  type StripePayment,
  type StripeGpt4Payment,
  type StripeCreditsPayment,
  type OptimizeResume,
  type EditResume
} from "wasp/server/operations";
import fetch from 'node-fetch';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY!, {
  apiVersion: '2023-08-16',
});

const DOMAIN = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

const gptConfig = {
  completeCoverLetter: `You are a cover letter generator.
You will be given a job description along with the job applicant's resume.
You will write a cover letter for the applicant that matches their past experiences from the resume with the job description. Write the cover letter in the same language as the job description provided!
Rather than simply outlining the applicant's past experiences, you will give more detail and explain how those experiences will help the applicant succeed in the new job.
Make it 3 to 4 paragraphs, the first one mainly talking about why the person would be a great fit for the company, the second one and maybe third about how the previous experience alligns with the company,
and the final one about final thoughts. Do not add a date to the Cover Letter.
Always write the cover letter at the same language as the job description you were sent!!!
You will write the cover letter in a modern, professional style without being too formal, as a modern employee might do naturally.`,
  coverLetterWithAWittyRemark: `You are a cover letter generator.
You will be given a job description along with the job applicant's resume.
You will write a cover letter for the applicant that matches their past experiences from the resume with the job description. Write the cover letter in the same language as the job description provided!
Rather than simply outlining the applicant's past experiences, you will give more detail and explain how those experiences will help the applicant succeed in the new job.
Make it 3 to 4 paragraphs, the first one mainly talking about why the person would be a great fit for the company, the second one and maybe third about how the previous experience alligns with the company,
and the final one about final thoughts. Do not add a date to the Cover Letter.
Always write the cover letter at the same language as the job description you were sent!!!
You will write the cover letter in a modern, relaxed style, as a modern employee might do naturally.
Include a job related joke at the end of the cover letter.`,
  ideasForCoverLetter:
    "You are a cover letter idea generator. You will be given a job description along with the job applicant's resume. You will generate a bullet point list of ideas for the applicant to use in their cover letter. ",
};

type OptimizeResumePayload = {
  resume: string;
  jobDescription: string;
  gptModel: string;
  lnPayment?: LnPayment;
  jobId: string;
};

type CoverLetterPayload = Pick<CoverLetter, 'title' | 'jobId'> & {
  content: string;
  description: string;
  company: string;
  location: string;
  isCompleteCoverLetter: boolean;
  includeWittyRemark: boolean;
  temperature: number;
  gptModel: string;
  lnPayment?: LnPayment;
};

type OpenAIResponse = {
  id: string;
  object: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: [
    {
      index: number;
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }
  ];
  error?: {
    message?: string;
  };
};

async function checkIfUserPaid({ context, lnPayment }: { context: any; lnPayment?: LnPayment }) {
  if (!context.user.hasPaid && !context.user.credits && !context.user.isUsingLn) {
    throw new HttpError(402, 'User must pay to continue');
  }
  if (context.user.subscriptionStatus === 'past_due') {
    throw new HttpError(402, 'Your subscription is past due. Please update your payment method.');
  }
  if (context.user.isUsingLn) {
    let invoiceStatus;
    if (lnPayment) {
      const lnPaymentInDB = await context.entities.LnPayment.findUnique({
        where: {
          pr: lnPayment.pr,
        },
      });
      invoiceStatus = lnPaymentInDB?.status;
    }
    console.table({ lnPayment, invoiceStatus });
    if (invoiceStatus !== 'success') {
      throw new HttpError(402, 'Your lightning payment has not been paid');
    }
  }
}

export const optimizeResume: OptimizeResume<OptimizeResumePayload, OptimizedResume> = async (
  { resume, jobDescription, lnPayment, gptModel, jobId },
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  await checkIfUserPaid({ context, lnPayment });

  const prompt = `You are a resume optimizer. Given a resume and a job description, rewrite the resume to better match the job description. 
    Write the resume in the same language as the job description provided, make sure to not mix languages on the titles, summary, skills, dates, education, etc!
    especially by aligning keywords and skills from the Summary and Skills section, still keep the skills from the original Resume like  
    technologies, languages, other skills, etc, unless they are completely unrelated to the job, and make sure that the resume aligns with the job title.
  
      Return ONLY a JSON object with the following structure, filling in all fields with the optimized content:

      {
        "name": "...",
        "title": "...",
        "location": "...",
        "email": "...",
        "summaryTitle": "...",
        "summary": "...",
        "skillsTitle": "...",
        "skills": ["...", "..."],
        "experienceTitle": "...",
        "experience": [
          {
            "role": "...",
            "company": "...",
            "period": "...",
            "description": "...",
            "bullets": ["...", "..."]
          }
        ],
        "educationTitle": "...",
        "education": {
          "degree": "...",
          "institution": "...",
          "period": "...",
          "details": "..."
        }
      }

      Do not include any explanation or extra text, only the JSON.`;

  const payload = {
    model: gptModel,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Resume: ${resume}\nJob Description: ${jobDescription}` }
    ],
    temperature: 0.5,
  };

  try {
    if (!context.user.hasPaid && !context.user.credits && !context.user.isUsingLn) {
      throw new HttpError(402, 'User has not paid or is out of credits');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const json : any = await response.json();
    if (json?.error) throw new HttpError(500, json?.error?.message || 'Something went wrong');

    const optimizedResume = json?.choices?.[0]?.message?.content;
    if (!optimizedResume) throw new HttpError(500, 'GPT returned an empty response');

    return await context.entities.OptimizedResume.create({
      data: {
        content: optimizedResume,
        originalResume: resume,
        jobDescription,
        createdAt: new Date(),
        user: { connect: { id: context.user.id } },
        job: { connect: { id: jobId } }
      },
    });
  } catch (error: any) {
    if (!context.user.hasPaid && error?.statusCode != 402) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: { credits: { increment: 1 } },
      });
    }
    console.error(error);
    throw new HttpError(error.statusCode || 500, error.message || 'Something went wrong');
  }
};

export const editResume: EditResume<{ optimizedResumeId: string; content: string; gptModel: string }, OptimizedResume> = async (
  { optimizedResumeId, content, gptModel},
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  // Prompt for GPT to parse the resume text into your JSON structure
  const prompt = `
You are a resume parser. Given the following resume text, return ONLY a JSON object with these exact fields:
{
  "name": "...",
  "title": "...",
  "location": "...",
  "email": "...",
  "summaryTitle": "...",
  "summary": "...",
  "skillsTitle": "...",
  "skills": ["...", "..."],
  "experienceTitle": "...",
  "experience": [
    {
      "role": "...",
      "company": "...",
      "period": "...",
      "description": "...",
      "bullets": ["...", "..."]
    }
  ],
  "educationTitle": "...",
  "education": {
    "degree": "...",
    "institution": "...",
    "period": "...",
    "details": "..."
  }
}
Use the section titles and content as provided, even if they are in another language. Do not include any explanation or extra text, only the JSON.

Resume:
${content}
`;

  const payload = {
    model: gptModel,
    messages: [
      { role: 'system', content: prompt }
    ],
    temperature: 0.2,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const json = await response.json() as OpenAIResponse;
  if (json?.error) throw new HttpError(500, json?.error?.message || 'Something went wrong');

  // Extract and parse the JSON from the AI's response
  let parsedContent;
  try {
    // Remove any leading/trailing code block markers if present
    let aiContent = json?.choices?.[0]?.message?.content?.trim();
    if (aiContent.startsWith('```json')) aiContent = aiContent.replace(/^```json/, '').replace(/```$/, '').trim();
    parsedContent = JSON.parse(aiContent);
  } catch (e) {
    throw new HttpError(400, "AI did not return valid JSON.");
  }

  return context.entities.OptimizedResume.update({
    where: {
      id: optimizedResumeId,
    },
    data: {
      content: JSON.stringify(parsedContent),
    },
  });
};

export const generateCoverLetter: GenerateCoverLetter<CoverLetterPayload, CoverLetter> = async (
  { jobId, title, company, location, content, description, isCompleteCoverLetter, includeWittyRemark, temperature, gptModel, lnPayment },
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  await checkIfUserPaid({ context, lnPayment })

  let command;
  if (isCompleteCoverLetter) {
    command = includeWittyRemark ? gptConfig.coverLetterWithAWittyRemark : gptConfig.completeCoverLetter;
  } else {
    command = gptConfig.ideasForCoverLetter;
  }

  console.log(' gpt model: ', gptModel, title, company, location);

  const payload = {
    model: gptModel,
    messages: [
      {
        role: 'system',
        content: command,
      },
      {
        role: 'user',
        content: `My Resume: ${content}.
          Job title: ${title}
          Company: ${company}
          Location: ${location}
          Job Description: ${description}`,
      },
    ],
    temperature,
  };

  let json: OpenAIResponse;

  try {
    if (!context.user.hasPaid && !context.user.credits && !context.user.isUsingLn) {
      throw new HttpError(402, 'User has not paid or is out of credits');
    } else if (context.user.credits && !context.user.hasPaid) {
      console.log('decrementing credits \n\n');
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    json = (await response.json()) as OpenAIResponse;

    if (json?.error) throw new HttpError(500, json?.error?.message || 'Something went wrong');

    return context.entities.CoverLetter.create({
      data: {
        title,
        content: json?.choices[0].message.content,
        tokenUsage: json?.usage.completion_tokens,
        user: { connect: { id: context.user.id } },
        job: { connect: { id: jobId } },
      },
    });
  } catch (error: any) {
    if (!context.user.hasPaid && error?.statusCode != 402) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            increment: 1,
          },
        },
      });
    }
    console.error(error);
    throw new HttpError(error.statusCode || 500, error.message || 'Something went wrong');
  }
};

export const generateEdit: GenerateEdit<
  { content: string; improvement: string; lnPayment?: LnPayment },
  string
> = async ({ content, improvement, lnPayment }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  await checkIfUserPaid({ context, lnPayment });

  let command;
  command = `You are a cover letter editor. You will be given a piece of isolated text from within a cover letter and told how you can improve it. Only respond with the revision. Make sure the revision is in the same language as the given isolated text.`;

  const payload = {
    model: context.user.gptModel === 'gpt-4' || context.user.gptModel === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: command,
      },
      {
        role: 'user',
        content: `Isolated text from within cover letter: ${content}. It should be improved by making it more: ${improvement}`,
      },
    ],
    temperature: 0.5,
  };

  let json: OpenAIResponse;

  try {
    if (!context.user.hasPaid && !context.user.credits && !context.user.isUsingLn) {
      throw new HttpError(402, 'User has not paid or is out of credits');
    } else if (context.user.credits && !context.user.hasPaid) {
      console.log('decrementing credits \n\n');
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    json = (await response.json()) as OpenAIResponse;
    if (json?.choices[0].message.content.length) {
      return json?.choices[0].message.content;
    } else {
      throw new HttpError(500, 'GPT returned an empty response');
    }
  } catch (error: any) {
    if (!context.user.hasPaid && error?.statusCode != 402) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            increment: 1,
          },
        },
      });
    }
    console.error(error);
    throw new HttpError(error.statusCode || 500, error.message || 'Something went wrong');
  }
};

export type JobPayload = Pick<Job, 'title' | 'company' | 'location' | 'description'>;

export const createJob: CreateJob<JobPayload, Job> = ({ title, company, location, description }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Job.create({
    data: {
      title,
      description,
      location,
      company,
      user: { connect: { id: context.user.id } },
    },
  });
};

export type UpdateJobPayload = Pick<Job, 'id' | 'title' | 'company' | 'location' | 'description' | 'isCompleted'>;

export const updateJob: UpdateJob<UpdateJobPayload, Job> = (
  { id, title, company, location, description, isCompleted },
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Job.update({
    where: {
      id,
    },
    data: {
      title,
      description,
      location,
      company,
      isCompleted,
    },
  });
};

export type UpdateCoverLetterPayload = Pick<Job, 'id' | 'description'> &
  Pick<CoverLetter, 'content'> & {
    isCompleteCoverLetter: boolean;
    includeWittyRemark: boolean;
    temperature: number;
    gptModel: string;
    lnPayment?: LnPayment;
  };

export const updateCoverLetter: UpdateCoverLetter<UpdateCoverLetterPayload, string> = async (
  { id, description, content, isCompleteCoverLetter, includeWittyRemark, temperature, gptModel, lnPayment },
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  await checkIfUserPaid({ context, lnPayment });

  const job = await context.entities.Job.findFirst({
    where: {
      id,
      user: { id: context.user.id },
    },
  });

  if (!job) {
    throw new HttpError(404, 'Job not found');
  }

  const coverLetter = await generateCoverLetter(
    {
      jobId: id,
      title: job.title,
      company: job.company,
      location: job.location,
      content,
      description: job.description,
      isCompleteCoverLetter,
      includeWittyRemark,
      temperature,
      gptModel,
      lnPayment,
    },
    context
  );

  await context.entities.Job.update({
    where: {
      id,
    },
    data: {
      description,
      coverLetter: { connect: { id: coverLetter.id } },
    },
  });

  return coverLetter.id;
};

export const editCoverLetter: EditCoverLetter<{ coverLetterId: string; content: string }, CoverLetter> = (
  { coverLetterId, content },
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.CoverLetter.update({
    where: {
      id: coverLetterId,
    },
    data: {
      content,
    },
  });
};

export const deleteJob: DeleteJob<{ jobId: string }, { count: number }> = ({ jobId }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  if (!jobId) {
    throw new HttpError(401);
  }

  return context.entities.Job.deleteMany({
    where: {
      id: jobId,
      userId: context.user.id,
    },
  });
};

type UpdateUserArgs = Partial<Pick<User, 'id' | 'notifyPaymentExpires' | 'gptModel'>>;
type UserWithoutPassword = Omit<User, 'password'>;

export const updateUser: UpdateUser<UpdateUserArgs, UserWithoutPassword> = async (
  { notifyPaymentExpires, gptModel },
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.User.update({
    where: {
      id: context.user.id,
    },
    data: {
      notifyPaymentExpires,
      gptModel,
    },
    select: {
      id: true,
      email: true,
      username: true,
      hasPaid: true,
      datePaid: true,
      notifyPaymentExpires: true,
      checkoutSessionId: true,
      stripeId: true,
      credits: true,
      gptModel: true,
      isUsingLn: true,
      subscriptionStatus: true,
    },
  });
};

type UpdateUserResult = Pick<User, 'id' | 'email' | 'hasPaid'>;

function dontUpdateUser(user: UserWithoutPassword): Promise<UserWithoutPassword> {
  return new Promise((resolve) => {
    resolve(user);
  });
}

type StripePaymentResult = {
  sessionUrl: string | null;
  sessionId: string;
};

export const stripePayment: StripePayment<void, StripePaymentResult> = async (_args, context) => {
  if (!context.user || !context.user.email) {
    throw new HttpError(401, 'User or email not found');
  }
  let customer: Stripe.Customer;
  const stripeCustomers = await stripe.customers.list({
    email: context.user.email,
  });
  if (!stripeCustomers.data.length) {
    console.log('creating customer');
    customer = await stripe.customers.create({
      email: context.user.email,
    });
  } else {
    console.log('using existing customer');
    customer = stripeCustomers.data[0];
  }

  const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: process.env.PRODUCT_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${DOMAIN}/checkout?success=true`,
    cancel_url: `${DOMAIN}/checkout?canceled=true`,
    automatic_tax: { enabled: false },
    customer_update: {
      address: 'auto',
    },
    customer: customer.id,
  });

  await context.entities.User.update({
    where: {
      id: context.user.id,
    },
    data: {
      checkoutSessionId: session?.id ?? null,
      stripeId: customer.id ?? null,
    },
  });

  return new Promise((resolve, reject) => {
    if (!session) {
      reject(new HttpError(402, 'Could not create a Stripe session'));
    } else {
      resolve({
        sessionUrl: session.url,
        sessionId: session.id,
      });
    }
  });
};

export const stripeGpt4Payment: StripeGpt4Payment<void, StripePaymentResult> = async (_args, context) => {
  if (!context.user || !context.user.email) {
    throw new HttpError(401, 'User or email not found');
  }
  let customer: Stripe.Customer;
  const stripeCustomers = await stripe.customers.list({
    email: context.user.email,
  });
  if (!stripeCustomers.data.length) {
    console.log('creating customer');
    customer = await stripe.customers.create({
      email: context.user.email,
    });
  } else {
    console.log('using existing customer');
    customer = stripeCustomers.data[0];
  }

  const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: process.env.GPT4_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${DOMAIN}/checkout?success=true`,
    cancel_url: `${DOMAIN}/checkout?canceled=true`,
    automatic_tax: { enabled: false },
    customer_update: {
      address: 'auto',
    },
    customer: customer.id,
  });

  await context.entities.User.update({
    where: {
      id: context.user.id,
    },
    data: {
      checkoutSessionId: session?.id ?? null,
      stripeId: customer.id ?? null,
    },
  });

  return new Promise((resolve, reject) => {
    if (!session) {
      reject(new HttpError(402, 'Could not create a Stripe session'));
    } else {
      resolve({
        sessionUrl: session.url,
        sessionId: session.id,
      });
    }
  });
};

export const stripeCreditsPayment: StripeCreditsPayment<void, StripePaymentResult> = async (_args, context) => {
  if (!context.user || !context.user.email) {
    throw new HttpError(401, 'User or email not found');
  }
  let customer: Stripe.Customer;
  const stripeCustomers = await stripe.customers.list({
    email: context.user.email,
  });
  if (!stripeCustomers.data.length) {
    console.log('creating customer');
    customer = await stripe.customers.create({
      email: context.user.email,
    });
  } else {
    console.log('using existing customer');
    customer = stripeCustomers.data[0];
  }

  const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: process.env.PRODUCT_CREDITS_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${DOMAIN}/checkout?credits=true`,
    cancel_url: `${DOMAIN}/checkout?canceled=true`,
    automatic_tax: { enabled: false },
    customer_update: {
      address: 'auto',
    },
    customer: customer.id,
  });

  await context.entities.User.update({
    where: {
      id: context.user.id,
    },
    data: {
      stripeId: customer.id ?? null,
    },
  });

  return new Promise((resolve, reject) => {
    if (!session) {
      reject(new HttpError(402, 'Could not create a Stripe session'));
    } else {
      resolve({
        sessionUrl: session.url,
        sessionId: session.id,
      });
    }
  });
};



