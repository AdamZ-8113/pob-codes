# 03 XML Parsing

## Supported Roots
- PathOfBuilding (PoE1)

## Section Coverage
- Build
- Tree / Spec / Sockets / Overrides
- Items / Item / ItemSet / Slot
- Skills / SkillSet / Skill / Gem
- Notes
- Config / Input

## Compatibility Rules
- Support both SkillSet and legacy top-level Skill entries.
- Support nil or None string values as undefined.
- Parse nodes csv and masteryEffects lua-table style strings.
- Parse URL text from Spec.URL.

## Output
Always emit normalized BuildPayload from packages/shared-types.

## Parser Implementation
- fast-xml-parser is used for robust attribute and node parsing.
- parseBuildCodeToPayload wraps codec + xml parser.
