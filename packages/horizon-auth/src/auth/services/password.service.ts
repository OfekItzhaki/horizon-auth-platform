import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  private readonly ARGON2_OPTIONS = {
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 4,    // 4 threads
  };

  /**
   * Hash a plaintext password using Argon2id
   * @param password - Plaintext password
   * @returns Argon2id hash string
   */
  async hash(password: string): Promise<string> {
    return hash(password, this.ARGON2_OPTIONS);
  }

  /**
   * Verify a password against an Argon2id hash
   * @param password - Plaintext password
   * @param hashedPassword - Argon2id hash to verify against
   * @returns True if password matches, false otherwise
   */
  async verify(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await verify(hashedPassword, password);
    } catch (error) {
      // If verification fails (invalid hash format, etc.), return false
      return false;
    }
  }

  /**
   * Check if a hash is bcrypt format (for migration support)
   * @param hash - Hash string to check
   * @returns True if hash is bcrypt format
   */
  isBcryptHash(hash: string): boolean {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    return /^\$2[aby]\$/.test(hash);
  }

  /**
   * Verify bcrypt hash and rehash with Argon2id
   * This method is used for gradual migration from bcrypt to Argon2id
   * @param password - Plaintext password
   * @param bcryptHash - Existing bcrypt hash
   * @returns Object with verification result and new Argon2id hash if successful
   */
  async verifyAndMigrate(
    password: string,
    bcryptHash: string,
  ): Promise<{ isValid: boolean; newHash?: string }> {
    // For bcrypt migration, we would need bcrypt library
    // This is a placeholder that will be implemented when bcrypt is added as optional dependency
    throw new Error(
      'Bcrypt migration not yet implemented. Install bcrypt package to enable migration.',
    );
  }
}
