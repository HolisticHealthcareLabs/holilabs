
import { createWorker } from 'tesseract.js';
import path from 'path';

async function runBenchmark() {
    console.log('--- OCR BENCHMARK ---');

    // Valid 1x1 White Pixel PNG
    const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgDNjd8qAAAAAElFTkSuQmCC';

    console.log('1. Initializing Worker...');
    const initStart = Date.now();
    // V5 API: language, ocr options, worker options
    const worker = await createWorker('eng', 1, {
        langPath: path.resolve(__dirname, '../resources'),
        gzip: false,
        logger: m => { }
    });
    const initEnd = Date.now();
    console.log(`Initialized in ${initEnd - initStart}ms`);

    console.log('2. Recognizing Text...');
    const recStart = Date.now();
    const ret = await worker.recognize(sampleImage);
    const recEnd = Date.now();

    console.log(`Recognized in ${recEnd - recStart}ms`);
    console.log(`Confidence: ${ret.data.confidence}%`);
    console.log(`Text: "${ret.data.text.trim()}"`);

    console.log('3. Terminating...');
    await worker.terminate();
    console.log('Done.');
}

runBenchmark().catch(console.error);
