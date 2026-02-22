#!/usr/bin/env node

/**
 * PWA Audit Script — Antigravity Sub-Agent
 *
 * Tento skript vykonáva offline analýzu PWA súborov v projekte.
 * Kontroluje manifest, Service Worker, HTML meta tagy a ikony.
 *
 * Použitie:
 *   node scripts/pwa-audit.js --dir /path/to/project
 *
 * Výstup: JSON report s nálezmi a odporúčaniami
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let projectDir = '.';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    projectDir = args[i + 1];
  }
}

const report = {
  timestamp: new Date().toISOString(),
  projectDir: path.resolve(projectDir),
  score: 0,
  maxScore: 0,
  findings: [],
  errors: [],
  warnings: [],
  passed: []
};

function addFinding(category, severity, message, fix) {
  const finding = { category, severity, message };
  if (fix) finding.fix = fix;

  report.findings.push(finding);

  if (severity === 'error') report.errors.push(finding);
  else if (severity === 'warning') report.warnings.push(finding);
  else report.passed.push(finding);

  report.maxScore++;
  if (severity === 'pass') report.score++;
}

// === MANIFEST CHECK ===

function checkManifest() {
  const manifestNames = ['manifest.webmanifest', 'manifest.json', 'site.webmanifest'];
  let manifestPath = null;
  let manifest = null;

  for (const name of manifestNames) {
    const fullPath = path.join(projectDir, name);
    if (fs.existsSync(fullPath)) {
      manifestPath = fullPath;
      break;
    }
    // Skontroluj aj v public/ priečinku
    const publicPath = path.join(projectDir, 'public', name);
    if (fs.existsSync(publicPath)) {
      manifestPath = publicPath;
      break;
    }
  }

  if (!manifestPath) {
    addFinding('manifest', 'error', 'Manifest súbor nebol nájdený', 'Vytvor manifest.webmanifest v root priečinku projektu');
    return;
  }

  addFinding('manifest', 'pass', `Manifest nájdený: ${path.basename(manifestPath)}`);

  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(content);
  } catch (e) {
    addFinding('manifest', 'error', `Manifest nie je validný JSON: ${e.message}`, 'Oprav JSON syntax v manifest súbore');
    return;
  }

  // Required fields
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      addFinding('manifest', 'error', `Chýba povinné pole: ${field}`, `Pridaj "${field}" do manifestu`);
    } else {
      addFinding('manifest', 'pass', `Pole "${field}" je prítomné`);
    }
  }

  // short_name length
  if (manifest.short_name && manifest.short_name.length > 12) {
    addFinding('manifest', 'warning', `short_name je príliš dlhý (${manifest.short_name.length} znakov, max 12)`, 'Skráť short_name na max 12 znakov');
  }

  // Display mode
  if (manifest.display && !['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) {
    addFinding('manifest', 'warning', `Display mode "${manifest.display}" nie je optimálny pre PWA`, 'Nastav display na "standalone"');
  }

  // Theme color
  if (!manifest.theme_color) {
    addFinding('manifest', 'warning', 'Chýba theme_color v manifeste', 'Pridaj "theme_color" pre konzistentný vzhľad');
  }

  // Background color
  if (!manifest.background_color) {
    addFinding('manifest', 'warning', 'Chýba background_color v manifeste', 'Pridaj "background_color" pre splash screen');
  }

  // Icons
  if (manifest.icons && Array.isArray(manifest.icons)) {
    const sizes = manifest.icons.map(i => i.sizes);
    const has192 = sizes.some(s => s && s.includes('192x192'));
    const has512 = sizes.some(s => s && s.includes('512x512'));
    const hasMaskable = manifest.icons.some(i => i.purpose && i.purpose.includes('maskable'));

    if (!has192) addFinding('icons', 'error', 'Chýba ikona 192x192', 'Pridaj ikonu s veľkosťou 192x192');
    else addFinding('icons', 'pass', 'Ikona 192x192 je prítomná');

    if (!has512) addFinding('icons', 'error', 'Chýba ikona 512x512', 'Pridaj ikonu s veľkosťou 512x512');
    else addFinding('icons', 'pass', 'Ikona 512x512 je prítomná');

    if (!hasMaskable) addFinding('icons', 'warning', 'Chýba maskable ikona', 'Pridaj ikonu s "purpose": "maskable" pre lepšie zobrazenie na Android');
    else addFinding('icons', 'pass', 'Maskable ikona je prítomná');

    // Check "any maskable" anti-pattern
    const hasAnyMaskable = manifest.icons.some(i => i.purpose === 'any maskable');
    if (hasAnyMaskable) {
      addFinding('icons', 'warning', 'Ikona s "purpose": "any maskable" — použi samostatné ikony', 'Rozdeľ na dve ikony: jednu s "any" a druhú s "maskable"');
    }
  }

  // Screenshots
  if (!manifest.screenshots || manifest.screenshots.length === 0) {
    addFinding('manifest', 'warning', 'Chýbajú screenshots pre Richer Install UI', 'Pridaj screenshots do manifestu pre lepší install dialog');
  }

  // Description
  if (!manifest.description) {
    addFinding('manifest', 'warning', 'Chýba description', 'Pridaj popis aplikácie');
  }

  return manifest;
}

// === SERVICE WORKER CHECK ===

function checkServiceWorker() {
  const swNames = ['sw.js', 'service-worker.js', 'serviceworker.js', 'firebase-messaging-sw.js'];
  let swPath = null;

  for (const name of swNames) {
    const fullPath = path.join(projectDir, name);
    if (fs.existsSync(fullPath)) {
      swPath = fullPath;
      break;
    }
    const publicPath = path.join(projectDir, 'public', name);
    if (fs.existsSync(publicPath)) {
      swPath = publicPath;
      break;
    }
    const srcPath = path.join(projectDir, 'src', name);
    if (fs.existsSync(srcPath)) {
      swPath = srcPath;
      break;
    }
  }

  if (!swPath) {
    addFinding('service-worker', 'error', 'Service Worker súbor nebol nájdený', 'Vytvor sw.js v root priečinku projektu');
    return;
  }

  addFinding('service-worker', 'pass', `Service Worker nájdený: ${path.basename(swPath)}`);

  const content = fs.readFileSync(swPath, 'utf8');

  // Check install event
  if (content.includes("addEventListener('install'") || content.includes('addEventListener("install"')) {
    addFinding('service-worker', 'pass', 'Install event handler je prítomný');
  } else {
    addFinding('service-worker', 'warning', 'Chýba install event handler', 'Pridaj install event pre precaching');
  }

  // Check activate event
  if (content.includes("addEventListener('activate'") || content.includes('addEventListener("activate"')) {
    addFinding('service-worker', 'pass', 'Activate event handler je prítomný');
  } else {
    addFinding('service-worker', 'warning', 'Chýba activate event handler', 'Pridaj activate event pre cache cleanup');
  }

  // Check fetch event
  if (content.includes("addEventListener('fetch'") || content.includes('addEventListener("fetch"')) {
    addFinding('service-worker', 'pass', 'Fetch event handler je prítomný');
  } else {
    addFinding('service-worker', 'error', 'Chýba fetch event handler', 'Pridaj fetch event pre cache stratégiu');
  }

  // Check offline fallback
  if (content.includes('offline')) {
    addFinding('service-worker', 'pass', 'Offline handling je pravdepodobne implementovaný');
  } else {
    addFinding('service-worker', 'warning', 'Nedetekovaný offline handling', 'Pridaj offline fallback stránku');
  }

  // Check cache versioning
  if (content.match(/['"](.*-v\d+|cache-\d+|precache|CACHE_NAME)['"]/)) {
    addFinding('service-worker', 'pass', 'Cache versioning je implementovaný');
  } else {
    addFinding('service-worker', 'warning', 'Nedetekované cache versioning', 'Použi verzie v cache názvoch (napr. "app-cache-v1")');
  }

  // Check skipWaiting
  if (content.includes('skipWaiting')) {
    addFinding('service-worker', 'pass', 'skipWaiting() je implementovaný');
  }

  // Check clients.claim
  if (content.includes('clients.claim')) {
    addFinding('service-worker', 'pass', 'clients.claim() je implementovaný');
  }
}

// === HTML CHECK ===

function checkHTML() {
  const htmlPaths = ['index.html', 'public/index.html', 'src/index.html', 'dist/index.html'];
  let htmlPath = null;

  for (const p of htmlPaths) {
    const fullPath = path.join(projectDir, p);
    if (fs.existsSync(fullPath)) {
      htmlPath = fullPath;
      break;
    }
  }

  if (!htmlPath) {
    addFinding('html', 'warning', 'index.html nebol nájdený pre kontrolu meta tagov');
    return;
  }

  const content = fs.readFileSync(htmlPath, 'utf8');

  // Manifest link
  if (content.includes('rel="manifest"') || content.includes("rel='manifest'")) {
    addFinding('html', 'pass', 'Manifest je linkovaný v HTML');
  } else {
    addFinding('html', 'error', 'Manifest nie je linkovaný v HTML', 'Pridaj <link rel="manifest" href="/manifest.webmanifest"> do <head>');
  }

  // Theme color
  if (content.includes('name="theme-color"') || content.includes("name='theme-color'")) {
    addFinding('html', 'pass', 'Theme-color meta tag je prítomný');
  } else {
    addFinding('html', 'warning', 'Chýba theme-color meta tag', 'Pridaj <meta name="theme-color" content="#...">');
  }

  // Viewport
  if (content.includes('name="viewport"') || content.includes("name='viewport'")) {
    addFinding('html', 'pass', 'Viewport meta tag je prítomný');
  } else {
    addFinding('html', 'error', 'Chýba viewport meta tag', 'Pridaj <meta name="viewport" content="width=device-width, initial-scale=1">');
  }

  // SW registration
  if (content.includes('serviceWorker') || content.includes('service-worker')) {
    addFinding('html', 'pass', 'Service Worker registrácia detekovaná v HTML');
  } else {
    addFinding('html', 'warning', 'Service Worker registrácia nie je v HTML', 'Pridaj SW registráciu do HTML alebo main JS');
  }

  // Apple meta tags
  if (content.includes('apple-mobile-web-app-capable')) {
    addFinding('html', 'pass', 'iOS apple-mobile-web-app-capable je nastavený');
  } else {
    addFinding('html', 'warning', 'Chýba apple-mobile-web-app-capable pre iOS', 'Pridaj <meta name="apple-mobile-web-app-capable" content="yes">');
  }

  // Apple touch icon
  if (content.includes('apple-touch-icon')) {
    addFinding('html', 'pass', 'Apple Touch Icon je prítomný');
  } else {
    addFinding('html', 'warning', 'Chýba Apple Touch Icon', 'Pridaj <link rel="apple-touch-icon" href="...">');
  }
}

// === OFFLINE PAGE CHECK ===

function checkOfflinePage() {
  const offlineNames = ['offline.html', 'public/offline.html', 'dist/offline.html'];
  let found = false;

  for (const name of offlineNames) {
    if (fs.existsSync(path.join(projectDir, name))) {
      found = true;
      addFinding('offline', 'pass', `Offline stránka nájdená: ${name}`);
      break;
    }
  }

  if (!found) {
    addFinding('offline', 'warning', 'Offline fallback stránka nebola nájdená', 'Vytvor offline.html s brandingom a informáciou o offline stave');
  }
}

// === RUN AUDIT ===

console.log('🔍 PWA Audit — Antigravity Sub-Agent');
console.log('=====================================');
console.log(`Projekt: ${path.resolve(projectDir)}\n`);

checkManifest();
checkServiceWorker();
checkHTML();
checkOfflinePage();

// === REPORT ===

const percentage = report.maxScore > 0 ? Math.round((report.score / report.maxScore) * 100) : 0;

console.log('\n📊 VÝSLEDKY AUDITU');
console.log('==================');
console.log(`Skóre: ${report.score}/${report.maxScore} (${percentage}%)\n`);

if (report.errors.length > 0) {
  console.log(`❌ CHYBY (${report.errors.length}):`);
  report.errors.forEach(e => {
    console.log(`  • [${e.category}] ${e.message}`);
    if (e.fix) console.log(`    → Fix: ${e.fix}`);
  });
  console.log();
}

if (report.warnings.length > 0) {
  console.log(`⚠️  VAROVANIA (${report.warnings.length}):`);
  report.warnings.forEach(w => {
    console.log(`  • [${w.category}] ${w.message}`);
    if (w.fix) console.log(`    → Fix: ${w.fix}`);
  });
  console.log();
}

if (report.passed.length > 0) {
  console.log(`✅ PREŠLO (${report.passed.length}):`);
  report.passed.forEach(p => {
    console.log(`  • [${p.category}] ${p.message}`);
  });
}

// Output JSON report
const reportPath = path.join(projectDir, 'pwa-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Kompletný report uložený do: ${reportPath}`);
