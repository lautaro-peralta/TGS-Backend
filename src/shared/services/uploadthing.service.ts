// ============================================================================
// UPLOADTHING SERVICE - File upload service for product images
// ============================================================================

import { UTApi } from 'uploadthing/server';
import { env } from '../../config/env.js';
import logger from '../utils/logger.js';

/**
 * MIME type mapping for common image formats
 */
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/**
 * File upload response from UploadThing API
 */
export interface UploadFileResponse {
  url: string;
  key: string;
  name: string;
  size: number;
}

/**
 * Usage statistics from UploadThing
 */
export interface UsageStats {
  totalBytes: number;
  totalGB: string;
  filesUploaded: number;
  appId: string;
  limitGB: number;
  usagePercentage: string;
}

/**
 * File upload service using UploadThing
 * Provides secure file upload, deletion, and usage tracking
 */
export class UploadThingService {
  private utapi: UTApi | null = null;
  private isEnabled: boolean = false;

  /**
   * Initializes the UploadThing service
   */
  initialize(): void {
    try {
      if (!env.UPLOADTHING_SECRET) {
        logger.warn(
          'UPLOADTHING_SECRET not configured. File upload service will be disabled.'
        );
        this.isEnabled = false;
        return;
      }

      this.utapi = new UTApi({
        token: env.UPLOADTHING_SECRET,
      });

      this.isEnabled = true;
      logger.info('UploadThing service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize UploadThing service');
      this.isEnabled = false;
    }
  }

  /**
   * Checks if the service is enabled and ready to use
   */
  private ensureEnabled(): void {
    if (!this.isEnabled || !this.utapi) {
      throw new Error(
        'UploadThing service is not enabled. Please configure UPLOADTHING_SECRET.'
      );
    }
  }

  /**
   * Uploads a single file to UploadThing
   * @param file - Buffer of the file to upload
   * @param filename - Original filename
   * @returns URL and metadata of the uploaded file
   */
  async uploadFile(
    file: Buffer,
    filename: string
  ): Promise<UploadFileResponse> {
    this.ensureEnabled();

    try {
      const mimeType = this.getMimeType(filename);
      const blob = new File([file], filename, { type: mimeType });

      logger.debug(`Uploading file: ${filename} (${mimeType})`);

      const response = await this.utapi!.uploadFiles(blob);

      if (response.error) {
        throw new Error(`Upload failed: ${response.error.message}`);
      }

      logger.info(`File uploaded successfully: ${response.data.url}`);

      return {
        url: response.data.url,
        key: response.data.key,
        name: response.data.name,
        size: response.data.size,
      };
    } catch (error) {
      logger.error('Error uploading file to UploadThing');
      throw error;
    }
  }

  /**
   * Uploads multiple files in parallel
   * @param files - Array of files with buffer and filename
   * @returns Array of upload responses
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string }>
  ): Promise<UploadFileResponse[]> {
    this.ensureEnabled();

    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    logger.debug(`Uploading ${files.length} files`);

    const uploadPromises = files.map((file) =>
      this.uploadFile(file.buffer, file.filename)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Deletes a file from UploadThing
   * @param fileKey - The file key (can be extracted from URL or provided directly)
   */
  async deleteFile(fileKey: string): Promise<void> {
    this.ensureEnabled();

    try {
      logger.debug(`Deleting file with key: ${fileKey}`);
      await this.utapi!.deleteFiles(fileKey);
      logger.info(`File deleted successfully: ${fileKey}`);
    } catch (error) {
      logger.error(`Error deleting file ${fileKey}`);
      throw error;
    }
  }

  /**
   * Deletes multiple files in parallel
   * @param fileKeys - Array of file keys to delete
   */
  async deleteMultipleFiles(fileKeys: string[]): Promise<void> {
    this.ensureEnabled();

    if (!fileKeys || fileKeys.length === 0) {
      logger.debug('No files to delete');
      return;
    }

    logger.debug(`Deleting ${fileKeys.length} files`);

    const deletePromises = fileKeys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);

    logger.info(`Successfully deleted ${fileKeys.length} files`);
  }

  /**
   * Gets usage statistics from UploadThing
   * @returns Usage information including total storage and file count
   */
  async getUsageStats(): Promise<UsageStats | null> {
    this.ensureEnabled();

    try {
      const usage = await this.utapi!.getUsageInfo();

      const totalGB = (usage.totalBytes / 1024 ** 3).toFixed(2);
      const limitGB = 2; // Free tier limit is 2GB
      const usagePercentage = ((parseFloat(totalGB) / limitGB) * 100).toFixed(
        2
      );

      return {
        totalBytes: usage.totalBytes,
        totalGB,
        filesUploaded: usage.filesUploaded,
        appId: 'N/A',
        limitGB,
        usagePercentage: `${usagePercentage}%`,
      };
    } catch (error) {
      logger.error('Error fetching UploadThing usage stats');
      return null;
    }
  }

  /**
   * Extracts the file key from an UploadThing URL
   * URL format: https://utfs.io/f/FILE_KEY
   * @param url - The full UploadThing URL
   * @returns The file key
   */
  extractFileKey(url: string): string {
    const match = url.match(/\/f\/([^/?]+)/);

    if (!match) {
      throw new Error(
        'Invalid UploadThing URL format. Expected: https://utfs.io/f/FILE_KEY'
      );
    }

    return match[1];
  }

  /**
   * Extracts file keys from multiple URLs
   * @param urls - Array of UploadThing URLs
   * @returns Array of file keys
   */
  extractFileKeys(urls: string[]): string[] {
    return urls.map((url) => this.extractFileKey(url));
  }

  /**
   * Gets the MIME type for a file based on its extension
   * @param filename - The filename with extension
   * @returns MIME type string
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (!ext) {
      return 'application/octet-stream';
    }

    return MIME_TYPES[ext] || 'application/octet-stream';
  }

  /**
   * Checks if the service is currently enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const uploadThingService = new UploadThingService();
