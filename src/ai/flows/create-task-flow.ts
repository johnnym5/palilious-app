'use server';
/**
 * @fileOverview An AI flow for creating tasks from natural language.
 *
 * - createTaskFromNaturalLanguage - A function that handles parsing a user's text to create a structured task.
 * - CreateTaskInputSchema - The input type for the flow.
 * - CreateTaskOutputSchema - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const CreateTaskInputSchema = z.string();
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const CreateTaskOutputSchema = z.object({
  title: z.string().describe('The title of the task.'),
  description: z.string().describe('A detailed description for the task.'),
  priority: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']).describe('The priority of the task.'),
  dueDate: z.string().optional().describe('The due date of the task in YYYY-MM-DD ISO format.'),
});
export type CreateTaskOutput = z.infer<typeof CreateTaskOutputSchema>;


const createTaskPrompt = ai.definePrompt({
  name: 'createTaskPrompt',
  input: { schema: CreateTaskInputSchema },
  output: { schema: CreateTaskOutputSchema },
  prompt: `You are a task creation assistant for an internal company tool called Palilious.
Your job is to parse a user's natural language request and convert it into a structured task object.

Today's date is ${new Date().toLocaleDateString()}. Use this to correctly interpret relative dates like "tomorrow" or "next Friday".

Analyze the user's request and extract the following information:
- A concise title for the task.
- A detailed description.
- A priority level. The available levels are LEVEL_1 (Low), LEVEL_2 (Medium), and LEVEL_3 (High). Infer the priority based on the user's language (e.g., "urgent", "asap" implies LEVEL_3). Default to LEVEL_1 if unsure.
- A due date in YYYY-MM-DD format.

User Request: {{{input}}}
`,
});

const createTaskFlow = ai.defineFlow(
  {
    name: 'createTaskFlow',
    inputSchema: CreateTaskInputSchema,
    outputSchema: CreateTaskOutputSchema,
  },
  async (input) => {
    const {output} = await createTaskPrompt(input);
    return output!;
  }
);

export async function createTaskFromNaturalLanguage(input: CreateTaskInput): Promise<CreateTaskOutput> {
  return createTaskFlow(input);
}
