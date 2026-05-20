import 'reflect-metadata';
import { API_RESPONSE_ENVELOPE_KEY } from '../src/common/http/api-response-envelope.decorator';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ContentController } from '../src/modules/content/content.controller';
import { ExperiencesController } from '../src/modules/experiences/experiences.controller';
import { ApiResponseEnvelopeInterceptor } from '../src/common/http/api-response-envelope.interceptor';

describe('Wave96 response contract and repository boundaries', () => {
  it('marks core project/content/experience routes with an explicit success envelope contract', () => {
    const projectList = Reflect.getMetadata(API_RESPONSE_ENVELOPE_KEY, ProjectsController.prototype.findAll);
    const contentCreate = Reflect.getMetadata(API_RESPONSE_ENVELOPE_KEY, ContentController.prototype.create);
    const experienceGet = Reflect.getMetadata(API_RESPONSE_ENVELOPE_KEY, ExperiencesController.prototype.findOne);

    expect(projectList).toMatchObject({ kind: 'list', message: 'Projects fetched' });
    expect(contentCreate).toMatchObject({ kind: 'mutation', message: 'Content item created' });
    expect(experienceGet).toMatchObject({ kind: 'item', message: 'Experience fetched' });
  });

  it('keeps the success envelope interceptor as an injectable Nest interceptor', () => {
    expect(ApiResponseEnvelopeInterceptor).toBeDefined();
    expect(typeof ApiResponseEnvelopeInterceptor).toBe('function');
  });
});
