import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@mezon-tutors/db';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVocabularyWordDto } from './dto/create-vocabulary-word.dto';
import { UpdateVocabularyWordDto } from './dto/update-vocabulary-word.dto';

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(studentId: string) {
    return this.prisma.vocabularyWord.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(studentId: string, dto: CreateVocabularyWordDto) {
    const existing = await this.prisma.vocabularyWord.findFirst({
      where: {
        studentId,
        word: dto.word,
        definition: dto.definition,
      },
    });

    if (existing) {
      throw new ConflictException('Word already added');
    }

    try {
      return await this.prisma.vocabularyWord.create({
        data: {
          studentId,
          word: dto.word,
          phonetic: dto.phonetic ?? null,
          partOfSpeech: dto.partOfSpeech,
          definition: dto.definition,
          example: dto.example ?? null,
          audioUrl: dto.audioUrl ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Word already added');
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    studentId: string,
    dto: UpdateVocabularyWordDto,
  ) {
    const word = await this.prisma.vocabularyWord.findUnique({
      where: { id },
    });

    if (!word || word.studentId !== studentId) {
      throw new NotFoundException('Vocabulary word not found');
    }

    return this.prisma.vocabularyWord.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string, studentId: string) {
    const word = await this.prisma.vocabularyWord.findUnique({
      where: { id },
    });

    if (!word || word.studentId !== studentId) {
      throw new NotFoundException('Vocabulary word not found');
    }

    await this.prisma.vocabularyWord.delete({ where: { id } });
  }
}
