import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { MESSAGES } from '../../common/constants/messages.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripRoles } from '../../common/decorators/trip-roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TripMemberGuard } from '../../common/guards/trip-member.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { TRIP_MEMBER_ROLES } from '../../common/constants/roles.constants';
import {
  CreateDocumentDto,
  CreateFolderDto,
  UpdateDocumentDto,
  UpdateFolderDto,
} from './dto/files.dto';
import { FilesService } from './files.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('trips/:tripId')
@UseGuards(JwtAuthGuard, TripMemberGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get('folders')
  async folders(@Param('tripId') tripId: string, @Query() query: PaginationQueryDto) {
    const result = await this.files.foldersForTrip(tripId, query);
    return {
      message: MESSAGES.FILES.FOLDERS,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post('folders')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateFolderDto })
  async createFolder(
    @Param('tripId') tripId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateFolderDto,
  ) {
    return {
      message: MESSAGES.FILES.FOLDER_CREATED,
      data: await this.files.createFolder(tripId, user.id, dto),
    };
  }

  @Patch('folders/:folderId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateFolderDto })
  async updateFolder(
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return {
      message: MESSAGES.FILES.FOLDER_UPDATED,
      data: await this.files.updateFolder(folderId, dto),
    };
  }

  @Delete('folders/:folderId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async deleteFolder(@Param('folderId') folderId: string) {
    await this.files.deleteFolder(folderId);
    return { message: MESSAGES.FILES.FOLDER_DELETED };
  }

  @Get('folders/:folderId/documents')
  async documents(@Param('folderId') folderId: string, @Query() query: PaginationQueryDto) {
    const result = await this.files.documentsForFolder(folderId, query);
    return {
      message: MESSAGES.FILES.DOCUMENTS,
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Post('folders/:folderId/documents')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: CreateDocumentDto })
  async createDocument(
    @Param('tripId') tripId: string,
    @Param('folderId') folderId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return {
      message: MESSAGES.FILES.DOCUMENT_CREATED,
      data: await this.files.createDocument(tripId, folderId, user.id, dto),
    };
  }

  @Get('documents/:documentId/download')
  async download(@Param('documentId') documentId: string) {
    return {
      message: MESSAGES.FILES.DOCUMENTS,
      data: await this.files.document(documentId),
    };
  }

  @Patch('documents/:documentId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  @ApiBody({ type: UpdateDocumentDto })
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return {
      message: MESSAGES.FILES.DOCUMENT_UPDATED,
      data: await this.files.updateDocument(documentId, dto),
    };
  }

  @Delete('documents/:documentId')
  @TripRoles(TRIP_MEMBER_ROLES.COLLABORATOR)
  async deleteDocument(@Param('documentId') documentId: string) {
    await this.files.deleteDocument(documentId);
    return { message: MESSAGES.FILES.DOCUMENT_DELETED };
  }
}
