/**
 * CDSS V3 - Sandboxed Document Parser Client
 *
 * Orchestrates execution of the document parser in an isolated Docker container.
 * Communication happens via shared volume (no HTTP, no network).
 *
 * Security constraints enforced:
 * - --network none (NO network access)
 * - --read-only (read-only root filesystem)
 * - --tmpfs /tmp:size=50M (writable temp only)
 * - --memory 512m (memory limit)
 * - --cpus 1 (CPU limit)
 * - --user 1000:1000 (non-root user)
 * - Container destroyed after each job (--rm)
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import logger from '@/lib/logger';

// Configuration from environment
const SHARED_VOLUME = process.env.PARSER_SHARED_VOLUME || '/data/parser-jobs';
const PARSER_IMAGE = process.env.PARSER_IMAGE || 'holilabs/document-parser:latest';
const PARSER_TIMEOUT_MS = parseInt(process.env.PARSER_TIMEOUT_MS || '120000', 10); // 2 minutes
const PARSER_MEMORY_LIMIT = process.env.PARSER_MEMORY_LIMIT || '512m';
const PARSER_CPU_LIMIT = process.env.PARSER_CPU_LIMIT || '1';

/**
 * Parsed content result from the sandboxed parser
 */
export interface ParsedContent {
  success: boolean;
  pageCount?: number;
  text?: string;
  tables?: Array<{
    page: number;
    data: string[][];
  }>;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  };
  sections?: Array<{
    name: string;
    startIndex: number;
    endIndex: number;
    detected: boolean;
  }>;
  contentHash?: string;
  warnings?: string[];
  error?: string;
  parsedAt?: string;
}

/**
 * Options for the SandboxClient
 */
export interface SandboxClientOptions {
  /** Custom shared volume path */
  sharedVolume?: string;
  /** Custom Docker image */
  image?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Memory limit (e.g., '512m') */
  memoryLimit?: string;
  /** CPU limit (e.g., '1') */
  cpuLimit?: string;
}

/**
 * SandboxClient - Orchestrates sandboxed document parsing
 *
 * Flow:
 * 1. Create job directory in shared volume
 * 2. Copy input file to shared volume
 * 3. Run sandboxed container (no network, limited resources)
 * 4. Read output from shared volume
 * 5. Clean up job directory
 */
export class SandboxClient {
  private sharedVolume: string;
  private image: string;
  private timeoutMs: number;
  private memoryLimit: string;
  private cpuLimit: string;

  constructor(options: SandboxClientOptions = {}) {
    this.sharedVolume = options.sharedVolume || SHARED_VOLUME;
    this.image = options.image || PARSER_IMAGE;
    this.timeoutMs = options.timeoutMs || PARSER_TIMEOUT_MS;
    this.memoryLimit = options.memoryLimit || PARSER_MEMORY_LIMIT;
    this.cpuLimit = options.cpuLimit || PARSER_CPU_LIMIT;
  }

  /**
   * Parse a document using the sandboxed parser
   *
   * @param inputFilePath - Path to the input file
   * @returns Parsed content result
   */
  async parseDocument(inputFilePath: string): Promise<ParsedContent> {
    const jobId = crypto.randomUUID();
    const jobDir = path.join(this.sharedVolume, jobId);
    const inputPath = path.join(jobDir, 'input.pdf');
    const outputPath = path.join(jobDir, 'output.json');

    logger.info({
      event: 'sandbox_parse_start',
      jobId,
      inputFilePath,
      image: this.image,
    });

    try {
      // 1. Create job directory
      await fs.mkdir(jobDir, { recursive: true });

      // 2. Copy input file to shared volume
      await fs.copyFile(inputFilePath, inputPath);

      // 3. Run sandboxed container
      await this.runSandboxedContainer(jobId, inputPath, outputPath);

      // 4. Read output from shared volume
      const outputContent = await fs.readFile(outputPath, 'utf-8');
      const result: ParsedContent = JSON.parse(outputContent);

      logger.info({
        event: 'sandbox_parse_complete',
        jobId,
        success: result.success,
        pageCount: result.pageCount,
        warnings: result.warnings?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error({
        event: 'sandbox_parse_error',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        warnings: ['Container execution failed'],
      };
    } finally {
      // 5. Clean up job directory
      try {
        await fs.rm(jobDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn({
          event: 'sandbox_cleanup_error',
          jobId,
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Run the sandboxed container with security constraints
   */
  private async runSandboxedContainer(
    jobId: string,
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const jobDir = path.dirname(inputPath);

      // Docker run arguments with security constraints
      const args = [
        'run',
        '--rm', // Remove container after exit
        '--network', 'none', // NO network access (CRITICAL)
        '--read-only', // Read-only root filesystem
        '--tmpfs', '/tmp:size=50M', // Writable /tmp only
        '--memory', this.memoryLimit, // Memory limit
        '--cpus', this.cpuLimit, // CPU limit
        '--user', '1000:1000', // Non-root user
        '--security-opt', 'no-new-privileges', // Prevent privilege escalation
        '-v', `${jobDir}:/job:rw`, // Mount job directory
        this.image,
        'python', '/app/parse.py', '/job/input.pdf', '/job/output.json',
      ];

      logger.debug({
        event: 'sandbox_container_start',
        jobId,
        args: args.join(' '),
      });

      const process: ChildProcess = spawn('docker', args);

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        logger.error({
          event: 'sandbox_timeout',
          jobId,
          timeoutMs: this.timeoutMs,
        });
        reject(new Error(`Document parsing timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      process.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          logger.debug({
            event: 'sandbox_container_success',
            jobId,
            exitCode: code,
          });
          resolve();
        } else {
          logger.error({
            event: 'sandbox_container_failed',
            jobId,
            exitCode: code,
            stderr: stderr.slice(0, 1000), // Limit stderr size
          });
          reject(new Error(`Parser exited with code ${code}: ${stderr.slice(0, 500)}`));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        logger.error({
          event: 'sandbox_spawn_error',
          jobId,
          error: err.message,
        });
        reject(err);
      });
    });
  }

  /**
   * Check if Docker and the parser image are available
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Check Docker daemon
      const dockerCheck = spawn('docker', ['info']);
      await new Promise<void>((resolve, reject) => {
        dockerCheck.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Docker daemon not available'));
        });
        dockerCheck.on('error', reject);
      });

      // Check if image exists
      const imageCheck = spawn('docker', ['image', 'inspect', this.image]);
      await new Promise<void>((resolve, reject) => {
        imageCheck.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Parser image not found: ${this.image}`));
        });
        imageCheck.on('error', reject);
      });

      // Check shared volume exists
      await fs.access(this.sharedVolume);

      return {
        healthy: true,
        message: 'Sandbox parser is ready',
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure shared volume directory exists
   */
  async ensureSharedVolume(): Promise<void> {
    await fs.mkdir(this.sharedVolume, { recursive: true });
  }
}

// Export singleton instance for convenience
let sandboxClientInstance: SandboxClient | null = null;

export function getSandboxClient(): SandboxClient {
  if (!sandboxClientInstance) {
    sandboxClientInstance = new SandboxClient();
  }
  return sandboxClientInstance;
}
