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

    this.titleCard = this.createPaperPanel(116, 102, 1320, 914, 'titlePaperLong');
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
      fontSize: '120px',
      color: INK,
    }).setDepth(DEPTH.ui + 2);
    const subtitle = this.add.text(188, 478, 'THIS IS NOT YOUR DUMPSTER!', {
      fontFamily: 'Stardos Stencil, Georgia, serif',
      fontStyle: 'bold',
      fontSize: '68px',
      color: '#6f2722',
    }).setDepth(DEPTH.ui + 2);
    const formNumber = this.add.text(190, 584, 'FORM 0-A:', {
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: '32px',
      color: '#604940',
      letterSpacing: 2,
    }).setDepth(DEPTH.ui + 2);
    const request = this.add.text(
      190,
      632,
      'FORMAL REQUEST TO ENTER MUNICIPAL REFUSE CORRIDOR 3-B',
      {
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '28px',
        color: INK,
        wordWrap: { width: 1080 },
      },
    ).setDepth(DEPTH.ui + 2);
    const filingDetails = this.add.text(
      190,
      706,
      'PURPOSE OF ENTRY:  PENDING\nAPPLICANT SPECIES:  UNCONFIRMED\nINTENDED REFUSE ACTIVITY:  UNDISCLOSED\nAPPLICATION STATUS:  UNFILED',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '23px',
        color: '#604940',
        lineSpacing: 12,
      },
    ).setDepth(DEPTH.ui + 2);
    const filingPrompt = this.add.text(190, 896, '[click anywhere to submit form]', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#837268',
    }).setDepth(DEPTH.ui + 2);
    this.approvedStamp = this.add.image(1000, 790, 'approvedStamp')
      .setDisplaySize(620, 241)
      .setAngle(-8)
      .setAlpha(0)
      .setDepth(DEPTH.ui + 5);
    this.approvedStampFinalScale = {
      x: this.approvedStamp.scaleX,
      y: this.approvedStamp.scaleY,
    };
    this.approvedStamp.setScale(
      this.approvedStampFinalScale.x * 1.8,
      this.approvedStampFinalScale.y * 1.8,
    );

    this.titleCard.setInteractive({ cursor: 'pointer' });
    this.titleCard.on('pointerdown', () => this.approveApplication());
    createAudioControl(this);
  }

  createPaperPanel(x, y, width, height, textureKey = `paper-${width}-${height}`) {
    createPaperTexture(this, textureKey, width, height);
    return this.add.image(x, y, textureKey)
      .setOrigin(0)
      .setDepth(DEPTH.ui + 1);
  }

  approveApplication() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.titleCard.disableInteractive();
    playSfx(this, 'stamp1');
    syncSceneAudio(this, 'alley');
    this.tweens.add({
      targets: this.approvedStamp,
      alpha: 1,
      scaleX: this.approvedStampFinalScale.x,
      scaleY: this.approvedStampFinalScale.y,
      duration: 190,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.cameras.main.shake(80, 0.0025);
        this.time.delayedCall(900, () => fadeToScene(this, 'Alley'));
      },
    });
  }
}
