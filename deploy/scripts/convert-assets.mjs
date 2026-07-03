// ============================================
// 心岛计划 — WebP 素材转换脚本 (Beta 0.9.9.2)
// ============================================
// 用途：将 source/ 下的原始 PNG 转换为 WebP
// 依赖：npm install sharp
// 用法：node scripts/convert-assets.mjs
// ============================================

import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');
const SOURCE = join(ASSETS, 'source');

// --- 文件名映射 ---
const PERSONA_MAP = {
  // source/personas-original/ → assets/personas/
  '01-灯塔型.png':      'lighthouse.webp',
  '02-守门人型.png':    'gatekeeper.webp',
  '03-筑巢型.png':      'nest-builder.webp',
  '04-收藏家型.png':    'collector.webp',
  '05-候鸟型.png':      'migratory-bird.webp',
  '06-岛屿型.png':      'islander.webp',
  '07-探险家型.png':    'explorer.webp',
  '08-流浪诗人型.png':  'wandering-poet.webp',
  '09-星火型.png':      'spark.webp',
  '10-月光型.png':      'moonlight.webp',
  '11- 镜像型.png':     'mirror.webp',   // 注意：实际文件名 = "11- 镜像型.png"，中间有空格
  '12-观星者型.png':    'stargazer.webp',
};

const SCENE_MAP = {
  // source/scenes-original/ → assets/scenes/
  // 实际文件名格式: "scene background NN：中文名.png"（全角冒号）
  'scene background 01：靠近海岸.png':  'cl-coast.webp',
  'scene background 02：边界山脊.png':  'au-ridge.webp',
  'scene background 03：回声港湾.png':  'se-harbor.webp',
  'scene background 04：潮汐河流.png':  'ex-river.webp',
  'scene background 05：裂隙火山.png':  'rp-volcano.webp',
  'scene background 06：风向平原.png':  'in-plain.webp',
  'scene background 07：星眠天文台.png':'id-observatory.webp',
  'scene background 08：誓约之塔.png':  'st-tower.webp',
  'scene background 09：灯火码头.png':  'ca-dock.webp',
  'scene background 10：迷雾航线.png':  'nv-fog-route.webp',
  'scene background 11：旧船湾.png':    'me-old-bay.webp',
  'scene background 12：月潮湖.png':    'ev-moon-lake.webp',
};

const RESULT_MAP = {
  // source/ → assets/result/
  '00-航行.png':                    'voyage.webp',
  'result-common-bg.png':           'common-bg.webp',
  'result-main-island-emerge.png':  'main-island.webp',
  'ending-silver-mirror-lake.png':  'silver-lake.webp',
};

// --- 输出尺寸配置 ---
const SIZES = {
  persona: { width: 768, height: 1152, fit: 'inside' },      // 768x1152 主体 (Beta 0.9.9.2)
  personaThumb: { width: 256, height: 384, fit: 'cover' },   // 256x384 缩略图
  scene: { width: 768, height: 1365, fit: 'inside' },        // 768x1365 场景 (Beta 0.9.9.2)
  result: { width: 1200, height: 1600, fit: 'inside' },      // 结果页保持较大 (Beta 0.9.9.2)
};

// --- 质量配置 ---
const QUALITY = {
  persona: { quality: 84, effort: 4 },        // 120-240KB 目标 (Beta 0.9.9.2)
  personaThumb: { quality: 80, effort: 4 },   // 20-60KB 目标 (Beta 0.9.9.2)
  scene: { quality: 82, effort: 4 },          // 80-180KB 目标 (Beta 0.9.9.2)
  result: { quality: 83, effort: 4 },         // 150-320KB 目标 (Beta 0.9.9.2)
};

let sharp;
try {
  sharp = (await import('sharp')).default;
  console.log('✅ sharp 已加载');
} catch (e) {
  console.error('❌ 请先安装 sharp：npm install sharp');
  console.error('   然后重新运行：node scripts/convert-assets.mjs');
  process.exit(1);
}

// --- 工具函数 ---
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 创建目录: ${dir}`);
  }
}

function findSourceFile(sourceDir, targetName) {
  if (!existsSync(sourceDir)) return null;
  const files = readdirSync(sourceDir);
  // 1. Exact match
  let found = files.find(f => f === targetName);
  // 2. Trim whitespace (handles "11- 镜像型.png")
  if (!found) found = files.find(f => f.trim() === targetName.trim());
  // 3. Normalize colons (全角 ：↔ 半角 : ↔ 英文空格)
  if (!found) {
    const normalized = targetName.replace(/：/g, ':').replace(/：/g, ':').trim();
    found = files.find(f => f.replace(/：/g, ':').replace(/：/g, ':').trim() === normalized);
  }
  // 4. Case-insensitive
  if (!found) found = files.find(f => f.toLowerCase() === targetName.toLowerCase());
  // 5. Ends-with match (handles prefix variations like "scene background 01：")
  if (!found) found = files.find(f => f.endsWith(targetName) || targetName.endsWith(f));
  return found ? join(sourceDir, found) : null;
}

async function convertImage(srcPath, destPath, size, quality) {
  ensureDir(dirname(destPath));
  try {
    await sharp(srcPath)
      .resize({ ...size, withoutEnlargement: true })
      .webp(quality)
      .toFile(destPath);
    const stat = statSync(destPath);
    const kb = (stat.size / 1024).toFixed(1);
    console.log(`  ✅ ${basename(destPath)} (${kb} KB)`);
    return { ok: true, size: stat.size, path: destPath };
  } catch (err) {
    console.error(`  ❌ ${basename(destPath)}: ${err.message}`);
    return { ok: false, error: err.message, path: destPath };
  }
}

// --- 主流程 ---
async function main() {
  console.log('\n🏝️  心岛计划 — WebP 素材转换 (Beta 0.9.9.2)\n');

  const results = { persona: [], personaThumb: [], scene: [], result: [] };

  // 1. 转换 12 人格拟人图
  console.log('═══ 1/3: 人格拟人图 (personas) ═══');
  const personaSrcDir = join(SOURCE, 'personas-original');
  const personaDestDir = join(ASSETS, 'personas');
  const personaThumbDir = join(ASSETS, 'personas', 'thumbs');

  for (const [srcName, destName] of Object.entries(PERSONA_MAP)) {
    const srcPath = findSourceFile(personaSrcDir, srcName);
    if (!srcPath) {
      console.log(`  ⚠️  未找到源文件: ${srcName}，跳过`);
      results.persona.push({ ok: false, error: '源文件不存在', path: destName });
      results.personaThumb.push({ ok: false, error: '源文件不存在', path: 'thumbs/' + destName });
      continue;
    }
    // Main image
    const r1 = await convertImage(srcPath, join(personaDestDir, destName), SIZES.persona, QUALITY.persona);
    results.persona.push(r1);
    // Thumbnail
    const r2 = await convertImage(srcPath, join(personaThumbDir, destName), SIZES.personaThumb, QUALITY.personaThumb);
    results.personaThumb.push(r2);
  }

  // 2. 转换 12 场景图
  console.log('\n═══ 2/3: 场景图 (scenes) ═══');
  const sceneSrcDir = join(SOURCE, 'scenes-original');
  const sceneDestDir = join(ASSETS, 'scenes');

  for (const [srcName, destName] of Object.entries(SCENE_MAP)) {
    const srcPath = findSourceFile(sceneSrcDir, srcName);
    if (!srcPath) {
      console.log(`  ⚠️  未找到源文件: ${srcName}，跳过`);
      results.scene.push({ ok: false, error: '源文件不存在', path: destName });
      continue;
    }
    const r = await convertImage(srcPath, join(sceneDestDir, destName), SIZES.scene, QUALITY.scene);
    results.scene.push(r);
  }

  // 3. 转换结果页/过场图
  console.log('\n═══ 3/3: 结果页图 (result) ═══');
  const resultSrcDir = SOURCE; // result images directly in source/
  const resultDestDir = join(ASSETS, 'result');

  for (const [srcName, destName] of Object.entries(RESULT_MAP)) {
    const srcPath = findSourceFile(resultSrcDir, srcName);
    if (!srcPath) {
      console.log(`  ⚠️  未找到源文件: ${srcName}，跳过`);
      results.result.push({ ok: false, error: '源文件不存在', path: destName });
      continue;
    }
    const r = await convertImage(srcPath, join(resultDestDir, destName), SIZES.result, QUALITY.result);
    results.result.push(r);
  }

  // --- 汇总 ---
  console.log('\n═══════════════════════════');
  const all = [...results.persona, ...results.personaThumb, ...results.scene, ...results.result];
  const ok = all.filter(r => r.ok).length;
  const fail = all.filter(r => !r.ok).length;
  const totalSize = all.filter(r => r.ok).reduce((sum, r) => sum + r.size, 0);

  console.log(`✅ 成功: ${ok}`);
  console.log(`⚠️  跳过/失败: ${fail}`);
  console.log(`📦 总大小: ${(totalSize / 1024).toFixed(1)} KB (${(totalSize / 1048576).toFixed(2)} MB)`);

  if (fail > 0) {
    console.log('\n💡 提示：请将原始 PNG 文件放入以下目录后重新运行：');
    console.log(`   source/personas-original/  — 12 个人格 PNG`);
    console.log(`   source/scenes-original/    — 12 个场景 PNG`);
    console.log(`   source/                    — 4 个结果页 PNG`);
  }

  console.log('\n✨ 转换完成！\n');
}

main().catch(err => {
  console.error('转换过程出错:', err);
  process.exit(1);
});
