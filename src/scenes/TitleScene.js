import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import {
  createAudioControl,
  playSfx,
  syncSceneAudio,
} from '../systems/audio.js';
import { fadeToScene } from '../systems/ui.js';

const INK = '#261b18';
const BORDER = 0x382824;
const BUTTON = 0xd8c7a7;

function createPaperTexture(scene, key, width, height) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  const context = texture.getContext();
  const edge = 12;
  const random = new Phaser.Math.RandomDataGenerator([key]);
  const outline = [];

  outline.push([edge, random.between(2, edge)]);
  for (let x = edge; x <= width - edge; x += 28) {
    outline.push([x, random.between(2, edge)]);
  }
  for (let y = edge; y <= height - edge; y += 24) {
    outline.push([width - random.between(2, edge), y]);
  }
  for (let x = width - edge; x >= edge; x -= 28) {
    outline.push([x, height - random.between(2, edge)]);
  }
  for (let y = height - edge; y >= edge; y -= 24) {
    outline.push([random.between(2, edge), y]);
  }
  const traceOutline = () => {
    context.beginPath();
    context.moveTo(...outline[0]);
    outline.slice(1).forEach((point) => context.lineTo(...point));
    context.closePath();
  };
  traceOutline();

  const wash = context.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, '#f3e8cc');
  wash.addColorStop(0.52, '#efe1c2');
  wash.addColorStop(1, '#e5d1aa');
  context.fillStyle = wash;
  context.fill();
  context.save();
  context.clip();

  for (let index = 0; index < 900; index += 1) {
    const alpha = random.realInRange(0.018, 0.065);
    context.fillStyle = `rgba(91, 61, 42, ${alpha})`;
    context.fillRect(
      random.between(0, width),
      random.between(0, height),
      random.between(1, 7),
      random.between(1, 4),
    );
  }
  for (let index = 0; index < 26; index += 1) {
    context.beginPath();
    context.fillStyle = `rgba(117, 77, 46, ${random.realInRange(0.012, 0.045)})`;
    context.ellipse(
      random.between(0, width),
      random.between(0, height),
      random.between(18, 90),
      random.between(8, 42),
      random.realInRange(-0.6, 0.6),
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
  traceOutline();
  context.strokeStyle = '#382824';
  context.lineWidth = 8;
  context.stroke();
  texture.refresh();
  return key;
}

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

    this.titleCard = this.createPaperPanel(116, 102, 1320, 864, 'titlePaper');
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
    const title = this.add.text(182, 322, 'JIMOTHY:', {
      fontFamily: 'Vast Shadow, Georgia, serif',
      fontSize: '112px',
      color: INK,
    }).setDepth(DEPTH.ui + 2);
    const banana = this.add.image(title.x + title.width + 32, 431, 'banana')
      .setDisplaySize(68, 39)
      .setAngle(-10)
      .setDepth(DEPTH.ui + 3);
    const subtitle = this.add.text(188, 482, 'THIS IS NOT YOUR DUMPSTER!', {
      fontFamily: 'Stardos Stencil, Georgia, serif',
      fontStyle: 'bold',
      fontSize: '54px',
      color: '#6f2722',
    }).setDepth(DEPTH.ui + 2);
    const filing = this.add.text(190, 596, 'FORM 0-A: REQUEST TO BEGIN', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      color: '#604940',
      letterSpacing: 2,
    }).setDepth(DEPTH.ui + 2);
    const { button, parts: buttonParts } = this.createButton(190, 730, 620, 94, 'SUBMIT APPLICATION');
    this.approvedStamp = this.add.image(1080, 755, 'approvedStamp')
      .setDisplaySize(340, 132)
      .setAngle(-8)
      .setAlpha(0)
      .setScale(1.8)
      .setDepth(DEPTH.ui + 5);
    this.titleElements = [this.titleCard, department, rule, title, banana, subtitle, filing, ...buttonParts];

    button.on('pointerdown', () => this.approveApplication(button));
    createAudioControl(this);
  }

  createPaperPanel(x, y, width, height, textureKey = `paper-${width}-${height}`) {
    createPaperTexture(this, textureKey, width, height);
    return this.add.image(x, y, textureKey)
      .setOrigin(0)
      .setDepth(DEPTH.ui + 1);
  }

  createButton(x, y, width, height, text) {
    const shadow = this.add.rectangle(x + 6, y + 8, width, height, 0x382824, 0.35)
      .setOrigin(0)
      .setDepth(DEPTH.ui + 2);
    const button = this.add.rectangle(x, y, width, height, BUTTON, 1)
      .setOrigin(0)
      .setStrokeStyle(5, 0x604940)
      .setDepth(DEPTH.ui + 3)
      .setInteractive({ cursor: 'pointer' });
    const inset = this.add.rectangle(x + 9, y + 9, width - 18, height - 18, 0xffffff, 0)
      .setOrigin(0)
      .setStrokeStyle(2, 0xf1e4c7, 0.78)
      .setDepth(DEPTH.ui + 4);
    const label = this.add.text(x + (width / 2), y + (height / 2), text, {
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: '30px',
      color: INK,
    }).setOrigin(0.5).setDepth(DEPTH.ui + 5);
    button.on('pointerover', () => button.setFillStyle(0xeadab9));
    button.on('pointerout', () => button.setFillStyle(BUTTON));
    return { button, label, parts: [shadow, button, inset, label] };
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
    const { button, parts: buttonParts } = this.createButton(220, 716, 520, 92, 'ENTER ALLEY');
    buttonParts.forEach((part) => part.setAlpha(0));
    const elements = [card, heading, body, ...buttonParts];
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
