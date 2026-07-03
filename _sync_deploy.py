import os, shutil, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PROJECT = 'c:/Users/Haru/Desktop/Heart Island(VS Code))'

# 1. Sync main source files (overwrite with read+write)
to_sync = ['app.js', 'index.html', 'styles.css', 'package.json', 'scripts/convert-assets.mjs']
for f in to_sync:
    src = os.path.join(PROJECT, f)
    dst = os.path.join(PROJECT, 'deploy', f)
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        print(f'OK: deploy/{f}')

# 2. Sync all WebP assets
asset_dirs = [
    'assets/personas',
    'assets/personas/thumbs',
    'assets/scenes',
    'assets/result',
]
for ad in asset_dirs:
    src_dir = os.path.join(PROJECT, ad)
    dst_dir = os.path.join(PROJECT, 'deploy', ad)
    os.makedirs(dst_dir, exist_ok=True)
    if os.path.exists(src_dir):
        for f in os.listdir(src_dir):
            if f.endswith('.webp') or f.endswith('.gitkeep'):
                src_fp = os.path.join(src_dir, f)
                dst_fp = os.path.join(dst_dir, f)
                shutil.copy2(src_fp, dst_fp)
                print(f'OK: deploy/{ad}/{f}')

# 3. Sync brand assets
brand_src = os.path.join(PROJECT, 'assets/brand')
brand_dst = os.path.join(PROJECT, 'deploy/assets/brand')
os.makedirs(brand_dst, exist_ok=True)
if os.path.exists(brand_src):
    for f in os.listdir(brand_src):
        shutil.copy2(os.path.join(brand_src, f), os.path.join(brand_dst, f))
        print(f'OK: deploy/assets/brand/{f}')

print('\nDeploy sync complete.')
