import Anthropic from '@anthropic-ai/sdk';

export const CLAUDE_MODEL = 'claude-opus-5-5';

/** Server-side fallback re-runs a safety-declined request on a recommended model. */
export function fallbackOptions() {
  return {
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
  };
}

/** Reads ANTHROPIC_API_KEY from the environment (apps/api/.env). */
export function createClaude(): Anthropic {
  return new Anthropic();
}
