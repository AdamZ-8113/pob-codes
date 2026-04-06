# Third-Party Notices

This file tracks upstream notices for software, data, and supporting logic that
PoB Codes redistributes, derives from, or has approved for direct integration.

## Path of Building Community

PoB Codes incorporates or derives portions of data and supporting logic from
the Path of Building Community project.

- Upstream project: <https://github.com/PathOfBuildingCommunity/PathOfBuilding>
- Upstream license: MIT
- Primary upstream copyright notice:

> Copyright (c) 2016 David Gowor

Path of Building Community's upstream repository includes additional notices in
its own license files. Where required, those notices and terms continue to
apply to the relevant redistributed or derived portions in this repository.

## timeless-jewels

PoB Codes has approved `timeless-jewels` as the intended upstream source for
direct timeless jewel calculation support. At the time this notice file was
added, direct code or data integration had not yet landed in the repository,
but the notice is included now so the required attribution and license chain is
already documented before that feature ships.

- Upstream project: <https://github.com/Vilsol/timeless-jewels>
- Upstream license: GNU General Public License, version 3
- Upstream README states that the project uses data extracted with
  `go-pob-data`.

## go-pob-data

`go-pob-data` is the upstream extracted data source used by `timeless-jewels`.
If PoB Codes integrates timeless jewel calculation through that stack, the
associated notices for this data source must remain with the relevant code and
redistributed data.

- Upstream project: <https://github.com/Vilsol/go-pob-data>
- Upstream license: GNU General Public License, version 3
