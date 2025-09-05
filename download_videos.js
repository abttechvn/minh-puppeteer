const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream');
const { Readable } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

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

// 🧭 Create batch folder
function ensureBatchFolder(customBatchPath) {
    let batchDir = customBatchPath;
    if (!batchDir) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const batchName = `batch_${day}${month}${year}_${hours}${minutes}${seconds}`;
        batchDir = path.join('downloads', batchName);
    }
    if (!fs.existsSync(batchDir)) fs.mkdirSync(batchDir, { recursive: true });
    return batchDir;
}

// 🔤 Make safe folder name while preserving Chinese
function makeSafeName(name) {
    return (name || 'unknown').replace(/[<>:"/\\|?*]/g, '_').trim();
}

// 📥 Discover JSON files from batch folders or single files
function discoverJsonInputs(fromPath) {
    const inputs = [];
    
    // If it's a single JSON file
    if (fs.statSync(fromPath).isFile() && fromPath.toLowerCase().endsWith('.json')) {
        inputs.push(fromPath);
        return inputs;
    }
    
    // If it's a directory, check if it's a batch folder or contains batch folders
    if (fs.statSync(fromPath).isDirectory()) {
        const items = fs.readdirSync(fromPath);
        
        // Check if this is a batch folder (contains JSON files directly)
        const jsonFiles = items.filter(f => f.toLowerCase().endsWith('.json'));
        if (jsonFiles.length > 0) {
            // This is a batch folder
            for (const f of jsonFiles) {
                inputs.push(path.join(fromPath, f));
            }
            return inputs;
        }
        
        // Check for subdirectories that might be batch folders
        for (const item of items) {
            const itemPath = path.join(fromPath, item);
            if (fs.statSync(itemPath).isDirectory() && item.startsWith('batch_')) {
                // This is a batch folder, scan for JSON files
                const batchItems = fs.readdirSync(itemPath);
                for (const f of batchItems) {
                    if (f.toLowerCase().endsWith('.json') && !f.startsWith('BATCH_REPORT') && !f.startsWith('MANUAL_DOWNLOAD')) {
                        inputs.push(path.join(itemPath, f));
                    }
                }
            }
        }
    }
    
    return inputs;
}

// 🔝 Pick highest bitrate captured URL
function selectHighest(capturedRequests) {
    if (!Array.isArray(capturedRequests) || capturedRequests.length === 0) return null;
    const sorted = [...capturedRequests].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return sorted[0];
}

// ⬇️ Download using global fetch (Node 18+) with streaming
async function downloadToFile(url, outPath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Convert Web ReadableStream to Node stream for pipeline
    // Node 18: Readable.fromWeb available
    const nodeStream = Readable.fromWeb(res.body);
    await streamPipeline(nodeStream, fs.createWriteStream(outPath));
}

// 📝 Write JSON helper
function writeJson(filePath, obj) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

// ▶️ Process one JSON
async function processOne(jsonPath, batchDir, resume) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const videoId = raw.videoId || 'unknown';
    const channelName = raw.extractedData?.channel?.name || 'unknown_channel';
    const safeChannel = makeSafeName(channelName).substring(0, 60);
    const folderName = `${safeChannel}_${videoId}`;
    const videoDir = path.join(batchDir, folderName);
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const outMp4 = path.join(videoDir, 'video_highest.mp4');
    const metadataPath = path.join(videoDir, 'metadata.json');
    const qualitiesPath = path.join(videoDir, 'qualities.json');
    const descPath = path.join(videoDir, 'description.txt');

    if (resume && fs.existsSync(outMp4) && fs.existsSync(metadataPath)) {
        return { videoId, channelName, folderName, status: 'skipped' };
    }

    const captured = raw.networkCapture?.capturedRequests || [];
    const top = selectHighest(captured);
    if (!top || !top.url) {
        // Still write out auxiliary files for traceability
        writeJson(qualitiesPath, captured);
        writeJson(metadataPath, {
            videoId,
            channel: raw.extractedData?.channel || null,
            video: raw.extractedData?.video || null,
            chosenBitrate: null,
            sourceJson: path.relative(batchDir, jsonPath),
            downloadedAt: formatTimestamp(),
            success: false,
            note: 'No downloadable URL found'
        });
        if (raw.extractedData?.video?.description) {
            fs.writeFileSync(descPath, raw.extractedData.video.description, 'utf8');
        }
        return { videoId, channelName, folderName, status: 'no_url' };
    }

    // Write qualities list
    writeJson(qualitiesPath, captured);
    if (raw.extractedData?.video?.description) {
        fs.writeFileSync(descPath, raw.extractedData.video.description, 'utf8');
    }

    // Download highest
    await downloadToFile(top.url, outMp4);

    // Write metadata
    writeJson(metadataPath, {
        videoId,
        videoUrl: raw.videoUrl || null,
        channel: raw.extractedData?.channel || null,
        video: raw.extractedData?.video || null,
        chosenBitrate: top.bitrate || null,
        sourceJson: path.relative(batchDir, jsonPath),
        downloadedAt: formatTimestamp(),
        success: true
    });

    return { videoId, channelName, folderName, status: 'downloaded', bitrate: top.bitrate || null };
}

// 🧵 Simple concurrency queue
async function runWithConcurrency(items, worker, concurrency) {
    const results = [];
    let index = 0;
    const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
        while (index < items.length) {
            const current = index++;
            try {
                const r = await worker(items[current]);
                results[current] = r;
            } catch (e) {
                results[current] = { error: e.message };
            }
        }
    });
    await Promise.all(workers);
    return results;
}

// 🚀 CLI
(async () => {
    const args = process.argv.slice(2);
    // Defaults
    let fromPath = 'downloadable_links';
    let batchPath = '';
    let resume = false;
    let concurrency = 3;

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--from' && args[i + 1]) { fromPath = args[++i]; continue; }
        if (a === '--batch' && args[i + 1]) { batchPath = args[++i]; continue; }
        if (a === '--resume') { resume = true; continue; }
        if (a === '--concurrency' && args[i + 1]) { concurrency = parseInt(args[++i]) || 3; continue; }
        if (a === '--help') {
            console.log('Usage: node download_videos.js [--from <folder|json|batch_folder>] [--batch <folder>] [--resume] [--concurrency N]');
    console.log('  --from: Path to JSON file, batch folder, or downloadable_links directory');
    console.log('  --batch: Custom download batch folder name (optional)');
    console.log('  --resume: Skip already downloaded videos');
    console.log('  --concurrency: Number of parallel downloads (default: 3)');
            return;
        }
    }

    const batchDir = ensureBatchFolder(batchPath);
    const inputs = discoverJsonInputs(fromPath);
    if (inputs.length === 0) {
        console.log(`❌ No JSON inputs found in: ${fromPath}`);
        return;
    }

    console.log(`📁 Download batch folder: ${batchDir}`);
    console.log(`📋 Inputs: ${inputs.length} JSON files`);
    console.log(`⚙️  Concurrency: ${concurrency}  Resume: ${resume ? 'on' : 'off'}`);
    
    // Show which batch folders are being processed
    const batchFolders = new Set();
    inputs.forEach(input => {
        const parts = input.split(path.sep);
        const batchIndex = parts.findIndex(part => part.startsWith('batch_'));
        if (batchIndex !== -1) {
            batchFolders.add(parts[batchIndex]);
        }
    });
    if (batchFolders.size > 0) {
        console.log(`📂 Processing batch folders: ${Array.from(batchFolders).join(', ')}`);
    }

    // Manifest init
    const manifestPath = path.join(batchDir, 'BATCH_MANIFEST.json');
    const manifest = { startedAt: formatTimestamp(), inputs: inputs.map(p => path.relative(batchDir, p)), results: [] };

    const results = await runWithConcurrency(inputs, async (jsonPath) => {
        try {
            const r = await processOne(jsonPath, batchDir, resume);
            console.log(`${r.status.toUpperCase()}: ${r.folderName}`);
            return { json: path.relative(batchDir, jsonPath), ...r };
        } catch (e) {
            console.log(`❌ ERROR: ${path.basename(jsonPath)} - ${e.message}`);
            return { json: path.relative(batchDir, jsonPath), status: 'error', error: e.message };
        }
    }, concurrency);

    manifest.results = results;
    manifest.completedAt = formatTimestamp();
    writeJson(manifestPath, manifest);

    const success = results.filter(r => r && r.status === 'downloaded').length;
    const skipped = results.filter(r => r && r.status === 'skipped').length;
    const noUrl = results.filter(r => r && r.status === 'no_url').length;
    const failed = results.filter(r => r && (r.status === 'error')).length;

    console.log(`\nDone. Downloaded: ${success}, Skipped: ${skipped}, No URL: ${noUrl}, Errors: ${failed}`);
    console.log(`Manifest: ${manifestPath}`);
})();



