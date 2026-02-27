#!/usr/bin/env node

/**
 * Legal Compliance Scanner — Antigravity Sub-Agent
 *
 * Skenuje Next.js / webový projekt a hľadá právne nedostatky:
 * - Prítomnosť právnych dokumentov (VOP, GDPR, cookies)
 * - Cookie consent implementácia
 * - Checkout flow povinné prvky
 * - Footer povinné odkazy
 * - Newsletter opt-in mechanizmus
 *
 * Použitie:
 *   node scripts/legal-scan.js --dir /path/to/project
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let projectDir = '.';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) projectDir = args[i + 1];
}

const IGNORE = ['node_modules', '.next', '.git', 'dist', 'build', '.turbo'];
const EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js', '.html', '.md', '.mdx'];

const findings = [];

function addFinding(severity, category, message, file, fix) {
  findings.push({ severity, category, message, file: file ? path.relative(projectDir, file) : null, fix });
}

function walkDir(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (IGNORE.includes(item) || item.startsWith('.')) continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walkDir(full, files);
      else if (EXTENSIONS.includes(path.extname(full))) files.push(full);
    }
  } catch {}
  return files;
}

function readSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

// ============================================================
// SCANNERS
// ============================================================

function scanLegalPages(files) {
  const legalPatterns = {
    'VOP / Obchodné podmienky': /terms|vop|obchodn[eé][\s-]podmienk|conditions|terms[\s-]of[\s-]service/i,
    'Privacy Policy / GDPR': /privacy|gdpr|ochrana[\s-]osobn[yý]ch[\s-][uú]dajov|data[\s-]protection/i,
    'Cookie Policy': /cookie[\s-]polic|cookie[\s-]s[uú]bor/i,
    'Reklamačný poriadok': /reklama[cč]n[yý][\s-]poriadok|complaint|reklamáci/i,
  };

  const foundDocs = {};

  for (const file of files) {
    const name = path.basename(file).toLowerCase();
    const content = readSafe(file);

    for (const [docName, regex] of Object.entries(legalPatterns)) {
      if (regex.test(name) || regex.test(content.substring(0, 500))) {
        foundDocs[docName] = true;
      }
    }
  }

  for (const [docName] of Object.entries(legalPatterns)) {
    if (!foundDocs[docName]) {
      addFinding('CRITICAL', 'documents', `Chýba právny dokument: ${docName}`, null,
        `Vytvorte stránku s ${docName} a pridajte ju do footer-a webu`);
    }
  }
}

function scanCookieConsent(files) {
  let hasCookieBanner = false;
  let hasConsentMode = false;
  let blocksBeforeConsent = false;

  for (const file of files) {
    const content = readSafe(file);

    // Cookie banner / consent
    if (/cookie[\s-]?consent|cookie[\s-]?banner|CookieConsent|cookieconsent|OneTrust|Cookiebot|CookieYes/i.test(content)) {
      hasCookieBanner = true;
    }

    // Google Consent Mode
    if (/consent.*default|gtag.*consent|consentMode/i.test(content)) {
      hasConsentMode = true;
    }

    // Check if GA/GTM loads WITHOUT consent check
    if (/googletagmanager|google-analytics|gtag\.js|GA_MEASUREMENT_ID/i.test(content)) {
      if (!/consent|cookie/i.test(content)) {
        addFinding('CRITICAL', 'cookies', 'Google Analytics/GTM sa načítava bez cookie consent kontroly', file,
          'Implementujte Google Consent Mode v2 a blokujte GA pred udelením súhlasu');
      }
    }

    // Facebook Pixel without consent
    if (/fbevents\.js|facebook.*pixel|fbq\(/i.test(content)) {
      if (!/consent|cookie/i.test(content)) {
        addFinding('CRITICAL', 'cookies', 'Facebook Pixel sa načítava bez cookie consent', file,
          'Blokujte Facebook Pixel pred udelením marketingového cookie súhlasu');
      }
    }
  }

  if (!hasCookieBanner) {
    addFinding('CRITICAL', 'cookies', 'Nebola nájdená implementácia cookie consent banneru', null,
      'Implementujte cookie consent banner (napr. Cookiebot, OneTrust, CookieYes, alebo vlastný)');
  }

  if (!hasConsentMode) {
    addFinding('HIGH', 'cookies', 'Google Consent Mode v2 nebol detekovaný', null,
      'Implementujte Google Consent Mode v2 pre compliance s EÚ požiadavkami');
  }
}

function scanCheckoutFlow(files) {
  let hasPaymentButton = false;
  let hasVopCheckbox = false;
  let hasPrivacyCheckbox = false;
  let hasDigitalConsentCheckbox = false;

  for (const file of files) {
    const content = readSafe(file);

    // Payment / checkout related files
    if (!/checkout|payment|billing|subscribe|pricing|objedn/i.test(file + content)) continue;

    // Payment button text
    if (/s povinnosťou platby|objednať a zaplatiť|záväzne objednať|place order with payment/i.test(content)) {
      hasPaymentButton = true;
    }
    // Bad button texts
    if (/["'](?:Pokračovať|Odoslať|Submit|Continue|Dokončiť)["']/i.test(content) &&
        /payment|platb|stripe|checkout/i.test(content)) {
      addFinding('HIGH', 'checkout', 'Objednávacie tlačidlo neuvádza povinnosť platby', file,
        'Zmeňte text tlačidla na "Objednávka s povinnosťou platby" alebo "Záväzne objednať a zaplatiť"');
    }

    // VOP checkbox
    if (/vop|obchodn[eé][\s-]podmienk|terms/i.test(content) && /checkbox|check.*box|input.*type.*check/i.test(content)) {
      hasVopCheckbox = true;
    }

    // Privacy checkbox
    if (/ochran.*[uú]daj|privacy|gdpr/i.test(content) && /checkbox|check.*box|input.*type.*check/i.test(content)) {
      hasPrivacyCheckbox = true;
    }

    // Digital content consent
    if (/za[cč]at.*poskytovan|stráca.*právo.*odstúp|digital.*consent/i.test(content)) {
      hasDigitalConsentCheckbox = true;
    }
  }

  if (!hasVopCheckbox) {
    addFinding('HIGH', 'checkout', 'Chýba checkbox "Oboznámil som sa s VOP" v checkout procese', null,
      'Pridajte povinný checkbox s odkazom na VOP pred tlačidlom objednávky');
  }

  if (!hasDigitalConsentCheckbox) {
    addFinding('HIGH', 'checkout', 'Chýba súhlas so začatím poskytovania digitálnej služby', null,
      'Pridajte checkbox: "Žiadam o okamžité začatie poskytovania a beriem na vedomie stratu práva na odstúpenie"');
  }
}

function scanNewsletter(files) {
  for (const file of files) {
    const content = readSafe(file);

    if (!/newsletter|subscribe|odb[eě]r|mailing/i.test(content)) continue;

    // Pre-checked newsletter checkbox
    if (/defaultChecked|checked={true}|checked="checked"/i.test(content) &&
        /newsletter|marketing|subscribe/i.test(content)) {
      addFinding('CRITICAL', 'gdpr', 'Newsletter checkbox je predvolene zaškrtnutý', file,
        'Newsletter súhlas NESMIE byť predvolene zaškrtnutý — musí to byť aktívny opt-in');
    }

    // Double opt-in check
    if (/newsletter|subscribe/i.test(content)) {
      if (!/confirm|verif|double.*opt|potvrdi/i.test(content)) {
        addFinding('MEDIUM', 'gdpr', 'Newsletter nemá implementovaný double opt-in', file,
          'Implementujte double opt-in pre newsletter (potvrdenie cez e-mail)');
      }
    }
  }
}

function scanFooter(files) {
  let footerFound = false;
  let hasLegalLinks = false;

  for (const file of files) {
    const content = readSafe(file);
    const nameLower = path.basename(file).toLowerCase();

    if (!/footer|layout/i.test(nameLower) && !/footer/i.test(content)) continue;
    footerFound = true;

    // Check for legal links in footer
    const legalTerms = ['terms', 'vop', 'privacy', 'gdpr', 'cookie', 'reklamáci'];
    const hasLinks = legalTerms.filter(t => content.toLowerCase().includes(t));

    if (hasLinks.length >= 2) {
      hasLegalLinks = true;
    }
  }

  if (footerFound && !hasLegalLinks) {
    addFinding('HIGH', 'ui', 'Footer neobsahuje odkazy na právne dokumenty', null,
      'Pridajte do footer-a odkazy na: VOP, Ochrana osobných údajov, Cookie policy, Reklamačný poriadok');
  }
}

function scanContactInfo(files) {
  let hasIco = false;
  let hasEmail = false;
  let hasPhone = false;

  for (const file of files) {
    const content = readSafe(file);

    if (/I[ČC]O[\s:]*\d{6,8}/i.test(content)) hasIco = true;
    if (/DI[ČC][\s:]/i.test(content)) hasIco = true; // DIČ implies business
    if (/[\w.-]+@[\w.-]+\.\w{2,}/i.test(content) && /kontakt|contact|footer|about/i.test(file)) hasEmail = true;
    if (/\+\d{10,12}|\d{3}[\s/-]\d{3}[\s/-]\d{3,4}/i.test(content) && /kontakt|contact|footer/i.test(file)) hasPhone = true;
  }

  if (!hasIco) {
    addFinding('CRITICAL', 'identification', 'IČO obchodníka nebolo nájdené na webe', null,
      'Uveďte IČO, DIČ, IČ DPH a registráciu spoločnosti na stránke (footer alebo kontakt)');
  }
}

function scanUnsubscribe(files) {
  let hasUnsubMechanism = false;

  for (const file of files) {
    const content = readSafe(file);

    if (/unsubscribe|odhlásiť|zrušiť.*predplatn|cancel.*subscription/i.test(content)) {
      hasUnsubMechanism = true;
    }
  }

  if (!hasUnsubMechanism) {
    addFinding('HIGH', 'subscription', 'Nebol nájdený mechanizmus na zrušenie predplatného', null,
      'Implementujte jednoduchý mechanizmus na zrušenie predplatného v nastaveniach účtu');
  }
}

function scanOdr(files) {
  let hasOdr = false;
  let hasSoi = false;

  for (const file of files) {
    const content = readSafe(file);

    if (/ec\.europa\.eu\/consumers\/odr|odr.*platforma|online.*dispute/i.test(content)) hasOdr = true;
    if (/slovenská obchodná inšpekcia|SOI|soi\.sk/i.test(content)) hasSoi = true;
  }

  if (!hasOdr) {
    addFinding('HIGH', 'ars', 'Chýba odkaz na ODR platformu (ec.europa.eu/consumers/odr)', null,
      'Pridajte odkaz na ODR platformu EÚ do VOP a/alebo footer-a');
  }
  if (!hasSoi) {
    addFinding('HIGH', 'ars', 'Chýba informácia o SOI ako orgáne dozoru', null,
      'Uveďte Slovenskú obchodnú inšpekciu ako orgán dozoru vrátane kontaktných údajov');
  }
}

// ============================================================
// MAIN
// ============================================================

console.log('📋 Legal Compliance Scanner — Antigravity');
console.log('==========================================');
console.log(`Projekt: ${path.resolve(projectDir)}\n`);

const allFiles = walkDir(projectDir);
console.log(`Nájdených ${allFiles.length} súborov na skenovanie.\n`);

scanLegalPages(allFiles);
scanCookieConsent(allFiles);
scanCheckoutFlow(allFiles);
scanNewsletter(allFiles);
scanFooter(allFiles);
scanContactInfo(allFiles);
scanUnsubscribe(allFiles);
scanOdr(allFiles);

// Sort & report
const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

const counts = {};
for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;

const risk = counts.CRITICAL ? 'CRITICAL' : counts.HIGH ? 'HIGH' : counts.MEDIUM ? 'MEDIUM' : 'LOW';
const emoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', INFO: '⚪' };

console.log('📊 VÝSLEDKY SKENU');
console.log('==================');
console.log(`Celkové riziko: ${risk}`);
console.log(`Celkom nálezov: ${findings.length}`);
for (const s of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']) {
  if (counts[s]) console.log(`  ${emoji[s]} ${s}: ${counts[s]}`);
}
console.log();

for (const f of findings) {
  console.log(`${emoji[f.severity]} [${f.severity}] [${f.category}] ${f.message}`);
  if (f.file) console.log(`   📍 ${f.file}`);
  if (f.fix) console.log(`   🔧 ${f.fix}`);
  console.log();
}

// JSON report
const report = {
  timestamp: new Date().toISOString(),
  project: path.resolve(projectDir),
  filesScanned: allFiles.length,
  overallRisk: risk,
  counts,
  findings,
  disclaimer: 'Tento report NIE JE právne poradenstvo. Pre finálne dokumenty konzultujte advokáta.',
};

const reportPath = path.join(projectDir, 'legal-compliance-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 JSON report: ${reportPath}`);
console.log('\n⚠️  DISCLAIMER: Tento sken je orientačný a nenahrádza právne poradenstvo.\n');

if (counts.CRITICAL > 0) process.exit(2);
if (counts.HIGH > 0) process.exit(1);
process.exit(0);
