import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { SCENE_LAYOUTS } from '../config/sceneLayouts.js';
import { GameState } from '../state/GameState.js';
import {
  createAudioControl,
  getAudio,
  playSfx,
  syncSceneAudio,
} from '../systems/audio.js';
import { createHotspot, createSceneExit, fadeToScene, showDialogue } from '../systems/ui.js';

export class DumpsterRevealScene extends Phaser.Scene {
  constructor() { super('DumpsterReveal'); }

  create() {
    this.state = new GameState(this.registry);
    syncSceneAudio(this, 'alley');
    createAudioControl(this);
    const layout = SCENE_LAYOUTS.dumpsterReveal;
    this.busy = false;
    this.background = this.add.image(
      0,
      0,
      this.state.has('grapeAcquired') ? 'bgNoGrape' : layout.background,
    ).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background);
    this.state.setFlag('grapeSeen');
    playSfx(this, 'dumpsterDive');
    if (this.state.has('grapeAcquired')) {
      this.showEnding();
      return;
    }
    this.state.setPersonalObjective('GET GRAPE');
    this.hotspot = createHotspot(this, layout.grapeHotspot, () => this.attemptGrape(), { label: 'Perfect grape' });
    if (this.state.has('grapeAttempted') && !this.state.has('feralMode')) {
      createSceneExit(this, 'BACK TO ALLEY', () => fadeToScene(this, 'Alley', { fromDumpster: true }));
    }
  }

  async attemptGrape() {
    if (this.busy) return;
    if (this.state.has('feralMode') && this.state.has('form12Submitted')) {
      await this.takeGrape();
      return;
    }
    if (this.state.has('grapeAttempted')) {
      this.hotspot.disableInteractive();
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'Still grape.' },
        { speaker: 'Jimothy', text: 'Still municipal.' },
      ]);
      this.hotspot.setInteractive({ cursor: 'pointer' });
      return;
    }
    this.hotspot.disableInteractive();
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'GRAPE.' },
      { speaker: 'System', text: 'TAKE GRAPE' },
    ]);
    this.state.setFlag('grapeAttempted');
    fadeToScene(this, 'Alley');
  }

  async takeGrape() {
    this.busy = true;
    this.hotspot.disableInteractive();
    this.background.setTexture('bgNoGrape');
    const eater = this.add.image(1270, 1110, 'jimothyEat')
      .setOrigin(0.5, 1)
      .setScale(1.75)
      .setFlipX(true)
      .setDepth(DEPTH.actor);
    this.state.setFlag('grapeAcquired');
    this.state.setPersonalObjective('GRAPE ACQUIRED');
    playSfx(this, 'cronchGrape');
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'CRONCH.' },
      { speaker: 'Jimothy', text: 'Prrp.' },
    ]);
    eater.destroy();
    this.state.setFlag('endingComplete');
    await new Promise((resolve) => this.time.delayedCall(300, resolve));
    this.showEnding();
  }

  showEnding() {
    playSfx(this, 'yayGrape');
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x16100f, 0.78)
      .setOrigin(0)
      .setDepth(DEPTH.ui + 20);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1320, 650, 0xf1e4c7, 0.98)
      .setStrokeStyle(8, 0x382824)
      .setDepth(DEPTH.ui + 21);
    const title = this.add.text(GAME_WIDTH / 2, 365, 'GRAPE ACQUIRED', {
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      fontSize: '92px',
      color: '#261b18',
    }).setOrigin(0.5).setDepth(DEPTH.ui + 22);
    const body = this.add.text(
      GAME_WIDTH / 2,
      535,
      'The City of Seattle’s Refuse Access & Miscellaneous Containers Dept.\nhas no further forms available.\n\nJimothy never understood the plot.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#261b18',
        align: 'center',
        lineSpacing: 12,
        wordWrap: { width: 1080 },
      },
    ).setOrigin(0.5).setDepth(DEPTH.ui + 22);
    const button = this.add.rectangle(GAME_WIDTH / 2, 780, 400, 82, 0xd8c7a7)
      .setStrokeStyle(4, 0x604940)
      .setInteractive({ cursor: 'pointer' })
      .setDepth(DEPTH.ui + 22);
    const buttonLabel = this.add.text(GAME_WIDTH / 2, 780, 'PLAY AGAIN', {
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: '30px',
      color: '#261b18',
    }).setOrigin(0.5).setDepth(DEPTH.ui + 23);
    button.on('pointerover', () => button.setFillStyle(0xeadab9));
    button.on('pointerout', () => button.setFillStyle(0xd8c7a7));
    button.on('pointerdown', () => {
      button.disableInteractive();
      playSfx(this, 'uiClick');
      getAudio(this).reset();
      this.state.reset();
      this.cameras.main.fadeOut(350, 22, 16, 15);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    });
    this.tweens.add({
      targets: [panel, title, body, button, buttonLabel],
      scale: { from: 0.96, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 420,
      ease: 'Back.easeOut',
    });
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 0.78, duration: 300 });
    this.launchConfetti();
  }

  launchConfetti() {
    const colors = [0x6f3f78, 0x9a5aa5, 0xc94d3f, 0xe3ad43, 0xf3e4c4, 0x56805f];
    const piecesPerSide = 34;

    for (let side = 0; side < 2; side += 1) {
      for (let index = 0; index < piecesPerSide; index += 1) {
        const fromLeft = side === 0;
        const startX = fromLeft ? -20 : GAME_WIDTH + 20;
        const startY = Phaser.Math.Between(820, 1080);
        const width = Phaser.Math.Between(12, 28);
        const height = Phaser.Math.Between(7, 16);
        const confetti = this.add.rectangle(
          startX,
          startY,
          width,
          height,
          Phaser.Utils.Array.GetRandom(colors),
        )
          .setAngle(Phaser.Math.Between(-90, 90))
          .setDepth(DEPTH.ui + 24);

        const apexX = fromLeft
          ? Phaser.Math.Between(340, 1500)
          : Phaser.Math.Between(548, 1708);
        const apexY = Phaser.Math.Between(80, 620);
        const firstSpin = Phaser.Math.Between(220, 640) * (fromLeft ? 1 : -1);

        this.tweens.add({
          targets: confetti,
          x: apexX,
          y: apexY,
          angle: `+=${firstSpin}`,
          delay: Phaser.Math.Between(0, 220),
          duration: Phaser.Math.Between(620, 920),
          ease: 'Cubic.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: confetti,
              x: apexX + Phaser.Math.Between(-180, 180),
              y: GAME_HEIGHT + 90,
              angle: `+=${Phaser.Math.Between(360, 900) * (fromLeft ? 1 : -1)}`,
              duration: Phaser.Math.Between(950, 1500),
              ease: 'Quad.easeIn',
              onComplete: () => confetti.destroy(),
            });
          },
        });
      }
    }
  }
}
