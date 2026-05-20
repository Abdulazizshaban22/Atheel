import { Injectable } from '@nestjs/common';
import { QueryContentItemsDto } from './dto/query-content-items.dto';
import { ContentRepository } from './content.repository';

@Injectable()
export class ContentService {
  constructor(private readonly repository: ContentRepository) {}

  async findAll(query: QueryContentItemsDto = {}) {
    return this.repository.findMany(query);
  }

  async findOne(id: string) {
    return this.repository.findById(id);
  }
}
