import test from 'node:test';
import assert from 'node:assert/strict';
import { articleTitleEntries } from './title-metadata.mjs';
import {
  buildDocsifyAlias,
  HOME_ARTICLE,
  resolveRouteTarget,
  ROUTE_SLUGS,
  routeSlugFor,
  SLUG_TO_SITE
} from './route-slugs.mjs';

const articleSites = new Set(articleTitleEntries.map(article => article.site));

test('every public article except the homepage has a unique short slug', () => {
  const nonHomeSites = [...articleSites].filter(site => site !== HOME_ARTICLE);
  assert.equal(Object.keys(ROUTE_SLUGS).length, nonHomeSites.length, 'slug map must cover all non-homepage articles');
  assert.ok(!ROUTE_SLUGS[HOME_ARTICLE], 'homepage must not occupy a slug');
  const slugs = Object.values(ROUTE_SLUGS);
  assert.equal(new Set(slugs).size, slugs.length, 'slugs must be unique');
  for (const site of nonHomeSites) {
    assert.ok(ROUTE_SLUGS[site], `missing slug for ${site}`);
    assert.match(ROUTE_SLUGS[site], /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `slug must be kebab-case ASCII: ${ROUTE_SLUGS[site]}`);
  }
  for (const slug of Object.keys(SLUG_TO_SITE)) {
    assert.ok(articleSites.has(SLUG_TO_SITE[slug]), `slug ${slug} must resolve to a registered article`);
  }
});

test('routeSlugFor returns the slug for an article and null for the homepage', () => {
  assert.equal(routeSlugFor('01-V3计划-Codex安装配置.md'), 'v3-codex');
  assert.equal(routeSlugFor(HOME_ARTICLE), null);
  assert.equal(routeSlugFor('missing.md'), null);
});

test('resolveRouteTarget accepts short slugs, old filenames and the homepage', () => {
  assert.equal(resolveRouteTarget('v3-codex'), '01-V3计划-Codex安装配置.md');
  assert.equal(resolveRouteTarget('v3-codex.md'), '01-V3计划-Codex安装配置.md');
  assert.equal(resolveRouteTarget('01-V3计划-Codex安装配置'), '01-V3计划-Codex安装配置.md');
  assert.equal(resolveRouteTarget('01-V3计划-Codex安装配置.md'), '01-V3计划-Codex安装配置.md');
  assert.equal(resolveRouteTarget('/'), HOME_ARTICLE);
  assert.equal(resolveRouteTarget('03-Agentic入门宝典.md'), HOME_ARTICLE);
  assert.equal(resolveRouteTarget('03-Agentic入门宝典'), HOME_ARTICLE);
  assert.equal(resolveRouteTarget('not-a-route'), null);
  assert.equal(resolveRouteTarget(''), null);
});

test('buildDocsifyAlias maps both new and legacy routes to the canonical article', () => {
  const alias = buildDocsifyAlias();
  const keys = Object.keys(alias);
  assert.ok(keys.length >= Object.keys(ROUTE_SLUGS).length * 2, 'each article needs slug + legacy aliases');
  for (const [site, slug] of Object.entries(ROUTE_SLUGS)) {
    assert.equal(alias[`/${slug}(?:\\.md)?`], `/${site}`);
    const fileBase = site.replace(/\.md$/, '');
    assert.equal(alias[`/${fileBase}(?:\\.md)?`], `/${site}`);
  }
});

test('legacy Chinese filenames still resolve through the generated alias', () => {
  const alias = buildDocsifyAlias();
  for (const [site] of Object.entries(ROUTE_SLUGS)) {
    const fileBase = site.replace(/\.md$/, '');
    const matchingKey = Object.keys(alias).find(key => new RegExp(`^${key}$`).test(`/${fileBase}`));
    assert.ok(matchingKey, `legacy route must match for ${fileBase}`);
    assert.equal(new RegExp(`^${matchingKey}$`).test(`/${fileBase}.md`), true, `.md form must also match for ${fileBase}`);
  }
});
