import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { createAudioControl, playSfx } from './audio.js';

const PAPER = 0xf1e4c7;
const INK = '#261b18';

export function createObjectiveHud(scene, gameState) {
  createAudioControl(scene);
  const rageTextureKey = 'rageVignetteTexture';
  if (!scene.textures.exists(rageTextureKey)) {
    const texture = scene.textures.createCanvas(rageTextureKey, GAME_WIDTH, GAME_HEIGHT);
    const context = texture.getContext();
    context.fillStyle = 'rgba(101, 8, 20, 0.055)';
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const paintEdge = (gradient, x, y, width, height) => {
      context.fillStyle = gradient;
      context.fillRect(x, y, width, height);
    };
    const top = context.createLinearGradient(0, 0, 0, 280);
    top.addColorStop(0, 'rgba(55, 2, 10, 0.58)');
    top.addColorStop(1, 'rgba(75, 5, 15, 0)');
    paintEdge(top, 0, 0, GAME_WIDTH, 280);
    const bottom = context.createLinearGradient(0, GAME_HEIGHT, 0, GAME_HEIGHT - 280);
    bottom.addColorStop(0, 'rgba(55, 2, 10, 0.58)');
    bottom.addColorStop(1, 'rgba(75, 5, 15, 0)');
    paintEdge(bottom, 0, GAME_HEIGHT - 280, GAME_WIDTH, 280);
    const left = context.createLinearGradient(0, 0, 320, 0);
    left.addColorStop(0, 'rgba(55, 2, 10, 0.52)');
    left.addColorStop(1, 'rgba(75, 5, 15, 0)');
    paintEdge(left, 0, 0, 320, GAME_HEIGHT);
    const right = context.createLinearGradient(GAME_WIDTH, 0, GAME_WIDTH - 320, 0);
    right.addColorStop(0, 'rgba(55, 2, 10, 0.52)');
    right.addColorStop(1, 'rgba(75, 5, 15, 0)');
    paintEdge(right, GAME_WIDTH - 320, 0, 320, GAME_HEIGHT);
    texture.refresh();
  }
  const rageVignette = scene.add.container(0, 0, [
    scene.add.image(0, 0, rageTextureKey).setOrigin(0),
    scene.add.text(GAME_WIDTH - 44, GAME_HEIGHT - 38, 'RACCOON RAGE MODE', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      color: '#a93b3b',
      stroke: '#31040a',
      strokeThickness: 7,
    }).setOrigin(1, 1).setAlpha(0.72),
  ])
    .setDepth(DEPTH.ui - 1)
    .setScrollFactor(0)
    .setVisible(false);
  const ragePulse = scene.tweens.add({
    targets: rageVignette,
    alpha: { from: 0.72, to: 1 },
    duration: 3600,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
    paused: true,
  });
  const panel = scene.add.rectangle(36, 36, 560, 248, PAPER, 0.96)
    .setOrigin(0)
    .setStrokeStyle(5, 0x382824)
    .setDepth(DEPTH.ui)
    .setScrollFactor(0);
  const headingStyle = {
    fontFamily: 'Georgia, serif',
    fontSize: '27px',
    color: INK,
    fontStyle: 'bold',
  };
  const objectiveStyle = {
    ...headingStyle,
    fontSize: '29px',
    wordWrap: { width: 500 },
  };
  const personalHeading = scene.add.text(66, 58, 'PERSONAL OBJECTIVE', headingStyle)
    .setDepth(DEPTH.ui + 1).setScrollFactor(0);
  const personalText = scene.add.text(66, 96, '', objectiveStyle).setDepth(DEPTH.ui + 1).setScrollFactor(0);
  const currentHeading = scene.add.text(66, 158, 'CURRENT OBJECTIVE', headingStyle)
    .setDepth(DEPTH.ui + 1).setScrollFactor(0);
  const currentText = scene.add.text(66, 196, '', objectiveStyle).setDepth(DEPTH.ui + 1).setScrollFactor(0);

  const render = () => {
    const state = gameState.data;
    const feral = gameState.has('feralMode');
    const showRageVisuals = feral && !gameState.has('rageVisualsComplete');
    rageVignette.setVisible(showRageVisuals);
    if (showRageVisuals && !ragePulse.isPlaying()) ragePulse.resume();
    if (!showRageVisuals && ragePulse.isPlaying()) ragePulse.pause();
    personalText.setText(state.personalObjective);
    currentText.setText(state.currentObjective);
    currentHeading.setVisible(true);
    currentText.setVisible(true);
    personalText.setFontSize(feral ? 42 : 29).setY(96);
    currentText.setFontSize(feral ? 42 : 29).setY(196);
    const contentHeight = currentText.y + currentText.height + 22 - panel.y;
    panel.setDisplaySize(560, Math.max(feral ? 300 : 248, contentHeight));
  };
  render();
  scene.registry.events.on('changedata-gameState', render);
  scene.events.once('shutdown', () => scene.registry.events.off('changedata-gameState', render));
  const replaceCurrentObjective = (nextObjective) => new Promise((resolve) => {
    const wrappedLines = currentText.getWrappedText(currentText.text);
    const lineHeight = currentText.height / Math.max(1, wrappedLines.length);
    const strikes = wrappedLines.map((line, index) => {
      const measuredWidth = currentText.context.measureText(line).width;
      return scene.add.rectangle(
        currentText.x,
        currentText.y + (lineHeight * index) + (lineHeight * 0.55),
        Math.max(20, Math.min(500, measuredWidth)),
        5,
        0x6f2722,
      ).setOrigin(0, 0.5).setScale(0, 1).setDepth(DEPTH.ui + 3).setScrollFactor(0);
    });

    scene.tweens.add({
      targets: strikes,
      scaleX: 1,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        scene.time.delayedCall(360, () => {
          gameState.setCurrentObjective(nextObjective);
          strikes.forEach((strike) => strike.destroy());
          currentText.setAlpha(0);
          scene.tweens.add({
            targets: currentText,
            alpha: 1,
            duration: 220,
            onComplete: resolve,
          });
        });
      },
    });
  });

  const enterFeralMode = () => new Promise((resolve) => {
    const targets = [panel, personalHeading, personalText, currentHeading, currentText];
    scene.tweens.add({
      targets,
      alpha: { from: 1, to: 0.2 },
      duration: 90,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        gameState.setCurrentObjective('EAT FORM 12-C');
        gameState.setFlag('feralMode');
        targets.forEach((target) => target.setAlpha(1));
        scene.cameras.main.zoomTo(1.025, 110, 'Cubic.easeOut');
        scene.time.delayedCall(120, () => scene.cameras.main.zoomTo(1, 260, 'Back.easeOut'));
        scene.cameras.main.shake(180, 0.0045);
        const rageMarquee = scene.add.text(
          GAME_WIDTH + 80,
          GAME_HEIGHT * 0.68,
          'RACCOON RAGE MODE',
          {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '92px',
            color: '#b84343',
            stroke: '#31040a',
            strokeThickness: 12,
          },
        )
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.ui + 8)
          .setScrollFactor(0);
        scene.tweens.add({
          targets: rageMarquee,
          x: -rageMarquee.width - 80,
          duration: 2500,
          ease: 'Linear',
          onComplete: () => rageMarquee.destroy(),
        });
        scene.tweens.add({
          targets: personalText,
          scale: { from: 0.82, to: 1 },
          duration: 420,
          ease: 'Back.easeOut',
          onComplete: resolve,
        });
      },
    });
  });

  return {
    panel,
    personalHeading,
    personalText,
    currentHeading,
    currentText,
    rageVignette,
    render,
    replaceCurrentObjective,
    enterFeralMode,
  };
}

export function createHotspot(scene, bounds, onClick, { label = '' } = {}) {
  const zone = scene.add.zone(bounds.x, bounds.y, bounds.width, bounds.height)
    .setInteractive({ cursor: 'pointer' })
    .setDepth(DEPTH.effect);
  zone.on('pointerdown', onClick);
  if (label) {
    zone.on('pointerover', () => scene.game.canvas.setAttribute('aria-label', label));
  }
  return zone;
}

export function createSceneExit(scene, text, onClick) {
  const width = 500;
  const height = 78;
  const x = GAME_WIDTH - 34;
  const y = 360;
  const panel = scene.add.rectangle(x, y, width, height, PAPER, 0.97)
    .setOrigin(1, 1)
    .setStrokeStyle(5, 0x382824)
    .setDepth(DEPTH.ui + 1)
    .setInteractive({ cursor: 'pointer' });
  const label = scene.add.text(x - 26, y - height / 2, `${text}  ›`, {
    fontFamily: 'Georgia, serif',
    fontStyle: 'bold',
    fontSize: '25px',
    color: INK,
  }).setOrigin(1, 0.5).setDepth(DEPTH.ui + 2);
  panel.on('pointerover', () => panel.setFillStyle(0xfff2d3));
  panel.on('pointerout', () => panel.setFillStyle(PAPER));
  panel.on('pointerdown', () => {
    playSfx(scene, 'uiClick');
    onClick();
  });
  return { panel, label };
}

export function showDialogue(scene, lines) {
  return new Promise((resolve) => {
    let index = 0;
    const boxX = 84;
    const boxWidth = GAME_WIDTH * 0.65;
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.12)
      .setOrigin(0).setDepth(DEPTH.ui + 5);
    const box = scene.add.rectangle(boxX, GAME_HEIGHT - 320, boxWidth, 250, PAPER, 0.98)
      .setOrigin(0).setStrokeStyle(7, 0x382824).setDepth(DEPTH.ui + 6);
    const speaker = scene.add.text(126, GAME_HEIGHT - 286, '', {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '34px', color: INK,
    }).setDepth(DEPTH.ui + 7);
    const body = scene.add.text(126, GAME_HEIGHT - 232, '', {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: INK,
      wordWrap: { width: boxWidth - 84 }, lineSpacing: 8,
    }).setDepth(DEPTH.ui + 7);
    const prompt = scene.add.text(boxX + boxWidth - 44, GAME_HEIGHT - 104, 'CLICK TO CONTINUE  ›', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#604940',
    }).setOrigin(1, 1).setDepth(DEPTH.ui + 7);
    const clickShield = scene.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive({ cursor: 'pointer' }).setDepth(DEPTH.ui + 8);

    const render = () => {
      const line = lines[index];
      speaker.setText(line.speaker.toUpperCase());
      body
        .setText(line.text)
        .setFontSize(line.fontSize ?? 36)
        .setFontStyle(line.fontStyle ?? 'normal');
      if (line.sound) playSfx(scene, line.sound);
    };
    const destroy = () => {
      [shade, box, speaker, body, prompt, clickShield].forEach((item) => item.destroy());
      resolve();
    };
    clickShield.on('pointerdown', () => {
      playSfx(scene, 'uiClick');
      index += 1;
      if (index >= lines.length) destroy();
      else render();
    });
    render();
  });
}

export function showChoice(scene, { speaker, text, choices }) {
  return new Promise((resolve) => {
    const boxX = 84;
    const boxWidth = GAME_WIDTH * 0.65;
    const contentX = boxX + 42;
    const contentWidth = boxWidth - 84;
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.16)
      .setOrigin(0).setDepth(DEPTH.ui + 5);
    const boxY = GAME_HEIGHT - 390;
    const box = scene.add.rectangle(boxX, boxY, boxWidth, 320, PAPER, 0.99)
      .setOrigin(0).setStrokeStyle(7, 0x382824).setDepth(DEPTH.ui + 6);
    const speakerText = scene.add.text(contentX, boxY + 28, speaker.toUpperCase(), {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '31px', color: INK,
    }).setDepth(DEPTH.ui + 7);
    const body = scene.add.text(contentX, boxY + 76, text, {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: INK,
      wordWrap: { width: contentWidth },
    }).setDepth(DEPTH.ui + 7);
    const created = [shade, box, speakerText, body];
    const wiggles = [];
    const rageChoice = choices.some((choice) => choice.feral);
    const columnGap = 48;
    const buttonWidth = rageChoice ? contentWidth : (contentWidth - columnGap) / 2;
    const buttonHeight = rageChoice ? 86 : 56;

    choices.forEach((choice, index) => {
      const column = rageChoice ? 0 : index % 2;
      const row = rageChoice ? index : Math.floor(index / 2);
      const x = contentX + column * (buttonWidth + columnGap);
      const y = boxY + 170 + row * (rageChoice ? 98 : 70);
      const button = scene.add.rectangle(x, y, buttonWidth, buttonHeight, 0xd8c7a7, 1)
        .setOrigin(0).setStrokeStyle(3, 0x604940).setDepth(DEPTH.ui + 7)
        .setInteractive({ cursor: 'pointer' });
      const labelX = x + 22;
      const labelY = y + buttonHeight / 2;
      const label = scene.add.text(labelX, labelY, choice.feral ? choice.label.toUpperCase() : choice.label, {
        fontFamily: 'Arial, sans-serif',
        fontStyle: choice.feral ? 'bold' : 'normal',
        fontSize: choice.feral ? '42px' : '23px',
        color: choice.feral ? '#6f2722' : INK,
      }).setOrigin(0, 0.5).setDepth(DEPTH.ui + 8);
      if (choice.feral) {
        button.setStrokeStyle(5, 0x6f2722);
        wiggles.push(scene.time.addEvent({
          delay: 92,
          loop: true,
          callback: () => label
            .setPosition(labelX + Phaser.Math.Between(-2, 2), labelY + Phaser.Math.Between(-1, 1))
            .setAngle(Phaser.Math.FloatBetween(-0.5, 0.5)),
        }));
      }
      button.on('pointerover', () => button.setFillStyle(0xeadab9));
      button.on('pointerout', () => button.setFillStyle(0xd8c7a7));
      button.on('pointerdown', () => {
        playSfx(scene, 'uiClick');
        wiggles.forEach((wiggle) => wiggle.remove());
        created.forEach((item) => item.destroy());
        resolve(choice.value);
      });
      created.push(button, label);
    });
  });
}

export function showToast(scene, text, { duration = 2550, sound = true } = {}) {
  return new Promise((resolve) => {
    if (sound) playSfx(scene, 'inventoryUpdated');
    const width = 900;
    const panel = scene.add.rectangle(GAME_WIDTH - 42, 82, width, 104, PAPER, 0.98)
      .setOrigin(1, 0).setStrokeStyle(5, 0x382824).setDepth(DEPTH.ui + 10);
    const label = scene.add.text(GAME_WIDTH - 72, 134, text, {
      fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '27px', color: INK,
      wordWrap: { width: width - 60 },
      align: 'right',
    }).setOrigin(1, 0.5).setDepth(DEPTH.ui + 11);
    scene.time.delayedCall(duration, () => {
      scene.tweens.add({
        targets: [panel, label], alpha: 0, duration: 220,
        onComplete: () => {
          panel.destroy();
          label.destroy();
          resolve();
        },
      });
    });
  });
}

export function fadeToScene(scene, key, data) {
  let completed = false;
  let fallback;
  const finish = () => {
    if (completed || !scene.sys.isActive()) return;
    completed = true;
    window.clearTimeout(fallback);
    scene.scene.start(key, data);
  };
  scene.cameras.main.fadeOut(350, 22, 16, 15);
  scene.cameras.main.once('camerafadeoutcomplete', finish);
  // Browser tabs can suspend animation frames while asleep. This fallback keeps
  // a scene transition from becoming permanently stranded after the tab wakes.
  fallback = window.setTimeout(finish, 750);
}
