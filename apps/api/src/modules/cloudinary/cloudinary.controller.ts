import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { inferCloudinaryUploadResourceType } from '@mezon-tutors/shared';
import { CloudinaryService } from './cloudinary.service';

@Controller('cloudinary')
@ApiTags('Cloudinary')
@UseGuards(JwtAuthGuard)
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
        },
        publicId: {
          type: 'string',
        },
        resourceType: {
          type: 'string',
          enum: ['image', 'video', 'raw', 'auto'],
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('publicId') publicId?: string,
    @Body('resourceType') resourceType?: 'image' | 'video' | 'raw' | 'auto'
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }

    return this.cloudinaryService.uploadFile(file.buffer, {
      folder,
      publicId,
      resourceType,
    });
  }

  @Post('upload-private')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
        resourceType: { type: 'string', enum: ['image', 'video', 'raw', 'auto'] },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    })
  )
  async uploadPrivateFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('resourceType') resourceType?: 'image' | 'video' | 'raw' | 'auto'
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const effectiveResourceType =
      !resourceType || resourceType === 'auto'
        ? inferCloudinaryUploadResourceType(file.mimetype, file.originalname)
        : resourceType;

    return this.cloudinaryService.uploadPrivateFile(file.buffer, {
      folder,
      resourceType: effectiveResourceType,
    });
  }

  @Delete('asset')
  async deleteFile(
    @Query('publicId') publicId: string,
    @Query('resourceType') resourceType?: 'image' | 'video' | 'raw'
  ) {
    return this.cloudinaryService.deleteFile(publicId, resourceType || 'image');
  }

  @Post('signature')
  async createUploadSignature(
    @Body('folder') folder?: string,
    @Body('publicId') publicId?: string,
    @Body('timestamp') timestamp?: number
  ) {
    return this.cloudinaryService.createUploadSignature({
      folder,
      publicId,
      timestamp,
    });
  }
}
