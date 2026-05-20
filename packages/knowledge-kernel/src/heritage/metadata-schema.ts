export const HERITAGE_METADATA_SCHEMA = {
  domain: 'heritage',
  required: ['authorityLevel', 'assetClass', 'regionCode'],
  optional: ['sourceAuthority', 'validityWindow', 'sensitivity', 'interpretiveLayer', 'ownerEntity'],
  enums: {
    authorityLevel: ['core', 'sector', 'client'],
    sensitivity: ['low', 'medium', 'high'],
    assetClass: ['heritage_asset', 'site_guideline', 'interpretive_note', 'safety_policy'],
  },
};
