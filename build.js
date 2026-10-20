const fs = require('fs-extra');
const path = require('path');
const targets = require('./config/targets.json');

const args = process.argv.slice(2);
const targetArg = args.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'all';

async function buildTarget(targetName) {
  const config = targets[targetName];
  if (!config) {
    console.error(`❌ Target "${targetName}" tidak ditemukan di targets.json`);
    return;
  }

  console.log(`🔨 Processing build untuk varian: [${targetName.toUpperCase()}]...`);

  const outputDir = path.join(__dirname, 'dist', targetName);
  await fs.emptyDir(outputDir);

  // 1. Buat Manifest appsscript.json otomatis
  const manifest = {
    timeZone: "Asia/Jakarta",
    dependencies: {},
    exceptionLogging: "STACKDRIVER",
    runtimeVersion: "V8",
    webapp: { executeAs: "USER_DEPLOYING", access: "ANYONE" }
  };
  await fs.writeJson(path.join(outputDir, 'appsscript.json'), manifest, { spaces: 2 });

  // 2. Build Backend (sheets-api.js + gemini-ai.js jika AI aktif)
  let backendCode = "";
  if (await fs.pathExists('src/backend/sheets-api.js')) {
    backendCode += await fs.readFile('src/backend/sheets-api.js', 'utf8');
  }
  if (config.enableAI && await fs.pathExists('src/backend/gemini-ai.js')) {
    backendCode += `\n\n/* ================= GEMINI AI MODULE ================= */\n` + 
                   await fs.readFile('src/backend/gemini-ai.js', 'utf8');
  }
  await fs.writeFile(path.join(outputDir, 'backend.js'), backendCode);

  // 3. Build Frontend (HTML + CSS + Scripts)
  let htmlContent = await fs.pathExists('src/frontend/components/banner.html') ? 
                    await fs.readFile('src/frontend/components/banner.html', 'utf8') : '<h1>MonlyAi</h1>';
  let cssContent = await fs.pathExists('src/frontend/styles/main.css') ? 
                   await fs.readFile('src/frontend/styles/main.css', 'utf8') : '';
  let jsContent = await fs.pathExists('src/frontend/scripts/core.js') ? 
                  await fs.readFile('src/frontend/scripts/core.js', 'utf8') : '';

  if (config.enablePlanner && await fs.pathExists('src/frontend/scripts/planner.js')) {
    jsContent += '\n' + await fs.readFile('src/frontend/scripts/planner.js', 'utf8');
  }
  if (config.enableMultiWallet && await fs.pathExists('src/frontend/scripts/umkm.js')) {
    jsContent += '\n' + await fs.readFile('src/frontend/scripts/umkm.js', 'utf8');
  }

  const bundledHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MonlyAi - ${targetName.toUpperCase()}</title>
  <script src="https://tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cloudflare.com">
  <style>
  ${cssContent}
  </style>
</head>
<body class="bg-slate-100 text-slate-800 font-sans">
  ${htmlContent}
  <script>
  const PRODUCT_CONFIG = ${JSON.stringify(config)};
  ${jsContent}
  </script>
</body>
</html>
  `.trim();

  await fs.writeFile(path.join(outputDir, 'web.html'), bundledHtml);

  // 4. Update file .clasp.json aktif ke target produk ini
  const claspConfig = { scriptId: config.scriptId, rootDir: `./dist/${targetName}` };
  await fs.writeJson('.clasp.json', claspConfig, { spaces: 2 });

  console.log(`✅ Build Berhasil untuk [${targetName}]! Hasil tersimpan di dist/${targetName}/\n`);
}

async function run() {
  if (targetArg === 'all') {
    for (const t of Object.keys(targets)) {
      await buildTarget(t);
    }
    console.log("🎉 SEMUA VARIAN PRODUK BERHASIL DI-BUILD KEDALAM FOLDER DIST!");
  } else {
    await buildTarget(targetArg);
  }
}

run();
