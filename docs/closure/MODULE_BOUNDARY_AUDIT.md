# Module Boundary Audit

Generated at: 2026-03-11T22:27:08.419Z

- Scanned imports: 2415
- Violations: 27
- Status: fail

## Rules Checked

- No cross-app imports via relative paths
- No direct apps/* imports as specifiers
- No direct packages/* internal path imports as specifiers
- packages/* must not depend on @madar/web
- apps/web must not depend on @madar/db or @madar/object-store

## Violation Summary

| Reason | Count |
|---|---:|
| Cross-project relative import from apps/api to packages/knowledge-kernel | 27 |

## Violations

| File | Source Project | Import | Reason |
|---|---|---|---|
| apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/culture-programs/agent-catalog | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/culture-programs/metadata-schema | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/culture-programs/corpus-quality | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/culture-programs/impact-partner-linkage | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/culture-programs/vector-store-manager | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/culture-programs-brain/culture-programs-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/culture-programs/retrieval-contracts | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/destination-brain/destination-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/destination/vector-store-manager | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/destination-brain/destination-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/destination/retrieval-contracts | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/destination-brain/destination-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/destination/seasonality-linkage | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/exhibition/agent-catalog | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/exhibition/metadata-schema | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/exhibition/corpus-quality | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/exhibition/studio-experience-linkage | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/exhibition/vector-store-manager | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/exhibition-brain/exhibition-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/exhibition/retrieval-contracts | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/mega-events/agent-catalog | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/mega-events/metadata-schema | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/mega-events/corpus-quality | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/mega-events/readiness-operations-gap | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/mega-events/vector-store-manager | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/mega-events-brain/mega-events-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/mega-events/retrieval-contracts | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/urban-experience/agent-catalog | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/urban-experience/metadata-schema | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/urban-experience/corpus-quality | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/urban-experience/flow-linkage | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/urban-experience/vector-store-manager | Cross-project relative import from apps/api to packages/knowledge-kernel |
| apps/api/src/modules/urban-experience-brain/urban-experience-brain.service.ts | apps/api | ../../../../../packages/knowledge-kernel/src/urban-experience/retrieval-contracts | Cross-project relative import from apps/api to packages/knowledge-kernel |