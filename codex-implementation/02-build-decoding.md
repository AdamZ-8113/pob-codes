# 02 Build Decoding

## Scope
Decode and validate PoB export strings before XML parsing.

## Pipeline
1. Trim input.
2. Convert base64url to base64.
3. Restore missing base64 padding.
4. Decode bytes.
5. Inflate zlib payload with raw-deflate fallback.
6. UTF-8 decode to xml string.
7. Validate root starts with xml or PathOfBuilding tags.

## Error Contract
Use typed codec errors:
- EMPTY_INPUT
- INVALID_BASE64
- INVALID_ZLIB
- INVALID_XML

## Notes
- Decoder implementation is in packages/pob-codec.
- Encoder utility is included for round-trip and tests.
