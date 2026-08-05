import { randomInt } from "crypto"

/**
 * Generate a cryptographically random password of the given length.
 * Uses node:crypto.randomInt under the hood — uniformly distributed over
 * [min, max) via rejection sampling, so there's no modulo bias.
 *
 * Charset is 26 + 26 + 10 + 10 = 72 symbols. 12 characters of this
 * gives ~70 bits of entropy; well above the 60-bit minimum for online
 * brute-force resistance.
 */
export function generatePassword(length: number = 12): string {
    const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
        password += charset.charAt(randomInt(0, charset.length))
    }
    return password
}
