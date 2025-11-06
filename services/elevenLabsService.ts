import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
        environment: "https://api.elevenlabs.io",
    });
    await client.textToSpeech.stream("NcJuO1kJ19MefFnxN1Ls", {
        outputFormat: "mp3_44100_128",
        text: "The first move is what sets everything in motion.",
        modelId: "eleven_multilingual_v2",
    });
}
main();
