const fs = require('fs');
const path = require('path');
const { fetch } = require('undici'); // Node 18+ has native fetch, but for older node envs

// Configuration
const API_URL = 'http://localhost:3000/api/v1'; // Adjust port if needed
const MEMBER_ID = 1; // Assuming member with ID 1 exists

async function testSignatureScanning() {
    console.log('🧪 Testing Signature Scanning...');

    // 1. Create a dummy signature file
    const testFilePath = path.join(__dirname, 'test_signature.png');
    // Create a simple 1x1 PNG or just dummy content (if backend checks header only or we rely on extension)
    // But backend uses FileTypeValidator with regex, standard multer might not check deep magic bytes unless using specific filters.
    // Our filter checks mimetype.
    // We should create a real PNG or at least something that looks like it if we want to be safe.
    // Minimal PNG hex from wikipedia
    const pngBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D340000000049454E44AE426082', 'hex');
    fs.writeFileSync(testFilePath, pngBuffer);
    console.log('✅ Created dummy signature file');

    try {
        // 2. Upload Signature
        console.log(`📤 Uploading signature for member ${MEMBER_ID}...`);
        const formData = new FormData();
        const blob = new Blob([pngBuffer], { type: 'image/png' });
        formData.append('file', blob, 'test_signature.png');

        const uploadRes = await fetch(`${API_URL}/members/${MEMBER_ID}/signature`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) {
            const txt = await uploadRes.text();
            throw new Error(`Upload failed: ${uploadRes.status} ${txt}`);
        }
        const uploadJson = await uploadRes.json();
        console.log('✅ Upload response:', uploadJson);

        // 3. Get Signature
        console.log(`📥 Fetching signature for member ${MEMBER_ID}...`);
        const getRes = await fetch(`${API_URL}/members/${MEMBER_ID}/signature`);

        if (!getRes.ok) {
            const txt = await getRes.text();
            throw new Error(`Get failed: ${getRes.status} ${txt}`);
        }

        const contentType = getRes.headers.get('content-type');
        console.log(`✅ Get success. Content-Type: ${contentType}`);

        // Verify it is our file (size)
        const arrayBuffer = await getRes.arrayBuffer();
        console.log(`✅ Downloaded size: ${arrayBuffer.byteLength} bytes`);

        if (arrayBuffer.byteLength !== pngBuffer.length) {
            console.warn('⚠️ Warning: Downloaded size does not match uploaded size');
        }

        // 4. Cleanup
        fs.unlinkSync(testFilePath);
        console.log('✅ Cleanup test file');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

// Run (needs Node 18+ for native fetch/FormData/Blob)
// If failing on older Node, we might need polyfills or just rely on backend running correctly.
if (process.version.startsWith('v16') || process.version.startsWith('v14')) {
    console.log('Skipping test due to Node version (requires global fetch/FormData). Please run manually in newer env.');
} else {
    testSignatureScanning();
}
