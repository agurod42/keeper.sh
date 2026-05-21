import { describe, it, expect } from "vitest";
import { encryptPassword, decryptPassword } from "../src/encryption";
import { encodeBase64 } from "tweetnacl-util";
import { randomBytes, secretbox } from "tweetnacl";

describe("encryption", () => {
  const validKey = encodeBase64(randomBytes(secretbox.keyLength));

  it("encrypts and decrypts a password successfully", () => {
    const password = "my-secret-password";
    const encrypted = encryptPassword(password, validKey);
    
    expect(encrypted).toContain(":");
    
    const decrypted = decryptPassword(encrypted, validKey);
    expect(decrypted).toBe(password);
  });

  it("throws error for invalid key length", () => {
    const invalidKey = encodeBase64(randomBytes(16)); // too short
    expect(() => encryptPassword("pass", invalidKey)).toThrow("Encryption key must be 32 bytes");
  });

  it("throws error for invalid encrypted data format", () => {
    expect(() => decryptPassword("invalid-format", validKey)).toThrow("Invalid encrypted data format");
  });

  it("throws error if decryption fails (e.g. wrong key)", () => {
    const anotherKey = encodeBase64(randomBytes(secretbox.keyLength));
    const encrypted = encryptPassword("pass", validKey);
    expect(() => decryptPassword(encrypted, anotherKey)).toThrow("Decryption failed");
  });
});
