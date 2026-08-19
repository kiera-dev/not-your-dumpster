import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { SCENE_LAYOUTS } from '../config/sceneLayouts.js';
import { GameState } from '../state/GameState.js';
import { createHotspot, createSceneExit, fadeToScene, showDialogue } from '../systems/ui.js';

export class DumpsterRevealScene extends Phaser.Scene {
  constructor() { super('DumpsterReveal'); }

  create() {
    this.state = new GameState(this.registry);
    const layout = SCENE_LAYOUTS.dumpsterReveal;
    this.busy = false;
    this.background = this.add.image(
      0,
      0,
      this.state.has('grapeAcquired') ? 'bgNoGrape' : layout.background,
    ).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background);
    this.state.setFlag('grapeSeen');
    if (this.state.has('grapeAcquired')) {
      this.showEnding();
      return;
    }
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
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'CRONCH.' },
      { speaker: 'Jimothy', text: 'Prrp.' },
    ]);
    eater.destroy();
    this.state.setFlag('endingComplete');
    this.showEnding();
  }

  showEnding() {
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
      this.state.reset();
      this.cameras.main.fadeOut(350, 22, 16, 15);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Alley'));
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
  }
}
