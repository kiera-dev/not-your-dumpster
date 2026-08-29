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

  async create() {
    getAudio(this);
    registerWaddles(this);
    if (document.fonts) {
      await Promise.all([
        document.fonts.load('16px "Vast Shadow"'),
        document.fonts.load('700 16px "Stardos Stencil"'),
      ]);
    }
    this.scene.start('Title');
  }
}
