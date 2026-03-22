abstract class CliError extends Error {
  abstract readonly exitCode: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthError extends CliError {
  readonly exitCode = 1;
}

export class NotFoundError extends CliError {
  readonly exitCode = 2;
}

export class ApiError extends CliError {
  readonly exitCode = 3;
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}

export class NetworkError extends CliError {
  readonly exitCode = 4;
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message);
  }
}

export class ConfigError extends CliError {
  readonly exitCode = 5;
}

export type { CliError };
