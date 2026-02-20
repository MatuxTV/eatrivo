#!/usr/bin/env node

/**
 * Manifest Validator — PWA Optimizer Sub-Agent
 *
 * Validuje Web App Manifest podľa W3C špecifikácie.
 *
 * Použitie:
 *   node scripts/validate-manifest.js /path/to/manifest.webmanifest
 */

const fs = require('fs');
const path = require('path');

const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error('Použitie: node validate-manifest.js <cesta-k-manifestu>');
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Súbor neexistuje: ${manifestPath}`);
  process.exit(1);
}

let manifest;
try {
  const content = fs.readFileSync(manifestPath, 'utf8');
  manifest = JSON.parse(content);
} catch (e) {
  console.error(`❌ Manifest nie je validný JSON: ${e.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const info = [];

// === REQUIRED FIELDS ===

if (!manifest.name) errors.push('Chýba "name"');
else if (manifest.name.length > 45) warnings.push(`"name" je príliš dlhý (${manifest.name.length}/45)`);
else info.push(`name: "${manifest.name}"`);

if (!manifest.short_name) errors.push('Chýba "short_name"');
else if (manifest.short_name.length > 12) warnings.push(`"short_name" je príliš dlhý (${manifest.short_name.length}/12)`);
else info.push(`short_name: "${manifest.short_name}"`);

if (!manifest.start_url) errors.push('Chýba "start_url"');
else info.push(`start_url: "${manifest.start_url}"`);

if (!manifest.display) {
  errors.push('Chýba "display"');
} else if (!['fullscreen', 'standalone', 'minimal-ui', 'browser'].includes(manifest.display)) {
  errors.push(`Neplatná hodnota "display": "${manifest.display}"`);
} else if (manifest.display === 'browser') {
  warnings.push('"display": "browser" — appka nebude vyzerať ako PWA');
} else {
  info.push(`display: "${manifest.display}"`);
}

// === ICONS ===

if (!manifest.icons || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  errors.push('Chýbajú ikony');
} else {
  const allSizes = manifest.icons.map(i => i.sizes).filter(Boolean);
  const allPurposes = manifest.icons.map(i => i.purpose || 'any');

  if (!allSizes.some(s => s.includes('192x192'))) errors.push('Chýba ikona 192x192');
  if (!allSizes.some(s => s.includes('512x512'))) errors.push('Chýba ikona 512x512');
  if (!allPurposes.some(p => p.includes('maskable'))) warnings.push('Chýba maskable ikona');

  // Anti-pattern check
  manifest.icons.forEach((icon, i) => {
    if (icon.purpose === 'any maskable') {
      warnings.push(`Ikona [${i}]: "any maskable" — použi samostatné ikony`);
    }
    if (!icon.type) {
      warnings.push(`Ikona [${i}]: chýba "type" (napr. "image/png")`);
    }
    if (!icon.src) {
      errors.push(`Ikona [${i}]: chýba "src"`);
    }
  });

  info.push(`Ikony: ${manifest.icons.length} definovaných`);
}

// === RECOMMENDED FIELDS ===

if (!manifest.theme_color) warnings.push('Chýba "theme_color"');
else {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(manifest.theme_color)) {
    warnings.push(`"theme_color" nie je validná hex farba: "${manifest.theme_color}"`);
  }
}

if (!manifest.background_color) warnings.push('Chýba "background_color"');
else {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(manifest.background_color)) {
    warnings.push(`"background_color" nie je validná hex farba: "${manifest.background_color}"`);
  }
}

if (!manifest.description) warnings.push('Chýba "description"');
if (!manifest.scope) warnings.push('Chýba "scope" — prehliadač ho odvodí z start_url');

// === SCOPE VALIDATION ===
if (manifest.scope && manifest.start_url) {
  if (!manifest.start_url.startsWith(manifest.scope) && manifest.scope !== '/') {
    errors.push(`"start_url" (${manifest.start_url}) nie je v rámci "scope" (${manifest.scope})`);
  }
}

// === SCREENSHOTS ===
if (!manifest.screenshots || manifest.screenshots.length === 0) {
  warnings.push('Chýbajú screenshots — Richer Install UI nebude dostupné');
} else {
  const hasNarrow = manifest.screenshots.some(s => s.form_factor === 'narrow');
  const hasWide = manifest.screenshots.some(s => s.form_factor === 'wide');
  if (!hasNarrow) warnings.push('Chýba screenshot s form_factor "narrow" (mobile)');
  if (!hasWide) info.push('Žiadny screenshot s form_factor "wide" (desktop) — ok ak nie je desktop appka');
}

// === SHORTCUTS ===
if (manifest.shortcuts) {
  manifest.shortcuts.forEach((s, i) => {
    if (!s.name) errors.push(`Shortcut [${i}]: chýba "name"`);
    if (!s.url) errors.push(`Shortcut [${i}]: chýba "url"`);
  });
  info.push(`Shortcuts: ${manifest.shortcuts.length} definovaných`);
}

// === OUTPUT ===

console.log('🔍 Manifest Validácia');
console.log('======================');
console.log(`Súbor: ${manifestPath}\n`);

if (errors.length > 0) {
  console.log(`❌ CHYBY (${errors.length}):`);
  errors.forEach(e => console.log(`  • ${e}`));
  console.log();
}

if (warnings.length > 0) {
  console.log(`⚠️  VAROVANIA (${warnings.length}):`);
  warnings.forEach(w => console.log(`  • ${w}`));
  console.log();
}

if (info.length > 0) {
  console.log(`ℹ️  INFO:`);
  info.forEach(i => console.log(`  • ${i}`));
  console.log();
}

const status = errors.length === 0 ? '✅ VALIDNÝ' : '❌ NEVALIDNÝ';
console.log(`Stav: ${status} (${errors.length} chýb, ${warnings.length} varovaní)`);

process.exit(errors.length > 0 ? 1 : 0);
