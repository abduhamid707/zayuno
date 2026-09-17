import { type NormalizedAction, type PublicAction } from '@zayuno/contracts';
import { toPublicAction } from '@zayuno/shared';

/**
 * Public HTTP action routes share this projection boundary so internal
 * persistence/provider fields cannot be reintroduced through one endpoint.
 */
export function projectPublicAction(action: NormalizedAction): PublicAction {
  return toPublicAction(action);
}

export function projectPublicActions(actions: readonly NormalizedAction[]): PublicAction[] {
  return actions.map(projectPublicAction);
}
