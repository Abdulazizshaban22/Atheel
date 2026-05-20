import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { IdeationService } from './ideation.service';

@ApiBearerAuth()
@Controller('ideation')
export class IdeationController {
  constructor(private readonly ideation: IdeationService) {}

  @Get('boards')
  boards() {
    return this.ideation.listBoards();
  }

  @Post('boards')
  createBoard(@Body() body: any) {
    return this.ideation.createBoard(body || {});
  }

  @Get('boards/:id')
  board(@Param('id') id: string) {
    return this.ideation.getBoard(id);
  }

  @Get('boards/:id/notes')
  notes(@Param('id') id: string) {
    return this.ideation.listNotes(id);
  }

  @Post('boards/:id/notes')
  addNote(@Param('id') id: string, @Body() body: any) {
    return this.ideation.addNote(id, body || {});
  }

  @Post('boards/:id/voting/start')
  startVoting(@Param('id') id: string, @Body() body: any) {
    return this.ideation.startVoting(id, body || {});
  }

  @Post('voting/:sessionId/vote')
  vote(@Param('sessionId') sessionId: string, @Body() body: any) {
    return this.ideation.vote(sessionId, body || {});
  }

  @Post('voting/:sessionId/close')
  close(@Param('sessionId') sessionId: string) {
    return this.ideation.closeVoting(sessionId);
  }

  @Get('boards/:id/voting/results')
  results(@Param('id') boardId: string, @Query('sessionId') sessionId?: string) {
    return this.ideation.results(boardId, sessionId);
  }


  @Post('boards/:id/convert-to-vault')
  convertToVault(@Param('id') id: string, @Body() body: any) {
    return this.ideation.convertTopNotesToVaultIdeas(id, body || {});
  }

  @Post('boards/:id/convert-to-program-templates')
  convertToTemplates(@Param('id') id: string, @Body() body: any) {
    return this.ideation.convertTopNotesToProgramTemplates(id, body || {});
  }

}
