import { readFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import {
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRMeshQuantization
} from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const input = process.env.INPUT_GLB || 'assets/players/player.glb';
const output = process.env.OUTPUT_GLB || '/tmp/player-uncompressed.glb';
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization])
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder
  });

const document = await io.read(input);
document.disposeExtension('EXT_meshopt_compression');
if (document.hasExtension('EXT_meshopt_compression')) {
  throw new Error('Could not remove EXT_meshopt_compression from the decoded document');
}
await io.write(output, document);

function readGlbJson(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2) {
    throw new Error('Decoded output is not a glTF 2.0 binary');
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 0x4e4f534a) {
      return JSON.parse(buffer.toString('utf8', start, start + length).trim());
    }
    offset = start + length;
  }
  throw new Error('Decoded output has no JSON chunk');
}

const inputBytes = await readFile(input);
const outputBytes = await readFile(output);
const json = readGlbJson(outputBytes);
const used = json.extensionsUsed || [];
const required = json.extensionsRequired || [];
if (used.includes('EXT_meshopt_compression') || required.includes('EXT_meshopt_compression')) {
  throw new Error('Meshopt extension remains in decoded output');
}
const jointCount = (json.skins || []).reduce((max, skin) => Math.max(max, (skin.joints || []).length), 0);
if (!jointCount) throw new Error('Decoded GLB has no skin joints');

console.log(JSON.stringify({
  input,
  output,
  inputBytes: inputBytes.length,
  outputBytes: outputBytes.length,
  meshoptRemoved: true,
  skinCount: (json.skins || []).length,
  maxJointCount: jointCount
}, null, 2));
