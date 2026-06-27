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
import {
  PaginationQueryDto,
  paginationMeta,
} from '../../common/dto/pagination-query.dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(DocumentFolder.name)
    private readonly folders: Model<DocumentFolder>,
    @InjectModel(Document.name) private readonly documents: Model<Document>,
  ) {}

  async foldersForTrip(tripId: string, query: PaginationQueryDto) {
    const [items, total] = await Promise.all([
      this.folders
        .find({ tripId })
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean()
        .exec(),
      this.folders.countDocuments({ tripId }).exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
  }

  async createFolder(tripId: string, userId: string, dto: CreateFolderDto) {
    const parentId =
      typeof dto.parentId === 'string' ? dto.parentId.trim() || null : null;

    if (parentId) {
      const parent = await this.folders.exists({ id: parentId, tripId });
      if (!parent) throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }

    return this.folders.create({
      ...dto,
      parentId,
      tripId,
      createdBy: userId,
    });
  }

  updateFolder(folderId: string, dto: UpdateFolderDto) {
    return this.folders
      .findOneAndUpdate({ id: folderId }, dto, { new: true })
      .exec();
  }

  async deleteFolder(folderId: string) {
    const descendants = await this.folders
      .aggregate<{ ids: string[] }>([
        { $match: { id: folderId } },
        {
          $graphLookup: {
            from: 'document_folders',
            startWith: '$id',
            connectFromField: 'id',
            connectToField: 'parentId',
            as: 'descendants',
          },
        },
        { $project: { ids: { $concatArrays: [['$id'], '$descendants.id'] } } },
      ])
      .exec();
    const treeIds = descendants[0]?.ids || [folderId];
    await this.folders.deleteMany({ id: { $in: treeIds } }).exec();
    await this.documents.deleteMany({ folderId: { $in: treeIds } }).exec();
  }

  async documentsForFolder(folderId: string, query: PaginationQueryDto) {
    const [items, total] = await Promise.all([
      this.documents
        .find({ folderId })
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean()
        .exec(),
      this.documents.countDocuments({ folderId }).exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
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
