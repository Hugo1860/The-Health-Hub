import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { stat, unlink } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';

export interface AudioProcessingOptions {
  inputFormat: string;
  outputFormat: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  quality: 'high' | 'medium' | 'low';
  normalize: boolean;
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  processingTime: number;
  error?: string;
}

export class AudioProcessor {
  private static instance: AudioProcessor;
  private processingQueue: Map<string, Promise<ProcessingResult>> = new Map();
  private tempDir: string;

  static getInstance(): AudioProcessor {
    if (!AudioProcessor.instance) {
      AudioProcessor.instance = new AudioProcessor();
    }
    return AudioProcessor.instance;
  }

  constructor() {
    this.tempDir = join(process.cwd(), 'temp', 'audio-processing');
    this.ensureTempDirectory();
  }

  /**
   * 确保临时目录存在
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * 处理音频文件
   */
  async processAudio(
    inputPath: string,
    options: AudioProcessingOptions
  ): Promise<ProcessingResult> {
    const processingId = this.generateProcessingId(inputPath, options);
    
    // 检查是否已经在处理中
    if (this.processingQueue.has(processingId)) {
      return this.processingQueue.get(processingId)!;
    }

    // 创建处理Promise
    const processingPromise = this.performAudioProcessing(inputPath, options);
    this.processingQueue.set(processingId, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      // 清理处理队列
      this.processingQueue.delete(processingId);
    }
  }

  /**
   * 执行音频处理
   */
  private async performAudioProcessing(
    inputPath: string,
    options: AudioProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      // 获取原始文件大小
      const inputStats = await stat(inputPath);
      const originalSize = inputStats.size;

      // 生成输出文件路径
      const outputPath = this.generateOutputPath(inputPath, options);

      // 检查是否需要处理
      if (await this.isProcessingNeeded(inputPath, outputPath, options)) {
        // 执行FFmpeg处理
        await this.runFFmpegProcessing(inputPath, outputPath, options);
      }

      // 获取处理后文件大小
      const outputStats = await stat(outputPath);
      const processedSize = outputStats.size;

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      return {
        success: true,
        outputPath,
        originalSize,
        processedSize,
        compressionRatio: originalSize > 0 ? processedSize / originalSize : 1,
        processingTime
      };

    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      console.error('Audio processing failed:', error);
      
      return {
        success: false,
        originalSize: 0,
        processedSize: 0,
        compressionRatio: 1,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 运行FFmpeg处理
   */
  private async runFFmpegProcessing(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = this.buildFFmpegArgs(inputPath, outputPath, options);
      
      const ffmpeg = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * 构建FFmpeg参数
   */
  private buildFFmpegArgs(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions
  ): string[] {
    const args = [
      '-i', inputPath,
      '-y', // 覆盖输出文件
    ];

    // 音频编码器
    switch (options.outputFormat) {
      case 'mp3':
        args.push('-codec:a', 'libmp3lame');
        break;
      case 'aac':
        args.push('-codec:a', 'aac');
        break;
      case 'opus':
        args.push('-codec:a', 'libopus');
        break;
      case 'wav':
        args.push('-codec:a', 'pcm_s16le');
        break;
    }

    // 比特率
    if (options.bitrate) {
      args.push('-b:a', `${options.bitrate}k`);
    }

    // 采样率
    if (options.sampleRate) {
      args.push('-ar', options.sampleRate.toString());
    }

    // 声道数
    if (options.channels) {
      args.push('-ac', options.channels.toString());
    }

    // 质量设置
    if (options.outputFormat === 'mp3') {
      const qualityMap = { high: 0, medium: 2, low: 4 };
      args.push('-q:a', qualityMap[options.quality].toString());
    }

    // 音频过滤器
    const filters = [];

    // 标准化
    if (options.normalize) {
      filters.push('loudnorm');
    }

    // 淡入淡出
    if (options.fadeIn || options.fadeOut) {
      let fadeFilter = '';
      if (options.fadeIn) {
        fadeFilter += `afade=t=in:ss=0:d=${options.fadeIn}`;
      }
      if (options.fadeOut) {
        if (fadeFilter) fadeFilter += ',';
        fadeFilter += `afade=t=out:st=0:d=${options.fadeOut}`;
      }
      filters.push(fadeFilter);
    }

    if (filters.length > 0) {
      args.push('-af', filters.join(','));
    }

    // 输出文件
    args.push(outputPath);

    return args;
  }

  /**
   * 检查是否需要处理
   */
  private async isProcessingNeeded(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions
  ): Promise<boolean> {
    try {
      const outputStats = await stat(outputPath);
      const inputStats = await stat(inputPath);
      
      // 如果输出文件比输入文件新，则不需要重新处理
      return inputStats.mtime > outputStats.mtime;
    } catch (error) {
      // 输出文件不存在，需要处理
      return true;
    }
  }

  /**
   * 生成输出文件路径
   */
  private generateOutputPath(inputPath: string, options: AudioProcessingOptions): string {
    const { name, dir } = require('path').parse(inputPath);
    const suffix = `_${options.outputFormat}_${options.bitrate}k_${options.quality}`;
    const extension = `.${options.outputFormat}`;
    
    return join(this.tempDir, `${name}${suffix}${extension}`);
  }

  /**
   * 生成处理ID
   */
  private generateProcessingId(inputPath: string, options: AudioProcessingOptions): string {
    const optionsStr = JSON.stringify(options);
    const hash = require('crypto').createHash('md5').update(inputPath + optionsStr).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * 创建音频流处理器
   */
  createStreamProcessor(options: AudioProcessingOptions): {
    inputStream: Readable;
    outputStream: Readable;
    process: () => Promise<void>;
  } {
    const inputStream = new Readable({
      read() {}
    });

    const outputStream = new Readable({
      read() {}
    });

    const process = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const args = [
          '-f', options.inputFormat,
          '-i', 'pipe:0',
          '-f', options.outputFormat,
          '-codec:a', this.getCodecForFormat(options.outputFormat),
          '-b:a', `${options.bitrate}k`,
          '-ar', options.sampleRate.toString(),
          '-ac', options.channels.toString(),
          'pipe:1'
        ];

        const ffmpeg = spawn('ffmpeg', args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // 连接输入流
        inputStream.pipe(ffmpeg.stdin);

        // 连接输出流
        ffmpeg.stdout.on('data', (chunk) => {
          outputStream.push(chunk);
        });

        ffmpeg.stdout.on('end', () => {
          outputStream.push(null);
          resolve();
        });

        ffmpeg.on('error', reject);
        ffmpeg.stderr.on('data', (data) => {
          console.error('FFmpeg stderr:', data.toString());
        });
      });
    };

    return { inputStream, outputStream, process };
  }

  /**
   * 获取格式对应的编码器
   */
  private getCodecForFormat(format: string): string {
    const codecs: Record<string, string> = {
      'mp3': 'libmp3lame',
      'aac': 'aac',
      'opus': 'libopus',
      'wav': 'pcm_s16le'
    };

    return codecs[format] || 'libmp3lame';
  }

  /**
   * 获取音频文件信息
   */
  async getAudioInfo(filePath: string): Promise<{
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    format: string;
    size: number;
  }> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', filePath,
        '-f', 'null',
        '-'
      ];

      const ffmpeg = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', async (code) => {
        try {
          // 解析FFmpeg输出
          const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
          const bitrateMatch = stderr.match(/bitrate: (\d+) kb\/s/);
          const sampleRateMatch = stderr.match(/(\d+) Hz/);
          const channelsMatch = stderr.match(/(\d+) channels?/);
          const formatMatch = stderr.match(/Audio: (\w+)/);

          const duration = durationMatch 
            ? parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3])
            : 0;

          const stats = await stat(filePath);

          resolve({
            duration,
            bitrate: bitrateMatch ? parseInt(bitrateMatch[1]) : 0,
            sampleRate: sampleRateMatch ? parseInt(sampleRateMatch[1]) : 0,
            channels: channelsMatch ? parseInt(channelsMatch[1]) : 0,
            format: formatMatch ? formatMatch[1] : 'unknown',
            size: stats.size
          });
        } catch (error) {
          reject(error);
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(maxAge: number = 3600000): Promise<void> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = join(this.tempDir, file);
        const stats = await stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await unlink(filePath);
          console.log(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats(): {
    activeProcesses: number;
    queuedProcesses: number;
    tempFileCount: number;
  } {
    return {
      activeProcesses: this.processingQueue.size,
      queuedProcesses: 0, // 简化实现
      tempFileCount: 0 // 需要实际统计临时文件
    };
  }
}

// 创建全局实例
export const audioProcessor = AudioProcessor.getInstance();