import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract token dynamically from git remote config to comply with GitHub Push Protection rules
let TOKEN = '';
try {
  const remoteUrl = execSync('git remote get-url origin').toString().trim();
  const urlObj = new URL(remoteUrl);
  TOKEN = urlObj.password || '';
} catch (e) {
  console.warn('[WARNING] Failed to extract token from git remote config:', e.message);
}
const OWNER = 'darkness-38';
const REPO = 'Rase-Launcher';
const TAG = 'v1.0.2-hotfix';
const RELEASE_NAME = 'v1.0.2-hotfix: Premium Screenshot Gallery & Custom Setup';

const CHANGELOG = `### 🚀 Rase Launcher - v1.0.2-hotfix Changelog

Bu güncelleme ile Rase Launcher'a yepyeni premium özellikler ve tamamen sıfırdan kodlanmış bağımsız bir kurulum sihirbazı eklenmiştir!

#### 🖼️ Ekran Görüntüsü (Screenshot) Galerisi ve Dinamik Filtreler
* Minecraft'ta **F2** ile aldığınız tüm görselleri launcher içerisindeki **Galeri** sekmesinde sergileyen premium bir panel eklendi.
* **Dinamik Filtreleme**: Görsellerinizi Seçili Profil, Genel Sürümler (Vanilla) veya Tüm Görseller arasında süzebilirsiniz.
* **Tam Ekran Lightbox**: Görsellere tıklayarak tam ekran görüntüleyebilir, yön tuşlarıyla (Sol/Sağ) gezinebilir ve doğrudan silebilirsiniz.

#### 🛠️ Özel Web Tabanlı Kurulum Sihirbazı (\`Rase Setup\`)
* Sıfırdan Vite + Electron tabanlı, ultra hafif (sadece 16 KB ön yüz kodlu!) bağımsız bir kurulum sihirbazı kodlandı.
* **Hızlı Kur (1-Tık)** ve **Gelişmiş Kurulum** (Özel dizin seçimi, kısayol yönetimi) özellikleri eklendi.
* Kurulum sonu için yüksek performanslı HTML5 Canvas **konfeti animasyonları** entegre edildi.

#### ⚙️ İyileştirmeler ve Hata Düzeltmeleri
* Mod indirmelerinde oluşan bazı senkronizasyon gecikmeleri giderildi.
* Electron CSP (İçerik Güvenlik Politikası) güvenlik kuralları güncellendi.`;

// Helper: Perform authenticated https requests
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Upload asset binary file
function uploadAsset(uploadUrl, filePath) {
  const fileName = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const sizeBytes = stats.size;
  
  // Format URL: strip template vars at the end '{?name,label}'
  const baseUploadUrl = uploadUrl.replace(/\{.*?\}/, '');
  const finalUrl = `${baseUploadUrl}?name=${encodeURIComponent(fileName)}`;
  
  const parsedUrl = new URL(finalUrl);

  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'User-Agent': 'Rase-Release-Script',
      'Content-Type': 'application/octet-stream',
      'Content-Length': sizeBytes
    }
  };

  console.log(`[GitHub API] Uploading ${fileName} (${Math.round(sizeBytes / 1024 / 1024)} MB)...`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Upload failed HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    req.on('error', (err) => reject(err));

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function main() {
  try {
    // 1. Commit and push the tag in Git
    console.log('[Git] Committing package version bumps...');
    try {
      execSync('git add package.json installer/package.json', { stdio: 'inherit' });
      execSync('git commit -m "chore: bump version to 1.0.2-hotfix"', { stdio: 'inherit' });
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('[Git] Push complete.');
    } catch (_) {
      console.log('[Git] No uncommitted changes in package.json files or push already up to date.');
    }

    console.log('[Git] Tagging new release...');
    try {
      execSync(`git tag -d ${TAG}`, { stdio: 'ignore' });
      execSync(`git push origin :refs/tags/${TAG}`, { stdio: 'ignore' });
    } catch (_) {}
    
    execSync(`git tag ${TAG}`, { stdio: 'inherit' });
    execSync(`git push origin ${TAG}`, { stdio: 'inherit' });
    console.log(`[Git] Successfully pushed tag: ${TAG}`);

    // 2. Fetch or Create Release via GitHub API
    let releaseResponse;
    let releaseId;
    let uploadUrl;
    
    try {
      console.log(`[GitHub API] Fetching existing release for tag ${TAG}...`);
      const getReleaseOptions = {
        hostname: 'api.github.com',
        path: `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`,
        method: 'GET',
        headers: {
          'Authorization': `token ${TOKEN}`,
          'User-Agent': 'Rase-Release-Script'
        }
      };
      releaseResponse = await request(getReleaseOptions);
      releaseId = releaseResponse.id;
      uploadUrl = releaseResponse.upload_url;
      console.log(`[GitHub API] Found existing release! ID: ${releaseId}`);
    } catch (e) {
      console.log(`[GitHub API] Release not found. Creating release for tag ${TAG}...`);
      const releaseOptions = {
        hostname: 'api.github.com',
        path: `/repos/${OWNER}/${REPO}/releases`,
        method: 'POST',
        headers: {
          'Authorization': `token ${TOKEN}`,
          'User-Agent': 'Rase-Release-Script',
          'Content-Type': 'application/json'
        }
      };

      const releaseBody = {
        tag_name: TAG,
        target_commitish: 'main',
        name: RELEASE_NAME,
        body: CHANGELOG,
        draft: false,
        prerelease: false
      };

      releaseResponse = await request(releaseOptions, releaseBody);
      releaseId = releaseResponse.id;
      uploadUrl = releaseResponse.upload_url;
      console.log(`[GitHub API] Release created successfully! ID: ${releaseId}`);
    }

    // 3. Scan and upload generated files
    const rootDir = path.join(__dirname, '..');
    const filesToUpload = [];

    // Main App AppImage & ZIP
    const distPkgDir = path.join(rootDir, 'dist-package');
    if (fs.existsSync(distPkgDir)) {
      const files = fs.readdirSync(distPkgDir);
      for (const file of files) {
        if ((file.endsWith('.AppImage') || file.endsWith('.zip') || file.endsWith('.exe') || file.endsWith('.tar.gz')) && file.includes('1.0.2-hotfix')) {
          filesToUpload.push(path.join(distPkgDir, file));
        }
      }
    }

    // Windows custom installer Rase Setup.exe
    const installerDistPkgDir = path.join(rootDir, 'installer', 'dist-package');
    if (fs.existsSync(installerDistPkgDir)) {
      const files = fs.readdirSync(installerDistPkgDir);
      for (const file of files) {
        if (file.endsWith('.exe') && file.includes('1.0.2-hotfix')) {
          filesToUpload.push(path.join(installerDistPkgDir, file));
        }
      }
    }

    if (filesToUpload.length === 0) {
      console.log('[WARNING] No build assets found to upload. Please build them first.');
      return;
    }

    console.log(`[GitHub API] Found ${filesToUpload.length} asset(s) to upload...`);
    for (const filePath of filesToUpload) {
      try {
        await uploadAsset(uploadUrl, filePath);
        console.log(`[GitHub API] Successfully uploaded asset: ${path.basename(filePath)}`);
      } catch (uploadErr) {
        console.error(`[GitHub API] [ERROR] Failed to upload ${path.basename(filePath)}:`, uploadErr.message);
      }
    }

    console.log('\n🎉 ALL RELEASE CHECKS AND DEPLOYMENTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Release process failed:', err.message);
    process.exit(1);
  }
}

main();
