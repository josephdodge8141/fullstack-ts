export interface ConnectionLifecycle {
  close(): Promise<void>;
}

/**
 * The starter has no external dependency, but its lifecycle is explicit so
 * later services can receive and close config-owned connections.
 */
export function createConnections(): ConnectionLifecycle {
  return {
    close: async (): Promise<void> => undefined,
  };
}
