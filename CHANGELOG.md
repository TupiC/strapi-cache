# Changelog

## [1.8.4](https://github.com/TupiC/strapi-cache/compare/v1.8.3...v1.8.4) (2026-03-25)


### Bug Fixes

* use scanStream instead of KEYS for clearByRegexp in Redis provider ([#89](https://github.com/TupiC/strapi-cache/issues/89)) ([3d70cbc](https://github.com/TupiC/strapi-cache/commit/3d70cbca73b30971bdadff5f4236d24d778a4c2c))

## [1.8.3](https://github.com/TupiC/strapi-cache/compare/v1.8.2...v1.8.3) (2026-02-26)


### Bug Fixes

* regenerate package-lock for cross-platform npm ci ([1a58238](https://github.com/TupiC/strapi-cache/commit/1a58238353e0cd11eefdbb56cccd085ba3720650))

## [1.8.2](https://github.com/TupiC/strapi-cache/compare/v1.8.1...v1.8.2) (2026-02-26)


### Bug Fixes

* allow valkey + view settings permission ([#84](https://github.com/TupiC/strapi-cache/issues/84)) ([6e2d0e3](https://github.com/TupiC/strapi-cache/commit/6e2d0e3fa9a12805cefb669bbfff1d89442e3c37))

## [1.8.1](https://github.com/TupiC/strapi-cache/compare/v1.8.0...v1.8.1) (2026-02-16)


### Bug Fixes

* regenerate package-lock.json to fix npm ci in CI ([5a31cbf](https://github.com/TupiC/strapi-cache/commit/5a31cbfa3562b9deccb8fe6252d62402b11cb21b))

## [1.8.0](https://github.com/TupiC/strapi-cache/compare/v1.7.0...v1.8.0) (2026-02-16)


### Features

* add disableAdminButtons config option ([bcbe46d](https://github.com/TupiC/strapi-cache/commit/bcbe46dfc754d4fd25d6d6cd5f9e71296ed7f6d2))
* introduce autoPurgeGraphQL bool ([3e3c669](https://github.com/TupiC/strapi-cache/commit/3e3c6695f06c44e46d19ffa14efd7504c1000182))
* introduce cacheableEntities and optimize invalidation calls ([9bd14f7](https://github.com/TupiC/strapi-cache/commit/9bd14f723b6c0a29dc50d0a3c292fb307e382fc2))
* introduce delAll to batch del operations for redis pipeline ([a5d969c](https://github.com/TupiC/strapi-cache/commit/a5d969cd3a1715f303229469b6570c7f8a421cf9))
* possibility to disable admin buttons ([696bf2d](https://github.com/TupiC/strapi-cache/commit/696bf2d5079a271a70f969e7592b6a7d552862c1))


### Bug Fixes

* support GET in GraphQL cache and add integration test suite ([#75](https://github.com/TupiC/strapi-cache/issues/75)) ([1af3a4a](https://github.com/TupiC/strapi-cache/commit/1af3a4ac37aa8f74d9e329c44b3b1a0addfc77cb))
* test config missing disableAdminButtons ([37b5d1a](https://github.com/TupiC/strapi-cache/commit/37b5d1a0e85d9223d3ab43fe24a6481f5d7cbe6b))

## [1.7.0](https://github.com/TupiC/strapi-cache/compare/v1.6.2...v1.7.0) (2025-12-05)


### Features

* add please release workflow ([e566ace](https://github.com/TupiC/strapi-cache/commit/e566ace99c3f1a5b2079e601e117327ae5aea099))
* add purge all button to settings ([6f7688a](https://github.com/TupiC/strapi-cache/commit/6f7688ad2fa82cde32b495e2033766a719dc2eaf))
* purge all button ([b077c42](https://github.com/TupiC/strapi-cache/commit/b077c4287698aa78e682376581878b576ee011ea))
