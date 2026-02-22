#!/usr/bin/env node

/**
 * Next.js Security Scanner — Antigravity Sub-Agent
 *
 * Automatický statický bezpečnostný skener pre Next.js projekty.
 * Prechádza celý projekt a hľadá známe bezpečnostné vzory.
 *
 * Použitie:
 *   node scripts/security-scan.js --dir /path/to/nextjs-project
 *
 * Výstup: Štruktúrovaný JSON a čitateľný report.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let projectDir = '.';
let outputFormat = 'both'; // json, text, both

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) projectDir = args[i + 1];
  if (args[i] === '--format' && args[i + 1]) outputFormat = args[i + 1];
}

// ============================================================
// UTILITIES
// ============================================================

const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', '.turbo', 'coverage'];
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.ts', 'middleware.ts', 'middleware.js'];

function walkDir(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (IGNORE_DIRS.includes(item) || item.startsWith('.')) continue;
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, files);
      } else if (CODE_EXTENSIONS.includes(path.extname(fullPath))) {
        files.push(fullPath);
      }
    }
  } catch (e) { /* skip unreadable dirs */ }
  return files;
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function relativePath(filePath) {
  return path.relative(projectDir, filePath);
}

function findLineNumber(content, match) {
  const idx = content.indexOf(match);
  if (idx === -1) return 0;
  return content.substring(0, idx).split('\n').length;
}

// ============================================================
// FINDINGS COLLECTOR
// ============================================================

const findings = [];

function addFinding(severity, category, message, file, line, fix) {
  findings.push({
    severity,     // CRITICAL, HIGH, MEDIUM, LOW, INFO
    category,     // auth, injection, config, exposure, etc.
    message,
    file: file ? relativePath(file) : null,
    line: line || null,
    fix: fix || null,
  });
}

// ============================================================
// SCANNERS
// ============================================================

function scanForSecrets(files) {
  const secretPatterns = [
    { regex: /sk_live_[a-zA-Z0-9]{20,}/g, name: 'Stripe Secret Key' },
    { regex: /sk_test_[a-zA-Z0-9]{20,}/g, name: 'Stripe Test Secret Key' },
    { regex: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
    { regex: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token' },
    { regex: /github_pat_[a-zA-Z0-9_]{82}/g, name: 'GitHub PAT (fine-grained)' },
    { regex: /xoxb-[0-9]{10,}-[a-zA-Z0-9]{20,}/g, name: 'Slack Bot Token' },
    { regex: /xoxp-[0-9]{10,}-[a-zA-Z0-9]{20,}/g, name: 'Slack User Token' },
    { regex: /AIza[a-zA-Z0-9_-]{35}/g, name: 'Google API Key' },
    { regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, name: 'Private Key' },
    { regex: /mongodb\+srv:\/\/[^\s"']+/g, name: 'MongoDB Connection String' },
    { regex: /postgres:\/\/[^\s"']+/g, name: 'PostgreSQL Connection String' },
    { regex: /mysql:\/\/[^\s"']+/g, name: 'MySQL Connection String' },
  ];

  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;

    for (const pattern of secretPatterns) {
      const matches = content.match(pattern.regex);
      if (matches) {
        for (const match of matches) {
          const line = findLineNumber(content, match);
          addFinding('CRITICAL', 'secrets', `Hardcoded ${pattern.name} found`, file, line,
            'Move to environment variable and add to .gitignore');
        }
      }
    }
  }
}

function scanEnvFiles() {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production', '.env.example'];

  for (const envFile of envFiles) {
    const filePath = path.join(projectDir, envFile);
    const content = readFileSafe(filePath);
    if (!content) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      // NEXT_PUBLIC_ with secrets
      if (/^NEXT_PUBLIC_.*(?:SECRET|PRIVATE|PASSWORD|KEY(?!_ID))/i.test(line) &&
          !/PUBLIC_KEY|PUBLISHABLE/i.test(line)) {
        addFinding('CRITICAL', 'env', `Server secret exposed via NEXT_PUBLIC_: ${line.split('=')[0]}`,
          filePath, i + 1, 'Remove NEXT_PUBLIC_ prefix — this exposes the value to the client browser');
      }
    }

    // Check if .env.local is in gitignore
    if (envFile === '.env.local' || envFile === '.env') {
      const gitignore = readFileSafe(path.join(projectDir, '.gitignore'));
      if (gitignore && !gitignore.includes(envFile)) {
        addFinding('HIGH', 'env', `${envFile} may not be in .gitignore`, filePath, null,
          `Add ${envFile} to .gitignore`);
      }
    }
  }
}

function scanDangerousPatterns(files) {
  const patterns = [
    {
      regex: /dangerouslySetInnerHTML/g,
      severity: 'HIGH', category: 'xss',
      message: 'dangerouslySetInnerHTML used — potential XSS if user input is not sanitized',
      fix: 'Sanitize with DOMPurify before rendering'
    },
    {
      regex: /\$queryRawUnsafe|\$executeRawUnsafe/g,
      severity: 'CRITICAL', category: 'injection',
      message: 'Unsafe raw query — SQL injection risk',
      fix: 'Use parameterized queries or $queryRaw with tagged template literals'
    },
    {
      regex: /\$queryRaw|\$executeRaw/g,
      severity: 'MEDIUM', category: 'injection',
      message: 'Raw query detected — verify input is parameterized',
      fix: 'Ensure template literals use Prisma parameterization, not string interpolation'
    },
    {
      regex: /eval\s*\(/g,
      severity: 'CRITICAL', category: 'injection',
      message: 'eval() used — potential code injection',
      fix: 'Remove eval() and use safe alternatives'
    },
    {
      regex: /new\s+Function\s*\(/g,
      severity: 'HIGH', category: 'injection',
      message: 'new Function() used — similar risk to eval()',
      fix: 'Replace with safe alternative'
    },
    {
      regex: /child_process|exec\(|execSync|spawn\(/g,
      severity: 'HIGH', category: 'injection',
      message: 'Command execution detected — potential command injection',
      fix: 'Use execFile() instead of exec(), validate all inputs'
    },
    {
      regex: /\.innerHTML\s*=/g,
      severity: 'HIGH', category: 'xss',
      message: 'innerHTML assignment — XSS risk',
      fix: 'Use textContent or sanitize input with DOMPurify'
    },
    {
      regex: /document\.write/g,
      severity: 'HIGH', category: 'xss',
      message: 'document.write used — XSS risk',
      fix: 'Use DOM manipulation methods instead'
    },
    {
      regex: /Math\.random\(\)/g,
      severity: 'LOW', category: 'crypto',
      message: 'Math.random() used — not cryptographically secure',
      fix: 'Use crypto.randomUUID() or crypto.randomBytes() for security-sensitive values'
    },
    {
      regex: /createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/g,
      severity: 'HIGH', category: 'crypto',
      message: 'Weak hash algorithm (MD5/SHA1) used',
      fix: 'Use bcrypt, argon2, or SHA-256+ for password hashing'
    },
  ];

  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;

    for (const pattern of patterns) {
      const matches = content.match(pattern.regex);
      if (matches) {
        for (const match of matches) {
          const line = findLineNumber(content, match);
          addFinding(pattern.severity, pattern.category, pattern.message, file, line, pattern.fix);
        }
      }
    }
  }
}

function scanServerActions(files) {
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;

    if (!content.includes('"use server"') && !content.includes("'use server'")) continue;

    // Check for auth in server actions
    const hasAuth = /getServerSession|auth\(\)|getSession|currentUser|getUser|requireAuth|checkAuth/
      .test(content);

    if (!hasAuth) {
      addFinding('HIGH', 'auth', 'Server Action file without apparent auth check', file, 1,
        'Add authentication check at the beginning of each server action');
    }

    // Check for input validation
    const hasValidation = /z\.object|z\.string|zod|valibot|joi|yup|safeParse|validate|schema/
      .test(content);

    if (!hasValidation) {
      addFinding('MEDIUM', 'validation', 'Server Action file without apparent input validation', file, 1,
        'Add input validation using zod, valibot, or similar library');
    }
  }
}

function scanApiRoutes(files) {
  for (const file of files) {
    if (!file.includes('/api/') && !file.match(/route\.(ts|js)$/)) continue;

    const content = readFileSafe(file);
    if (!content) continue;

    // Check exported HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const exportedMethods = methods.filter(m =>
      content.includes(`export async function ${m}`) ||
      content.includes(`export function ${m}`) ||
      content.includes(`export const ${m}`)
    );

    if (exportedMethods.length === 0) continue;

    // Auth check
    const hasAuth = /getServerSession|auth\(\)|getSession|currentUser|getUser|requireAuth|verify|token/i
      .test(content);

    if (!hasAuth && !file.includes('/api/public') && !file.includes('/api/health') &&
        !file.includes('/api/webhook')) {
      addFinding('HIGH', 'auth', `API route without auth check: ${exportedMethods.join(', ')}`, file, 1,
        'Add authentication middleware or check at the beginning of the handler');
    }

    // Input validation for mutation methods
    const hasMutation = exportedMethods.some(m => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m));
    const hasValidation = /z\.object|safeParse|validate|schema|zod/i.test(content);

    if (hasMutation && !hasValidation) {
      addFinding('MEDIUM', 'validation', 'API mutation route without input validation', file, 1,
        'Validate request body using zod or similar');
    }
  }
}

function scanNextConfig() {
  const configNames = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  let configFile = null;
  let content = null;

  for (const name of configNames) {
    const fullPath = path.join(projectDir, name);
    content = readFileSafe(fullPath);
    if (content) { configFile = fullPath; break; }
  }

  if (!content) {
    addFinding('INFO', 'config', 'next.config file not found', null, null, null);
    return;
  }

  // poweredByHeader
  if (!content.includes('poweredByHeader') || content.includes('poweredByHeader: true')) {
    addFinding('LOW', 'config', 'X-Powered-By header not disabled', configFile, null,
      'Add poweredByHeader: false to next.config');
  }

  // Security headers
  if (!content.includes('X-Content-Type-Options') && !content.includes('headers()')) {
    addFinding('MEDIUM', 'headers', 'Security headers not configured in next.config', configFile, null,
      'Add security headers via headers() in next.config');
  }

  // Image wildcard
  if (content.includes("hostname: '**'") || content.includes('hostname: "**"') ||
      content.includes("hostname: '*'") || content.includes('hostname: "*"')) {
    addFinding('HIGH', 'config', 'Image remotePatterns allows all hostnames — SSRF risk', configFile,
      findLineNumber(content, 'hostname'), 'Restrict to specific hostnames');
  }

  // Server actions allowed origins
  if (content.includes("allowedOrigins") && content.includes("'*'")) {
    addFinding('CRITICAL', 'config', 'Server Actions allowedOrigins set to * — CSRF bypass', configFile,
      findLineNumber(content, 'allowedOrigins'), 'Set specific allowed origins');
  }
}

function scanMiddleware() {
  const middlewarePaths = ['middleware.ts', 'middleware.js', 'src/middleware.ts', 'src/middleware.js'];
  let found = false;

  for (const mw of middlewarePaths) {
    const fullPath = path.join(projectDir, mw);
    if (fs.existsSync(fullPath)) {
      found = true;
      const content = readFileSafe(fullPath);

      // Check matcher configuration
      if (content && content.includes('matcher')) {
        const matcherMatch = content.match(/matcher\s*:\s*\[([\s\S]*?)\]/);
        if (matcherMatch) {
          // Count how many specific routes vs catch-all
          const routes = matcherMatch[1].match(/['"][^'"]+['"]/g) || [];
          if (routes.length > 5 && !routes.some(r => r.includes('(?!'))) {
            addFinding('MEDIUM', 'auth', 'Middleware uses explicit route list — new routes may not be protected',
              fullPath, null, 'Consider negative lookahead matcher to protect all routes by default');
          }
        }
      }
      break;
    }
  }

  if (!found) {
    addFinding('MEDIUM', 'auth', 'No middleware.ts found — consider adding auth middleware', null, null,
      'Create middleware.ts for centralized auth and security header enforcement');
  }
}

function scanRateLimiting(files) {
  let hasRateLimiting = false;

  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    if (/rateLimit|rate-limit|upstash.*ratelimit|@upstash\/ratelimit|limiter/i.test(content)) {
      hasRateLimiting = true;
      break;
    }
  }

  // Also check package.json
  const pkgJson = readFileSafe(path.join(projectDir, 'package.json'));
  if (pkgJson && /rate-limit|ratelimit|limiter/i.test(pkgJson)) {
    hasRateLimiting = true;
  }

  if (!hasRateLimiting) {
    addFinding('HIGH', 'dos', 'No rate limiting detected in the project', null, null,
      'Add rate limiting to API routes and auth endpoints (e.g., @upstash/ratelimit)');
  }
}

function scanDependencies() {
  const pkgPath = path.join(projectDir, 'package.json');
  const content = readFileSafe(pkgPath);
  if (!content) return;

  try {
    const pkg = JSON.parse(content);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Check for known problematic patterns
    if (!allDeps['server-only']) {
      addFinding('MEDIUM', 'exposure', 'server-only package not installed', pkgPath, null,
        'Install server-only: npm i server-only — use it in server-only modules to prevent client imports');
    }

    // Check Next.js version
    const nextVersion = allDeps['next'];
    if (nextVersion) {
      const major = parseInt(nextVersion.replace(/[\^~]/, '').split('.')[0]);
      if (major < 14) {
        addFinding('HIGH', 'deps', `Next.js version ${nextVersion} may have known vulnerabilities`, pkgPath, null,
          'Upgrade to Next.js 14+ for latest security patches');
      }
    }

  } catch (e) {
    addFinding('INFO', 'deps', 'Could not parse package.json', pkgPath, null, null);
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('🔒 Next.js Security Scanner — Antigravity');
console.log('==========================================');
console.log(`Project: ${path.resolve(projectDir)}\n`);
console.log('Scanning...\n');

const allFiles = walkDir(projectDir);
console.log(`Found ${allFiles.length} source files to scan.\n`);

// Run all scanners
scanForSecrets(allFiles);
scanEnvFiles();
scanDangerousPatterns(allFiles);
scanServerActions(allFiles);
scanApiRoutes(allFiles);
scanNextConfig();
scanMiddleware();
scanRateLimiting(allFiles);
scanDependencies();

// ============================================================
// REPORT
// ============================================================

// Sort by severity
const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

const counts = {
  CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
  HIGH: findings.filter(f => f.severity === 'HIGH').length,
  MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
  LOW: findings.filter(f => f.severity === 'LOW').length,
  INFO: findings.filter(f => f.severity === 'INFO').length,
};

const overallRisk = counts.CRITICAL > 0 ? 'CRITICAL' :
                    counts.HIGH > 0 ? 'HIGH' :
                    counts.MEDIUM > 0 ? 'MEDIUM' : 'LOW';

// Text output
console.log('📊 SCAN RESULTS');
console.log('================');
console.log(`Overall Risk: ${overallRisk}`);
console.log(`Total Findings: ${findings.length}`);
console.log(`  🔴 Critical: ${counts.CRITICAL}`);
console.log(`  🟠 High:     ${counts.HIGH}`);
console.log(`  🟡 Medium:   ${counts.MEDIUM}`);
console.log(`  🔵 Low:      ${counts.LOW}`);
console.log(`  ⚪ Info:     ${counts.INFO}`);
console.log();

const severityEmoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', INFO: '⚪' };

for (const finding of findings) {
  const emoji = severityEmoji[finding.severity];
  const location = finding.file ? `${finding.file}${finding.line ? ':' + finding.line : ''}` : 'project-wide';
  console.log(`${emoji} [${finding.severity}] [${finding.category}] ${finding.message}`);
  console.log(`   📍 ${location}`);
  if (finding.fix) console.log(`   🔧 ${finding.fix}`);
  console.log();
}

// JSON output
const report = {
  timestamp: new Date().toISOString(),
  projectDir: path.resolve(projectDir),
  filesScanned: allFiles.length,
  overallRisk,
  counts,
  findings,
};

const reportPath = path.join(projectDir, 'security-scan-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 JSON report saved to: ${reportPath}`);

// Exit with error code if critical/high findings
if (counts.CRITICAL > 0) process.exit(2);
if (counts.HIGH > 0) process.exit(1);
process.exit(0);
