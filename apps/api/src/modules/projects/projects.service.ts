import { Injectable } from '@nestjs/common';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsRepository } from './projects.repository';
import { ProjectsApplicationService } from './projects.application-service';

@Injectable()
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository, private readonly application: ProjectsApplicationService) {}

  async findAll(query: QueryProjectsDto = {}) {
    return this.repository.findMany(query);
  }

  async findOne(id: string) {
    return this.repository.findById(id);
  }


  async create(dto: CreateProjectDto) {
    return this.application.create(dto);
  }
}
