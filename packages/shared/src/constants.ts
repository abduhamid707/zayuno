/**
 * Authoritative constants for Zayuno platform integrations.
 */

export const DEFAULT_OPENAI_APPS_CHALLENGE_TOKEN = 'EVEW8GwWNVKe1uuYBHLPl36l8t-Fh7Xt_Vth2uS7304';

export function getOpenAiAppsChallengeToken(): string {
  return (process.env.OPENAI_APPS_CHALLENGE_TOKEN || DEFAULT_OPENAI_APPS_CHALLENGE_TOKEN).trim();
}
