'use server';
/**
 * @fileOverview An AI flow for creating tasks from natural language.
 *
 * - createTaskFromText - A function that parses a string into a structured task.
 * - CreateTaskInput - The input type for the flow.
 * - CreateTaskOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const CreateTaskInputSchema = z.object({
  text: z.string().describe('The natural language text describing the task.'),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const CreateTaskOutputSchema = z.object({
  title: z.string().describe('A concise title for the task.'),
  description: z.string().optional().describe('A detailed description for the task if available.'),
  priority: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]).optional().describe('The priority of the task. LEVEL_1 is Low, LEVEL_2 is Medium, LEVEL_3 is High. Default to LEVEL_1 if not specified.'),
  dueDate: z.string().optional().describe('The due date and time for the task in ISO 8601 format. If a time is not specified, default to the end of the specified day.'),
});
export type CreateTaskOutput = z.infer<typeof CreateTaskOutputSchema>;

export async function createTaskFromText(input: CreateTaskInput): Promise<CreateTaskOutput> {
  return createTaskFlow(input);
}

const PromptInputSchema = CreateTaskInputSchema.extend({
    currentDateTime: z.string(),
});

const createTaskPrompt = ai.definePrompt({
  name: 'createTaskPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: CreateTaskOutputSchema },
  prompt: `You are an intelligent task creation assistant. Your job is to parse a natural language string and extract structured information to create a task.

  Current Date/Time for reference: {{{currentDateTime}}}

  Analyze the following text and determine the title, description, priority, and due date.
  - If no priority is mentioned, default to LEVEL_1 (Low). Use context like "urgent" or "asap" for LEVEL_3 (High).
  - If a due date or time is mentioned (e.g., "tomorrow", "end of week", "next Friday at 2pm"), convert it to a precise ISO 8601 string.
  - The title should be a concise action item.
  - Use the description for any extra details.

  Text to parse: {{{text}}}
  `,
});

const createTaskFlow = ai.defineFlow(
  {
    name: 'createTaskFlow',
    inputSchema: CreateTaskInputSchema,
    outputSchema: CreateTaskOutputSchema,
  },
  async (input) => {
    const { output } = await createTaskPrompt({
        ...input,
        currentDateTime: new Date().toISOString()
    });
    return output!;
  }
);
