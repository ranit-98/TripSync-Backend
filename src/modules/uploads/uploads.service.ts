import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { SignUploadDto } from './dto/sign-upload.dto';

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('cloudinary.cloudName'),
      api_key: this.config.get<string>('cloudinary.apiKey'),
      api_secret: this.config.get<string>('cloudinary.apiSecret'),
      secure: true,
    });
  }

  sign(tripId: string, dto: SignUploadDto) {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `${this.config.get<string>('cloudinary.folder')}/trips/${tripId}/${dto.target}`;
    const publicId = `${Date.now()}-${dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`;

    // The browser uploads directly to Cloudinary; the API persists metadata after upload.
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
}
