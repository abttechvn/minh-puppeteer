const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 📅 Format timestamp to hh:mm:ss dd/mm/yy
function formatTimestamp() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    return `${h}:${m}:${s} ${d}/${mo}/${y}`;
}

// 🍪 Load cookies if available
async function loadCookies(page) {
    if (!fs.existsSync('cookies.json')) return false;
    const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
    for (const c of cookies) {
        if (c.expirationDate) {
            c.expires = Math.floor(c.expirationDate);
            delete c.expirationDate;
        }
    }
    await page.setCookie(...cookies);
    return true;
}

// 🆔 Extract video ID from URL
function extractVideoId(url) {
    const m = url.match(/video\/(\d+)/);
    return m ? m[1] : 'unknown';
}

// 💾 Save results to downloadable_links/<videoId>.json
function saveResults(videoId, data) {
    const dir = path.join('downloadable_links');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${videoId}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`💾 Saved: ${file}`);
}

// 🎯 Fetch downloadable links for a single URL
async function fetchDownloadableLinks(inputUrl) {
    console.log(`🔗 Input: ${inputUrl}`);
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await loadCookies(page);

    // Track unique bitrates
    const qualityMap = new Map();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        try {
            const url = request.url();
            if (url.includes('v3-dy-o.zjcdn.com')) {
                const params = new URLSearchParams(url.split('?')[1] || '');
                const br = params.get('br');
                if (br && !qualityMap.has(br)) {
                    qualityMap.set(br, {
                        bitrate: parseInt(br),
                        url: url,
                        timestamp: formatTimestamp()
                    });
                    console.log(`📹 Captured br=${br}`);
                }
            }
        } catch (e) {
            // ignore
        } finally {
            try { request.continue(); } catch {}
        }
    });

    try {
        await page.goto(inputUrl, { waitUntil: 'networkidle2', timeout: 120000 });
        const finalUrl = page.url();
        const videoId = extractVideoId(finalUrl) || extractVideoId(inputUrl);
        console.log(`➡️ Final URL: ${finalUrl}`);

        // Wait login popup
        await new Promise(r => setTimeout(r, 4000));

        // Open clarity panel and choose highest option if possible
        const btnSelectors = [
            '.xgplayer-playclarity-setting .gear .btn',
            '[class*="playclarity"] .gear .btn',
            '.xgplayer-playclarity-setting'
        ];
        let btn = null;
        for (const sel of btnSelectors) {
            try { btn = await page.$(sel); if (btn) break; } catch {}
        }
        if (btn) {
            await btn.hover();
            await new Promise(r => setTimeout(r, 800));
            await btn.click();
            await new Promise(r => setTimeout(r, 800));
            const items = await page.$$('.xgplayer-playclarity-setting .virtual .item');
            if (items && items.length > 0) {
                // Click the last (usually highest) quality
                await items[items.length - 1].click();
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        // Allow time to capture
        await new Promise(r => setTimeout(r, 5000));

        const captured = Array.from(qualityMap.values()).sort((a, b) => b.bitrate - a.bitrate);
        const result = {
            videoUrl: finalUrl,
            videoId: videoId,
            fetchTimestamp: formatTimestamp(),
            networkCapture: {
                totalUniqueBitrateRequests: captured.length,
                bitrates: captured.map(c => c.bitrate),
                capturedRequests: captured
            }
        };
        saveResults(videoId, result);
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    } finally {
        try { await page.close(); } catch {}
        try { await browser.close(); } catch {}
    }
}

// 🚀 CLI
(async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node fetch_downloadable_link.js <douyin_video_url>');
        return;
    }
    const url = args[0];
    await fetchDownloadableLinks(url);
})();


