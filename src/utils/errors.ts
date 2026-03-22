/**
 * Base class for all CLI errors. Subclasses declare a specific `exitCode`
 * that the process uses when terminating after the error is caught.
 */
abstract class CliError extends Error {
  /** Process exit code that identifies the error category. */
  abstract readonly exitCode: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when the API rejects a request due to missing or invalid credentials.
 * Exits with code 1.
 */
export class AuthError extends CliError {
  readonly exitCode = 1;
}

/**
 * Thrown when a requested resource does not exist (HTTP 404).
 * Exits with code 2.
 */
export class NotFoundError extends CliError {
  readonly exitCode = 2;
}

/**
 * Thrown when the API returns an error HTTP status (4xx/5xx).
 * Exits with code 3.
 */
export class ApiError extends CliError {
  readonly exitCode = 3;
  /**
   * @param message - Human-readable error description from the API or a generic fallback.
   * @param statusCode - HTTP status code returned by the server, if available.
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}

/**
 * Thrown when a network-level failure prevents the request from completing
 * (e.g. DNS failure, connection refused, request timeout).
 * Exits with code 4.
 */
export class NetworkError extends CliError {
  readonly exitCode = 4;
  /**
   * @param message - Human-readable description of the network failure.
   * @param url - The URL that was being requested when the error occurred.
   */
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message);
  }
}

/**
 * Thrown when the local CLI configuration is missing or invalid
 * (e.g. no active context, required field absent).
 * Exits with code 5.
 */
export class ConfigError extends CliError {
  readonly exitCode = 5;
}

export type { CliError };
