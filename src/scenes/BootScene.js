import Phaser from 'phaser';
import { AUDIO_ASSETS, CORE_ASSETS } from '../config/assets.js';
import { getAudio } from '../systems/audio.js';
import { registerWaddles } from '../systems/Jimothy.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const progress = this.add.graphics();
    this.load.on('progress', (value) => {
      progress.clear().fillStyle(0xf1e4c7).fillRect(624, 560, 800 * value, 18);
    });
    Object.entries(CORE_ASSETS).forEach(([key, path]) => this.load.image(key, path));
    Object.entries(AUDIO_ASSETS).forEach(([key, paths]) => this.load.audio(key, paths));
  }

  create() {
    getAudio(this);
    registerWaddles(this);
    this.scene.start('Title');
  }
}
