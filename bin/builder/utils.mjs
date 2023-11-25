import path from "node:path";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * Hashes of assets to use for HTML integrity
 * @type {Map<string, string>}
 */
export const fileIntegrities = new Map();

/**
 * Normalize a path into a relative path usable in HTML
 * @param {string} base The root directory of the website
 * @param {string} file The path to the file
 * @returns {string} A normalized relative path
 */
export function relativePath(base, file) {
  return "/" + path.normalize(path.relative(base, file));
}

/**
 * Calculate integrity
 * @param {crypto.BinaryLike} content
 * @returns {string}
 */
export function calculateIntegrity(content) {
  const hash = crypto.createHash("sha512");
  hash.update(content);
  return "sha512-" + hash.digest("base64");
}

/**
 * Read a file and store its integrity in {@link fileIntegrity}
 * @param {string} build_dir Path to the build directory
 * @param {string} file Path to the file being hashed
 */
export function calculateAndSaveIntegrity(build_dir, file) {
  fileIntegrities.set(
    relativePath(build_dir, file),
    calculateIntegrity(readFileSync(file))
  );
}
