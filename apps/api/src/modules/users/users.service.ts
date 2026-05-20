import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { createHash, scryptSync } from 'node:crypto';
import type { PlatformRole } from '../auth/constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { throwCorePersistenceError } from '../../common/db-fallback';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listRolesCatalog(): PlatformRole[] {
    return ['super_admin','org_admin','project_manager','curator','content_editor','experience_designer','analyst','viewer'];
  }

  async findAll(query: QueryUsersDto = {}) {
    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.findMany) throw new Error('prisma user unavailable');
      const rows = await prismaUser.findMany({
        where: query.q ? { OR: [{ email: { contains: query.q, mode: 'insensitive' } }, { displayName: { contains: query.q, mode: 'insensitive' } }] } : undefined,
        include: { memberships: true },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((u: any) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        isActive: u.isActive,
        roles: [...new Set((u.memberships || []).map((m: any) => m.role))],
        orgIds: [...new Set((u.memberships || []).map((m: any) => m.organizationId))],
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      }));
    } catch (err) {
      throwCorePersistenceError(err, 'UsersService.findAll');
    }
  }

  async create(dto: CreateUserDto) {
    const roles = dto.roles?.length ? dto.roles : ['viewer'];
    const orgIds = dto.orgIds?.length ? dto.orgIds : [];
    const id = `usr_${Date.now()}`;
    const passwordHash = dto.password ? this.hashPassword(dto.password) : this.hashPassword('ChangeMe@123');

    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.create) throw new Error('prisma user unavailable');
      const existing = await prismaUser.findUnique({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('البريد الإلكتروني مستخدم بالفعل');
      const created = await prismaUser.create({
        data: {
          id,
          email: dto.email,
          displayName: dto.displayName,
          isActive: dto.isActive ?? true,
          passwordHash,
          memberships: orgIds.length
            ? { create: roles.flatMap((role) => orgIds.map((organizationId) => ({ role, organizationId }))) }
            : undefined,
        },
        include: { memberships: true },
      });
      return {
        id: created.id,
        email: created.email,
        displayName: created.displayName,
        isActive: created.isActive,
        roles: [...new Set((created.memberships || []).map((m: any) => m.role))],
        orgIds: [...new Set((created.memberships || []).map((m: any) => m.organizationId))],
        lastLoginAt: created.lastLoginAt,
        createdAt: created.createdAt,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throwCorePersistenceError(err, 'UsersService.create');
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.update) throw new Error('prisma user unavailable');
      const current = await prismaUser.findUnique({ where: { id }, include: { memberships: true } });
      if (!current) throw new NotFoundException('المستخدم غير موجود');
      const currentRoles = [...new Set((current.memberships || []).map((m: any) => m.role))] as PlatformRole[];
      const currentOrgIds = [...new Set((current.memberships || []).map((m: any) => m.organizationId))];
      const nextRoles = dto.roles?.length ? dto.roles : (currentRoles.length ? currentRoles : ['viewer']);
      const nextOrgIds = dto.orgIds?.length ? dto.orgIds : currentOrgIds;
      const updated = await prismaUser.update({
        where: { id },
        data: {
          email: dto.email,
          displayName: dto.displayName,
          isActive: dto.isActive,
          ...(dto.roles || dto.orgIds ? {
            memberships: {
              deleteMany: {},
              create: nextOrgIds.length ? nextRoles.flatMap((role) => nextOrgIds.map((organizationId) => ({ role, organizationId }))) : []
            }
          } : {})
        },
        include: { memberships: true },
      });
      return {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        isActive: updated.isActive,
        roles: [...new Set((updated.memberships || []).map((m: any) => m.role))],
        orgIds: [...new Set((updated.memberships || []).map((m: any) => m.organizationId))],
        lastLoginAt: updated.lastLoginAt,
        createdAt: updated.createdAt,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throwCorePersistenceError(err, 'UsersService.update');
    }
  }

  async updateRoles(id: string, roles: PlatformRole[], orgIds?: string[]) {
    return this.update(id, { roles, orgIds });
  }

  async remove(id: string) {
    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.delete) throw new Error('prisma user unavailable');
      await prismaUser.delete({ where: { id } });
      return { id, deleted: true };
    } catch (err) {
      throwCorePersistenceError(err, 'UsersService.remove');
    }
  }

  private hashPassword(password: string): string {
    const salt = createHash('sha256').update(`salt:${password.length}`).digest('hex').slice(0, 16);
    const digest = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${digest}`;
  }
}