/** Return actionable client errors while hiding server implementation details. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { statusCode?: unknown; message?: unknown } | null
  const statusCode = Number(candidate?.statusCode)
  if (statusCode >= 400 && statusCode < 500 && typeof candidate?.message === 'string') {
    return candidate.message
  }
  return fallback
}
