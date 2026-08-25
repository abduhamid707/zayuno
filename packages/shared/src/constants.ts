/**
 * Authoritative constants for Zayuno platform integrations.
 */

export const DEFAULT_OPENAI_APPS_CHALLENGE_TOKEN = 'e6VxyvQ2NNxoSqMFTivLNHwd2Zfi1SIkU3GP_VrfL4s';

export function getOpenAiAppsChallengeToken(): string {
  return (process.env.OPENAI_APPS_CHALLENGE_TOKEN || DEFAULT_OPENAI_APPS_CHALLENGE_TOKEN).trim();
}
