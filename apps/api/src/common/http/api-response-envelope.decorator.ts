import { SetMetadata } from '@nestjs/common';

export const API_RESPONSE_ENVELOPE_KEY = 'atheel:api-response-envelope';

export type ApiResponseEnvelopeKind = 'item' | 'list' | 'mutation';

export type ApiResponseEnvelopeMetadata = {
  message?: string;
  kind?: ApiResponseEnvelopeKind;
};

/**
 * Opt-in success response envelope for HTTP JSON endpoints.
 * Keeps binary/download endpoints untouched and makes success contracts predictable.
 */
export function ApiResponseEnvelope(metadata: ApiResponseEnvelopeMetadata = {}) {
  return SetMetadata(API_RESPONSE_ENVELOPE_KEY, metadata);
}
