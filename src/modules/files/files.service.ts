import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import { Document, DocumentFolder } from '../../database/schemas';
import {
  CreateDocumentDto,
  CreateFolderDto,
  UpdateDocumentDto,
  UpdateFolderDto,
} from './dto/files.dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(DocumentFolder.name)
    private readonly folders: Model<DocumentFolder>,
    @InjectModel(Document.name) private readonly documents: Model<Document>,
  ) {}

  foldersForTrip(tripId: string) {
    return this.folders.find({ tripId }).sort({ createdAt: -1 }).lean().exec();
  }

  createFolder(tripId: string, userId: string, dto: CreateFolderDto) {
    return this.folders.create({ ...dto, tripId, createdBy: userId });
  }

  updateFolder(folderId: string, dto: UpdateFolderDto) {
    return this.folders
      .findOneAndUpdate({ id: folderId }, dto, { new: true })
      .exec();
  }

  async deleteFolder(folderId: string) {
    await this.folders.deleteOne({ id: folderId }).exec();
    await this.documents.deleteMany({ folderId }).exec();
  }

  documentsForFolder(folderId: string) {
    return this.documents
      .find({ folderId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  createDocument(
    tripId: string,
    folderId: string,
    userId: string,
    dto: CreateDocumentDto,
  ) {
    return this.documents.create({
      ...dto,
      tripId,
      folderId,
      uploadedBy: userId,
    });
  }

  async document(documentId: string) {
    const document = await this.documents
      .findOne({ id: documentId })
      .lean()
      .exec();
    if (!document) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    return document;
  }

  updateDocument(documentId: string, dto: UpdateDocumentDto) {
    return this.documents
      .findOneAndUpdate({ id: documentId }, dto, { new: true })
      .exec();
  }

  async deleteDocument(documentId: string) {
    await this.documents.deleteOne({ id: documentId }).exec();
  }
}
