/**
 * Missing files in the disk cache are an answer, not an error: an eviction
 * may remove a cached file at any time.
 */

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * The result of a file system call, or `null` when its path does not exist.
 * Any other failure is rethrown.
 */
export async function nullIfMissing<T>(
  operation: Promise<T>,
): Promise<T | null> {
  try {
    return await operation;
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}
