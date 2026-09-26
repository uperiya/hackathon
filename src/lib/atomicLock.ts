/**
 * Mutex lock for atomic transactional operations.
 * Prevents async concurrency race conditions in single-threaded environments
 * while Firestore runTransaction provides cloud-level optimistic concurrency control.
 */
export class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });

    const current = this.queue;
    this.queue = current.then(() => next);

    await current;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export const stockTransactionMutex = new AsyncMutex();
