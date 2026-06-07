import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { SignUploadDto } from './dto/sign-upload.dto';

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadedImageAsset = {
  objectKey: string;
  url: string;
};

@Injectable()
export class UploadsService {
  private readonly baseFolder: string;

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('cloudinary.cloudName'),
      api_key: this.config.get<string>('cloudinary.apiKey'),
      api_secret: this.config.get<string>('cloudinary.apiSecret'),
      secure: true,
    });

    this.baseFolder =
      this.config.get<string>('cloudinary.folder') ?? 'trip-sync';
  }

  sign(tripId: string, dto: SignUploadDto) {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `${this.baseFolder}/trips/${tripId}/${dto.target}`;
    const publicId = `${Date.now()}-${dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder, public_id: publicId },
      this.config.getOrThrow<string>('cloudinary.apiSecret'),
    );

    return {
      cloudName: this.config.get<string>('cloudinary.cloudName'),
      apiKey: this.config.get<string>('cloudinary.apiKey'),
      timestamp,
      signature,
      folder,
      publicId,
      objectKey: `${folder}/${publicId}`,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.get<string>('cloudinary.cloudName')}/auto/upload`,
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const asset = await this.uploadImageAsset(file, folder);
    return asset.url;
  }

  async uploadImageAsset(
    file: Express.Multer.File | undefined,
    folder: string,
  ): Promise<UploadedImageAsset> {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type. Allowed: ${[...ALLOWED_IMAGE_MIMES].join(', ')}`,
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`,
      );
    }

    const cloudName = this.config.get<string>('cloudinary.cloudName');
    const apiKey = this.config.get<string>('cloudinary.apiKey');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary configuration is incomplete.',
      );
    }

    const fullFolder = `${this.baseFolder}/${folder}`;

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: fullFolder,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error || !result) {
              const rejectionError =
                error instanceof Error
                  ? error
                  : new Error(
                      JSON.stringify(error) || 'Cloudinary upload failed',
                    );
              return reject(rejectionError);
            }
            resolve(result);
          },
        )
        .end(file.buffer);
    });

    return {
      objectKey: result.public_id,
      url: result.secure_url,
    };
  }

  async deleteImage(objectKey: string): Promise<void> {
    await cloudinary.uploader.destroy(objectKey, { resource_type: 'image' });
  }
}
