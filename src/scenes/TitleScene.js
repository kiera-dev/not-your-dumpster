import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import {
  createAudioControl,
  playSfx,
  syncSceneAudio,
} from '../systems/audio.js';
import { fadeToScene } from '../systems/ui.js';

const PAPER = 0xf1e4c7;
const INK = '#261b18';
const BORDER = 0x382824;
const BUTTON = 0xd8c7a7;

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.transitioning = false;
    this.add.image(0, 0, 'bgAlley')
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(DEPTH.background);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x16100f, 0.46)
      .setOrigin(0)
      .setDepth(DEPTH.background + 1);

    this.jimothy = this.add.image(GAME_WIDTH + 140, GAME_HEIGHT - 24, 'jimothyIdle')
      .setOrigin(0.5, 1)
      .setDisplaySize(520, 401)
      .setDepth(DEPTH.actor);
    this.tweens.add({
      targets: this.jimothy,
      x: GAME_WIDTH - 128,
      duration: 850,
      delay: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.jimothy,
          y: this.jimothy.y - 7,
          duration: 1450,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      },
    });

    this.titleCard = this.createPaperPanel(116, 102, 1320, 864);
    const department = this.add.text(
      182,
      164,
      'CITY OF SEATTLE\nREFUSE ACCESS & MISCELLANEOUS CONTAINERS DEPT.',
      {
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '25px',
        color: '#604940',
        lineSpacing: 6,
      },
    ).setDepth(DEPTH.ui + 2);
    const rule = this.add.rectangle(182, 276, 1188, 5, BORDER)
      .setOrigin(0)
      .setDepth(DEPTH.ui + 2);
    const title = this.add.text(182, 330, 'JIMOTHY', {
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      fontSize: '118px',
      color: INK,
    }).setDepth(DEPTH.ui + 2);
    const subtitle = this.add.text(188, 478, 'THIS IS NOT YOUR DUMPSTER', {
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      fontSize: '52px',
      color: '#6f2722',
    }).setDepth(DEPTH.ui + 2);
    const filing = this.add.text(190, 590, 'APPLICATION TO BEGIN', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: '#604940',
      letterSpacing: 2,
    }).setDepth(DEPTH.ui + 2);
    const { button, label } = this.createButton(190, 730, 620, 94, 'SUBMIT APPLICATION');
    this.approvedStamp = this.add.image(1080, 755, 'approvedStamp')
      .setDisplaySize(340, 132)
      .setAngle(-8)
      .setAlpha(0)
      .setScale(1.8)
      .setDepth(DEPTH.ui + 5);
    this.titleElements = [this.titleCard, department, rule, title, subtitle, filing, button, label];

    button.on('pointerdown', () => this.approveApplication(button));
    createAudioControl(this);
  }

  createPaperPanel(x, y, width, height) {
    return this.add.rectangle(x, y, width, height, PAPER, 0.97)
      .setOrigin(0)
      .setStrokeStyle(8, BORDER)
      .setDepth(DEPTH.ui + 1);
  }

  createButton(x, y, width, height, text) {
    const button = this.add.rectangle(x, y, width, height, BUTTON, 1)
      .setOrigin(0)
      .setStrokeStyle(4, 0x604940)
      .setDepth(DEPTH.ui + 3)
      .setInteractive({ cursor: 'pointer' });
    const label = this.add.text(x + (width / 2), y + (height / 2), text, {
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: '30px',
      color: INK,
    }).setOrigin(0.5).setDepth(DEPTH.ui + 4);
    button.on('pointerover', () => button.setFillStyle(0xeadab9));
    button.on('pointerout', () => button.setFillStyle(BUTTON));
    return { button, label };
  }

  approveApplication(button) {
    if (this.transitioning) return;
    this.transitioning = true;
    button.disableInteractive();
    playSfx(this, 'stamp1');
    syncSceneAudio(this, 'alley');
    this.tweens.add({
      targets: this.approvedStamp,
      alpha: 1,
      scale: 1,
      duration: 190,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.cameras.main.shake(80, 0.0025);
        this.time.delayedCall(650, () => this.showControls());
      },
    });
  }

  showControls() {
    this.tweens.add({
      targets: [...this.titleElements, this.approvedStamp],
      alpha: 0,
      duration: 260,
      onComplete: () => {
        [...this.titleElements, this.approvedStamp].forEach((item) => item.destroy());
        this.createControlsCard();
      },
    });
  }

  createControlsCard() {
    const card = this.createPaperPanel(146, 150, 1240, 760).setAlpha(0);
    const heading = this.add.text(214, 220, 'HOW TO PROCEED', {
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      fontSize: '68px',
      color: INK,
    }).setAlpha(0).setDepth(DEPTH.ui + 2);
    const body = this.add.text(
      220,
      350,
      'Click objects and characters to interact.\n\nJimothy waddles where he needs to go.\n\nClick dialogue cards to continue.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: INK,
        lineSpacing: 8,
        wordWrap: { width: 1080 },
      },
    ).setAlpha(0).setDepth(DEPTH.ui + 2);
    const { button, label } = this.createButton(220, 716, 520, 92, 'ENTER ALLEY');
    button.setAlpha(0);
    label.setAlpha(0);
    const elements = [card, heading, body, button, label];
    this.tweens.add({
      targets: elements,
      alpha: 1,
      y: '+=12',
      duration: 340,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.transitioning = false;
        button.on('pointerdown', () => {
          if (this.transitioning) return;
          this.transitioning = true;
          button.disableInteractive();
          playSfx(this, 'uiClick');
          fadeToScene(this, 'Alley');
        });
      },
    });
  }
}
