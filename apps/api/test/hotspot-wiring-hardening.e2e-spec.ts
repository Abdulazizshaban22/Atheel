import 'reflect-metadata';
import { ContentModule } from '../src/modules/content/content.module';
import { ContentApplicationService } from '../src/modules/content/content.application-service';
import { AttachmentsModule } from '../src/modules/attachments/attachments.module';
import { AttachmentsApplicationService } from '../src/modules/attachments/attachments.application-service';
import { ApprovalPacketsService } from '../src/modules/approval-packets/approval-packets.service';

function readModuleMetadata(target: object, key: 'exports' | 'providers') {
  return Reflect.getMetadata(key, target) as unknown[] | undefined;
}

describe('Wave107 hotspot wiring hardening', () => {
  it('exports the application services needed by approval packets', () => {
    const contentExports = readModuleMetadata(ContentModule, 'exports') ?? [];
    const attachmentExports = readModuleMetadata(AttachmentsModule, 'exports') ?? [];

    expect(contentExports).toContain(ContentApplicationService);
    expect(attachmentExports).toContain(AttachmentsApplicationService);
  });

  it('keeps ApprovalPacketsService defined after the wiring shift', () => {
    expect(ApprovalPacketsService).toBeDefined();
  });
});
