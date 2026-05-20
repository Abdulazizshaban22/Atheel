import { Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID } from 'node:crypto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { throwIfProdDbError } from '../../common/db-fallback';

@Injectable()
export class OrganizationsService {

  async findAll() {
    try {
      const rows = await (this.prisma as Record<string, unknown>).organization.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
      return rows;
    } catch (err) {
      throwIfProdDbError(err, 'OrganizationsService.findAll');
      return this.db.getOrganizations();
    }
  }

  async create(dto: CreateOrganizationDto) {
    const data = {
      id: `org_${randomUUID().slice(0, 10)}`,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      sector: dto.sector,
      city: dto.city,
      country: dto.country ?? 'SA',
    };
    try {
      return await (this.prisma as Record<string, unknown>).organization.create({ data });
    } catch (err) {
      throwIfProdDbError(err, 'OrganizationsService.create');
      return this.db.addOrganization(data as any);
    }
  }

  async listPartners(params?: { organizationId?: string; partnerType?: string }) {
    let items = this.db.listPartners();
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    if (params?.partnerType) items = items.filter((x) => x.partnerType === params.partnerType);
    return { count: items.length, items };
  }

  async createPartner(dto: any) {
    const partner = {
      id: `prt_${randomUUID().slice(0, 10)}`,
      organizationId: dto.organizationId || 'org_demo_1',
      nameAr: dto.nameAr,
      nameEn: dto.nameEn || null,
      partnerType: dto.partnerType,
      city: dto.city || null,
      contactName: dto.contactName || null,
      contactEmail: dto.contactEmail || null,
      capabilities: Array.isArray(dto.capabilities) ? dto.capabilities : [],
      contributionAreas: Array.isArray(dto.contributionAreas) ? dto.contributionAreas : [],
      contributionScore: Array.isArray(dto.contributionAreas) ? Math.min(100, dto.contributionAreas.length * 20) : 0,
      complianceStatus: dto.partnerType === 'vendor' ? 'pending_review' : 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.addPartner(partner as any);
    return { ok: true, partner, note: 'fallback_in_memory_partner_os_lite' };
  }

  async partnerContributions(id: string) {
    const partner = this.db.getPartnerById(id);
    if (!partner) return { ok: false, reason: 'partner_not_found' };
    const contributionAreas = Array.isArray(partner.contributionAreas) ? partner.contributionAreas : [];
    return {
      ok: true,
      partnerId: id,
      contributionAreas,
      summaryAr: contributionAreas.length
        ? `يساهم الشريك في ${contributionAreas.join('، ')}.`
        : 'لم يتم تعريف مجالات المساهمة بعد.',
      readiness: partner.complianceStatus === 'active' ? 'ready' : 'needs_review',
    };
  }

  async invitePartnerPortal(id: string, dto: any) {
    const partner = this.db.getPartnerById(id);
    if (!partner) return { ok: false, reason: 'partner_not_found' };
    const invite = {
      id: `pinv_${randomUUID().slice(0, 10)}`,
      partnerId: id,
      contactEmail: dto.contactEmail || partner.contactEmail || null,
      invitedByUserId: dto.invitedByUserId || null,
      scopes: Array.isArray(dto.scopes) && dto.scopes.length ? dto.scopes : ['profile:write', 'deliverables:read'],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.db.addPartnerInvite(invite as any);
    return { ok: true, invite };
  }

  async vendorCompliance(organizationId?: string) {
    let items = this.db.listPartners({ partnerType: 'vendor' });
    if (organizationId) items = items.filter((x) => x.organizationId === organizationId);
    const rows = items.map((x) => ({
      partnerId: x.id,
      nameAr: x.nameAr,
      complianceStatus: x.complianceStatus || 'pending_review',
      capabilityCount: Array.isArray(x.capabilities) ? x.capabilities.length : 0,
      city: x.city || null,
    }));
    return { ok: true, organizationId: organizationId || null, count: rows.length, items: rows };
  }


  async listLocalOffers(params?: { organizationId?: string; city?: string; category?: string }) {
    let items = this.db.listLocalOffers();
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    if (params?.city) items = items.filter((x) => x.city === params.city);
    if (params?.category) items = items.filter((x) => x.category === params.category);
    return { ok: true, count: items.length, items };
  }

  async createLocalOffer(dto: any) {
    const offer = {
      id: `off_${randomUUID().slice(0, 10)}`,
      organizationId: dto.organizationId || 'org_demo_1',
      partnerId: dto.partnerId || null,
      titleAr: dto.titleAr,
      titleEn: dto.titleEn || null,
      category: dto.category || 'local_experience',
      city: dto.city || null,
      tags: Array.isArray(dto.tags) ? dto.tags : [],
      pricingBand: dto.pricingBand || 'mid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.addLocalOffer(offer as any);
    return { ok: true, offer, note: 'fallback_in_memory_cultural_commerce_lite' };
  }

  async listCommerceBundles(params?: { organizationId?: string; experienceId?: string }) {
    let items = this.db.listCommerceBundles();
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    if (params?.experienceId) items = items.filter((x) => x.experienceId === params.experienceId);
    return { ok: true, count: items.length, items };
  }

  async createCommerceBundle(dto: any) {
    const offerIds = Array.isArray(dto.offerIds) ? dto.offerIds : [];
    const linkedOffers = offerIds.length ? this.db.listLocalOffers().filter((x) => offerIds.includes(x.id)) : [];
    const bundle = {
      id: `bnd_${randomUUID().slice(0, 10)}`,
      organizationId: dto.organizationId || 'org_demo_1',
      experienceId: dto.experienceId || null,
      titleAr: dto.titleAr,
      titleEn: dto.titleEn || null,
      category: dto.category || 'cultural_bundle',
      offerIds,
      pricingBand: dto.pricingBand || (linkedOffers.some((x) => x.pricingBand === 'premium') ? 'premium' : 'mid'),
      legacyIntent: dto.legacyIntent || (linkedOffers.length ? 'support_local_value_chain' : 'bundle_not_linked_yet'),
      linkedOfferCount: linkedOffers.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.addCommerceBundle(bundle as any);
    return { ok: true, bundle, linkedOffers };
  }

  async linkBundleToExperience(experienceId: string, bundleId: string) {
    const bundle = this.db.getCommerceBundleById(bundleId);
    if (!bundle) return { ok: false, reason: 'bundle_not_found' };
    const updated = this.db.updateCommerceBundle(bundleId, { experienceId });
    return { ok: true, bundle: updated };
  }

  async listBookingConnectors(params?: { organizationId?: string }) {
    let items = this.db.listBookingConnectors();
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    return { ok: true, count: items.length, items };
  }

  async registerBookingConnector(dto: any) {
    const provider = String(dto.provider || '').trim().toLowerCase();
    const connector = {
      id: `bcn_${randomUUID().slice(0, 10)}`,
      organizationId: dto.organizationId || 'org_demo_1',
      provider: provider || 'custom',
      label: dto.label || provider || 'connector',
      baseUrl: dto.baseUrl || null,
      externalProjectId: dto.externalProjectId || null,
      scopes: Array.isArray(dto.scopes) && dto.scopes.length ? dto.scopes : ['bookings:read', 'events:read'],
      status: 'active',
      health: 'green',
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.addBookingConnector(connector as any);
    return { ok: true, connector, note: 'fallback_in_memory_ticketing_connector_lite' };
  }

  async syncBookings(dto: any) {
    const connector = this.db.getBookingConnectorById(dto.connectorId);
    if (!connector) return { ok: false, reason: 'connector_not_found' };
    const rows = Array.isArray(dto.externalOrders) ? dto.externalOrders : [];
    const synced = rows.map((row: any, idx: number) => ({
      id: `ord_${randomUUID().slice(0, 10)}`,
      organizationId: dto.organizationId || connector.organizationId,
      connectorId: connector.id,
      experienceId: dto.experienceId || row.experienceId || null,
      externalOrderId: row.externalOrderId || `ext_${idx + 1}`,
      attendeeName: row.attendeeName || null,
      ticketType: row.ticketType || 'general',
      amount: Number(row.amount || 0),
      currency: row.currency || 'SAR',
      status: row.status || 'confirmed',
      syncedAt: new Date().toISOString(),
    }));
    this.db.addBookingOrders(synced.reverse() as any);
    const updatedConnector = this.db.updateBookingConnector(connector.id, {
      lastSyncAt: new Date().toISOString(),
      health: rows.length ? 'green' : 'amber',
    } as any);
    return { ok: true, syncedCount: synced.length, orders: synced.slice(0, 50), connector: updatedConnector };
  }

  async listBookingOrders(params?: { organizationId?: string; connectorId?: string }) {
    let items = this.db.listBookingOrders();
    if (params?.organizationId) items = items.filter((x) => x.organizationId === params.organizationId);
    if (params?.connectorId) items = items.filter((x) => x.connectorId === params.connectorId);
    return { ok: true, count: items.length, items };
  }

  async bookingConnectorHealth(id: string) {
    const connector = this.db.getBookingConnectorById(id);
    if (!connector) return { ok: false, reason: 'connector_not_found' };
    const lastOrders = this.db.listBookingOrders({ connectorId: id }).slice(0, 20);
    return {
      ok: true,
      connectorId: id,
      provider: connector.provider,
      health: connector.health || 'unknown',
      lastSyncAt: connector.lastSyncAt || null,
      metrics: {
        recentOrders: lastOrders.length,
        successfulOrders: lastOrders.filter((x) => x.status === 'confirmed').length,
      },
    };
  }

}
