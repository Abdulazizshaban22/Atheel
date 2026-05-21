import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { InspirationService } from './inspiration.service';

@ApiBearerAuth()
@Controller('inspiration')
export class InspirationController {
  constructor(private readonly inspiration: InspirationService) {}

  @Get('sources')
  sources() {
    return this.inspiration.listSources();
  }

  @Get('assets')
  assets(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('regionCode') regionCode?: string,
    @Query('themeCode') themeCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inspiration.listAssets({ q, tag, regionCode, themeCode, limit: limit ? Number(limit) : 60 });
  }

  @Post('assets')
  addAsset(@Body() body: any) {
    return this.inspiration.addAsset(body || {});
  }


  @Get('boards')
  boards(@Query('projectId') projectId?: string, @Query('q') q?: string) {
    return this.inspiration.listBoards({ projectId, q });
  }

  @Post('boards')
  createBoard(@Body() body: any) {
    return this.inspiration.createBoard(body || {});
  }

  @Get('boards/:id')
  board(@Param('id') id: string) {
    return this.inspiration.getBoard(id);
  }

  @Post('boards/:id/items')
  addToBoard(@Param('id') boardId: string, @Body() body: any) {
    return this.inspiration.addAssetToBoard(boardId, body || {});
  }

  @Delete('boards/:id/items/:itemId')
  removeItem(@Param('id') boardId: string, @Param('itemId') itemId: string) {
    return this.inspiration.removeBoardItem(boardId, itemId);
  }

  @Get('assets/:id/citation')
  citation(@Param('id') id: string) {
    return this.inspiration.getAssetCitation(id);
  }

}
