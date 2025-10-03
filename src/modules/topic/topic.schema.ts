// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Topic
// ============================================================================

/**
 * Zod schema for creating a new topic.
 */
export const createTopicSchema = z.object({
  /**
   * The description of the topic.
   */
  description: z
    .string()
    .min(1, 'The description must contain at least one character.'),
});

/**
 * Zod schema for updating a topic.
 * All fields are optional for partial updates (PATCH).
 */
export const updateTopicSchema = createTopicSchema.partial();