const axios = require('axios');
const FormData = require('form-data');
const chalk = require('chalk');
require('dotenv').config();

// Sleep utility for polling
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* ------------------------------------------------------------------
   ASSEMBLY AI FALLBACK
------------------------------------------------------------------- */
async function assemblySpeechToText(audioBuffer) {
  try {
    console.log(chalk.cyan('[AssemblyAI] Uploading audio...'));

    const uploadRes = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      audioBuffer,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          'transfer-encoding': 'chunked',
        },
        timeout: 15000,
      }
    );

    const audioUrl = uploadRes.data.upload_url;
    console.log(chalk.green('[AssemblyAI] Uploaded successfully. Starting transcription...'));

    const transcriptRes = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: audioUrl,
        disfluencies: true,
        speaker_labels: false,
        language_code: 'en_us',
        punctuate: true,
        format_text: true,
      },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const transcriptId = transcriptRes.data.id;

    // Polling loop (max 10 attempts)
    let attempts = 0;
    let transcriptResult;

    while (attempts < 10) {
      const poll = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: { authorization: process.env.ASSEMBLYAI_API_KEY },
        }
      );

      transcriptResult = poll.data;

      if (transcriptResult.status === 'completed') {
        console.log(chalk.green('[AssemblyAI] Transcription completed.'));
        break;
      } else if (transcriptResult.status === 'failed') {
        throw new Error('AssemblyAI transcription failed.');
      }

      await sleep(3000 + attempts * 1000); // Backoff
      attempts++;
    }

    if (transcriptResult.status !== 'completed') {
      throw new Error('AssemblyAI polling timeout.');
    }

    const words = transcriptResult.words || [];
    const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'actually'];
    const fillerCount = words.filter(w => fillerWords.includes(w.text?.toLowerCase())).length;

    const totalConfidence = words.reduce((sum, word) => sum + (word.confidence || 0), 0);
    const avgConfidence = words.length ? (totalConfidence / words.length).toFixed(2) : 'N/A';

    const speakingRate = transcriptResult.audio_duration
      ? (words.length / transcriptResult.audio_duration).toFixed(2) + ' wps'
      : 'N/A';

    return {
      transcript: transcriptResult.text || '',
      softSkills: {
        fillerWords: fillerCount,
        averageConfidence: avgConfidence,
        speakingRate,
      },
    };
  } catch (error) {
    console.error(
      chalk.red('[AssemblyAI] Error:'),
      error?.response?.data || error.message
    );
    throw new Error('Speech-to-Text failed via AssemblyAI');
  }
}

/* ------------------------------------------------------------------
   PRIMARY: OPENAI WHISPER -> fallback to AssemblyAI
------------------------------------------------------------------- */
async function speechToText(audioBuffer) {
  try {
    console.log(chalk.cyan('[Whisper] Sending audio for transcription...'));

    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav',
    });
    formData.append('model', 'whisper-1');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        timeout: 20000,
      }
    );

    console.log(chalk.green('[Whisper] Transcription success.'));
    return {
      transcript: response.data.text || '',
      softSkills: null, // OpenAI doesn't return soft skill metrics
    };
  } catch (error) {
    console.error(
      chalk.yellow('[Whisper] Failed, falling back to AssemblyAI...'),
      error?.response?.data || error.message
    );
    return await assemblySpeechToText(audioBuffer);
  }
}

module.exports = { speechToText };
