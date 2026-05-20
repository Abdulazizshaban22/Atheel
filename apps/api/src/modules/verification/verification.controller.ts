import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/decorators/public.decorator';
import { VerificationService } from './verification.service';

@ApiTags('verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  /**
   * صفحة/Endpoint تحقق عام (بدون تسجيل دخول) لعرض بيانات الوثيقة الرسمية.
   * هذا هو الرابط المضمّن في الـ QR داخل ملفات PDF/PPTX.
   */
  @Public()
  @Get('approval-packets/:id')
  async getApprovalPacketVerification(@Param('id') id: string) {
    return await this.service.getApprovalPacketVerification(id);
  }

  /**
   * تحقق تدقيقي من Bundle ZIP:
   * - يقرأ manifest.json داخل الـ ZIP
   * - يحسب SHA-256 لكل ملف
   * - يرجع نتيجة مطابقة/اختلاف + تفاصيل الملفات
   */
  @Public()
  @Post('bundles/verify')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: Number(process.env.VERIFY_MAX_ZIP_BYTES || 120 * 1024 * 1024) } }))
  async verifyBundleZip(
    @UploadedFile() file: any,
    @Query('expectedPacketId') expectedPacketId?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing file buffer');
    return this.service.verifyBundleZip(file.buffer as Buffer, { expectedPacketId });
  }
}
