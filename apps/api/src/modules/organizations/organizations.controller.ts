import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { InvitePartnerPortalDto } from './dto/invite-partner-portal.dto';
import { CreateLocalOfferDto } from './dto/create-local-offer.dto';
import { CreateCommerceBundleDto } from './dto/create-commerce-bundle.dto';
import { RegisterBookingConnectorDto } from './dto/register-booking-connector.dto';
import { SyncBookingsDto } from './dto/sync-bookings.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}
  @Get() findAll(){ return this.service.findAll(); }

  @Get('partners')
  listPartners(@Query('organizationId') organizationId?: string, @Query('partnerType') partnerType?: string){ return this.service.listPartners({ organizationId, partnerType }); }

  @Post('partners')
  createPartner(@Body() dto: CreatePartnerDto){ return this.service.createPartner(dto); }

  @Get('partners/:id/contributions')
  partnerContributions(@Param('id') id: string){ return this.service.partnerContributions(id); }

  @Post('partners/:id/invite-portal')
  invitePartnerPortal(@Param('id') id: string, @Body() dto: InvitePartnerPortalDto){ return this.service.invitePartnerPortal(id, dto || {}); }

  @Get('vendors/compliance')
  vendorCompliance(@Query('organizationId') organizationId?: string){ return this.service.vendorCompliance(organizationId); }

  @Get('commerce/bundles')
  listCommerceBundles(@Query('organizationId') organizationId?: string, @Query('experienceId') experienceId?: string){ return this.service.listCommerceBundles({ organizationId, experienceId }); }

  @Post('commerce/bundles')
  createCommerceBundle(@Body() dto: CreateCommerceBundleDto){ return this.service.createCommerceBundle(dto); }

  @Get('offers/local')
  listLocalOffers(@Query('organizationId') organizationId?: string, @Query('city') city?: string, @Query('category') category?: string){ return this.service.listLocalOffers({ organizationId, city, category }); }

  @Post('offers/local')
  createLocalOffer(@Body() dto: CreateLocalOfferDto){ return this.service.createLocalOffer(dto); }

  @Post('experiences/:experienceId/link-bundle')
  linkBundleToExperience(@Param('experienceId') experienceId: string, @Body('bundleId') bundleId: string){ return this.service.linkBundleToExperience(experienceId, String(bundleId || '')); }


  @Get('connectors/ticketing')
  listBookingConnectors(@Query('organizationId') organizationId?: string){ return this.service.listBookingConnectors({ organizationId }); }

  @Post('connectors/ticketing/register')
  registerBookingConnector(@Body() dto: RegisterBookingConnectorDto){ return this.service.registerBookingConnector(dto); }

  @Post('bookings/sync')
  syncBookings(@Body() dto: SyncBookingsDto){ return this.service.syncBookings(dto); }

  @Get('bookings/orders')
  listBookingOrders(@Query('organizationId') organizationId?: string, @Query('connectorId') connectorId?: string){ return this.service.listBookingOrders({ organizationId, connectorId }); }

  @Get('connectors/:id/health')
  bookingConnectorHealth(@Param('id') id: string){ return this.service.bookingConnectorHealth(id); }

  @Post() create(@Body() dto: CreateOrganizationDto){ return this.service.create(dto); }
}
