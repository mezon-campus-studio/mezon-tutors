import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVocabularyWordDto } from './dto/create-vocabulary-word.dto';
import { UpdateVocabularyWordDto } from './dto/update-vocabulary-word.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
@ApiTags('Vocabulary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.vocabularyService.findAll(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateVocabularyWordDto) {
    const user = req.user as AuthUserPayload;
    return this.vocabularyService.create(user.sub, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVocabularyWordDto,
  ) {
    const user = req.user as AuthUserPayload;
    return this.vocabularyService.updateStatus(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = req.user as AuthUserPayload;
    await this.vocabularyService.remove(id, user.sub);
  }
}
