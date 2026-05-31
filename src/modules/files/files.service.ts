import { Injectable, NotFoundException } from '@nestjs/common';
import { MESSAGES } from '../../common/constants/messages.constants';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateDocumentDto,
  CreateFolderDto,
  UpdateDocumentDto,
  UpdateFolderDto,
} from './dto/files.dto';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  foldersForTrip(tripId: string) {
    return this.prisma.documentFolder.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createFolder(tripId: string, userId: string, dto: CreateFolderDto) {
    return this.prisma.documentFolder.create({
      data: { ...dto, tripId, createdBy: userId },
    });
  }

  updateFolder(folderId: string, dto: UpdateFolderDto) {
    return this.prisma.documentFolder.update({
      where: { id: folderId },
      data: dto,
    });
  }

  async deleteFolder(folderId: string) {
    await this.prisma.documentFolder.delete({ where: { id: folderId } });
  }

  documentsForFolder(folderId: string) {
    return this.prisma.document.findMany({
      where: { folderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createDocument(
    tripId: string,
    folderId: string,
    userId: string,
    dto: CreateDocumentDto,
  ) {
    return this.prisma.document.create({
      data: { ...dto, tripId, folderId, uploadedBy: userId },
    });
  }

  async document(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return document;
  }

  updateDocument(documentId: string, dto: UpdateDocumentDto) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: dto,
    });
  }

  async deleteDocument(documentId: string) {
    await this.prisma.document.delete({ where: { id: documentId } });
  }
}
