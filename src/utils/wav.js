export function encodeWAV(leftChunks, rightChunks, sampleRate = 48000) {
  // calculate total length
  const numFrames = leftChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + numFrames * 4); // 2 channels, 16-bit (2 bytes each) = 4 bytes per frame
  const view = new DataView(buffer);

  const writeString = (v, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numFrames * 4, true);
  writeString(view, 8, 'WAVE');
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);       // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);        // AudioFormat (1 for PCM)
  view.setUint16(22, 2, true);        // NumChannels (2)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 4, true);        // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true);       // BitsPerSample
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numFrames * 4, true);

  // Write PCM samples
  let offset = 44;
  for (let chunkIdx = 0; chunkIdx < leftChunks.length; chunkIdx++) {
    const left = leftChunks[chunkIdx];
    const right = rightChunks[chunkIdx];
    for (let i = 0; i < left.length; i++) {
      const sL = Math.max(-1, Math.min(1, left[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
      offset += 2;
      const sR = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}
