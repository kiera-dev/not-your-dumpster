import Phaser from 'phaser';
import './styles.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { AlleyScene } from './scenes/AlleyScene.js';
import { DumpsterRevealScene } from './scenes/DumpsterRevealScene.js';
import { PermitOfficeScene } from './scenes/PermitOfficeScene.js';
import { SanitationOfficeScene } from './scenes/SanitationOfficeScene.js';
import { HearingRoomScene } from './scenes/HearingRoomScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#16100f',
  scene: [BootScene, TitleScene, AlleyScene, DumpsterRevealScene, PermitOfficeScene, SanitationOfficeScene, HearingRoomScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  input: {
    activePointers: 2,
  },
});
