// Requires ffmpeg CLI utility to be installed
import { spawn } from 'child_process';
import { DeepgramClient } from '@deepgram/sdk';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
    throw new Error('Set DEEPGRAM_API_KEY in your local environment before running this sample.');
}

const STREAM_URL = 'https://playerservices.streamtheworld.com/api/livestream-redirect/CSPANRADIOAAC.aac';

const flux = async () => {
    const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

    const socket = await deepgram.listen.v2.createConnection({
        model: 'flux-general-en',
        eot_threshold: 0.7,
        eot_timeout_ms: 5000,
        encoding: 'linear16',
        sample_rate: 16000,
    });

    socket.on('message', (data) => {
        if (data.event === 'StartOfTurn') {
            console.log(`--- StartOfTurn (Turn ${data.turn_index}) ---`);
        }
        if (data.transcript) {
            console.log(data.transcript);
        }
        if (data.event === 'EndOfTurn') {
            const turn = data.turn_index;
            const confidence = data.end_of_turn_confidence;
            console.log(`--- EndOfTurn (Turn ${turn}, Confidence: ${confidence}) ---`);
        }
    });

    socket.on('close', () => {
        console.log('Connection closed.');
    });

    socket.on('error', (err) => {
        console.error(err);
    });

    socket.connect();
    await socket.waitForOpen();

    console.log(`Transcribing ${STREAM_URL}...`);

    const ffmpeg = spawn('ffmpeg', [
        '-loglevel', 'quiet', '-i', STREAM_URL,
        '-f', 's16le', '-ar', '16000', '-ac', '1', '-'
    ]);

    ffmpeg.on('error', (err) => {
        console.error('Failed to start ffmpeg:', err.message);
    });

    ffmpeg.stdout.on('data', (chunk) => {
        socket.sendMedia(chunk);
    });
}

flux().catch(console.error);
