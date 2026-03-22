import { describe, it, expect } from "vitest";
import { AuthError, NotFoundError, ApiError, NetworkError, ConfigError } from "./errors.js";

describe("Error classes", () => {
  it.each([
    { Class: AuthError, code: 1, name: "AuthError" },
    { Class: NotFoundError, code: 2, name: "NotFoundError" },
    { Class: ApiError, code: 3, name: "ApiError" },
    { Class: NetworkError, code: 4, name: "NetworkError" },
    { Class: ConfigError, code: 5, name: "ConfigError" },
  ])("$name has exitCode $code", ({ Class, code, name }) => {
    const err = new Class("test message");
    expect(err.message).toBe("test message");
    expect(err.exitCode).toBe(code);
    expect(err.name).toBe(name);
    expect(err).toBeInstanceOf(Error);
  });

  it("ApiError stores statusCode", () => {
    const err = new ApiError("bad request", 400);
    expect(err.statusCode).toBe(400);
  });

  it("NetworkError stores url", () => {
    const err = new NetworkError("timeout", "https://example.com/api");
    expect(err.url).toBe("https://example.com/api");
  });
});
