const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const browsers = ['chrome', 'firefox', 'edge', 'brave', 'thunderbird'];

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`Usage: npm run package -- [--browser=${browsers.join('|')}]`);
    return;
  }
  let browser;
  if (args.length === 1 && args[0].startsWith('--browser=')) browser = args[0].slice(10);
  else if (args.length === 2 && args[0] === '--browser') browser = args[1];
  else if (args.length) throw new Error('Expected --browser=<browser>. Use --help for usage.');

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (!browser) {
    let branch;
    try {
      branch = execFileSync('git', ['branch', '--show-current'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    } catch (_) { /* An exported source tree may not contain Git metadata. */ }
    if (branch === 'master' || branch === 'main') browser = 'chrome';
    else if (browsers.includes(branch)) browser = branch;
    else if (branch === 'firefox-mv3') browser = 'firefox';
    else throw new Error('Cannot infer browser from this checkout. Pass --browser=<browser>.');
  }
  if (!browsers.includes(browser)) throw new Error(`Unknown browser: ${browser}`);
  if (typeof manifest.version !== 'string' || !/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) {
    throw new Error('manifest.json must contain a numeric extension version.');
  }
  const gecko = manifest.browser_specific_settings?.gecko || manifest.applications?.gecko;
  if (gecko && !['firefox', 'thunderbird'].includes(browser)) {
    throw new Error(`This manifest has Gecko settings; refusing to label it ${browser}.`);
  }

  const files = ['_locales', 'css', 'img', 'js', 'sound', 'manifest.json'];
  files.push(...fs.readdirSync(root).filter(name => name.endsWith('.html')).sort());
  if (fs.existsSync(path.join(root, 'background.js'))) files.push('background.js');
  const build = path.join(root, 'build');
  fs.mkdirSync(build, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(build, '.package-'));
  const output = path.join(build, `read-aloud-${browser}-${manifest.version}.zip`);
  try {
    const archive = path.join(temporary, 'package.zip');
    execFileSync('zip', ['-q', '-r', '-X', '-MM', archive, ...files, '-x', '*.map', '*.DS_Store'], {cwd: root, stdio: 'inherit'});
    fs.renameSync(archive, output);
    console.log(`Packaged ${browser} ${manifest.version}: ${output}`);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

try {
  main();
} catch (error) {
  console.error(`Packaging failed: ${error.message}`);
  process.exitCode = 1;
}
