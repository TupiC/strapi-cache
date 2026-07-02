# Changelog

## [1.11.2](https://github.com/TupiC/strapi-cache/compare/v1.11.1...v1.11.2) (2026-07-02)


### Bug Fixes

* **cache:** defer crud invalidation and honor cacheable config ([#124](https://github.com/TupiC/strapi-cache/issues/124)) ([7a842f3](https://github.com/TupiC/strapi-cache/commit/7a842f3b96751a70f30ac7495ed7a1280fc98caa))

## [1.11.1](https://github.com/TupiC/strapi-cache/compare/v1.11.0...v1.11.1) (2026-06-21)


### Bug Fixes

* **redis:** only purge keys with prefix if defined ([#122](https://github.com/TupiC/strapi-cache/issues/122)) ([a346510](https://github.com/TupiC/strapi-cache/commit/a346510856db2cec7e2ebe0eb6ae452537adb071))

## [1.11.0](https://github.com/TupiC/strapi-cache/compare/v1.10.1...v1.11.0) (2026-05-26)


### Features

* **admin:** allow selective disableAdminButtons by content type path ([#114](https://github.com/TupiC/strapi-cache/issues/114)) ([5d387d5](https://github.com/TupiC/strapi-cache/commit/5d387d5c62bf252076289d68a80ecbcccde63edf))

## [1.10.1](https://github.com/TupiC/strapi-cache/compare/v1.10.0...v1.10.1) (2026-05-11)


### Bug Fixes

* **graphql-cache:** escape purge regex and honor keyGenerator ([#111](https://github.com/TupiC/strapi-cache/issues/111)) ([a0d19b6](https://github.com/TupiC/strapi-cache/commit/a0d19b6081ff3261291ef9955e4fd5e5220b39d8))

## [1.10.0](https://github.com/TupiC/strapi-cache/compare/v1.9.0...v1.10.0) (2026-05-08)


### Features

* **cache:** add optional keyGenerator for REST cache keys ([#107](https://github.com/TupiC/strapi-cache/issues/107)) ([ab538e4](https://github.com/TupiC/strapi-cache/commit/ab538e4ceaef8148efd81f038d90b90facaba6f7))

## [1.9.0](https://github.com/TupiC/strapi-cache/compare/v1.8.8...v1.9.0) (2026-05-05)


### Features

* allow dynamic graphql routes from graphql plugin config ([#105](https://github.com/TupiC/strapi-cache/issues/105)) ([8945993](https://github.com/TupiC/strapi-cache/commit/8945993a33e42ada1088cf246548b3b0dc23dd20))

## [1.8.8](https://github.com/TupiC/strapi-cache/compare/v1.8.7...v1.8.8) (2026-05-04)


### Bug Fixes

* **ci:** use npm 11.5 for OIDC publish and optional NPM_TOKEN ([f1c22be](https://github.com/TupiC/strapi-cache/commit/f1c22be62be923a4ecfcec281f5e47858ad221db))

## [1.8.7](https://github.com/TupiC/strapi-cache/compare/v1.8.6...v1.8.7) (2026-05-04)


### Bug Fixes

* **ci:** refresh package-lock for npm 10 npm ci peers ([377ed0a](https://github.com/TupiC/strapi-cache/commit/377ed0ae1897e60673e218a3e047edb5246858b8))

## [1.8.6](https://github.com/TupiC/strapi-cache/compare/v1.8.5...v1.8.6) (2026-05-04)


### Bug Fixes

* **release:** pin global npm to 10.9.2 in publish job ([d90d29c](https://github.com/TupiC/strapi-cache/commit/d90d29c1709d4948a16c2f527d5bf31e230d6d4c))

## [1.8.5](https://github.com/TupiC/strapi-cache/compare/v1.8.4...v1.8.5) (2026-05-04)


### Bug Fixes

* buffer files are not loading from the cache issue[[#98](https://github.com/TupiC/strapi-cache/issues/98)] ([#99](https://github.com/TupiC/strapi-cache/issues/99)) ([debd77e](https://github.com/TupiC/strapi-cache/commit/debd77e5af54bc132bd1db17e5ba410dbfcc687a))

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
