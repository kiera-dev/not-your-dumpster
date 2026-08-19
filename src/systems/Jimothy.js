import { DEPTH } from '../config/gameConfig.js';
import { SPRITE_META } from '../config/sceneLayouts.js';

const OUTDOOR_WALK = ['jimothyWalk1', 'jimothyWalk2', 'jimothyWalk3', 'jimothyWalk4'];
const INDOOR_WALK = ['jimothyInteriorWalk1', 'jimothyInteriorWalk2', 'jimothyInteriorWalk3', 'jimothyInteriorWalk4'];
const VEST_INDOOR_WALK = ['jimothyVestInteriorWalk1', 'jimothyVestInteriorWalk2', 'jimothyVestInteriorWalk3', 'jimothyVestInteriorWalk4'];

export function registerWaddles(scene) {
  if (!scene.anims.exists('jimothy-outdoor-waddle')) {
    scene.anims.create({
      key: 'jimothy-outdoor-waddle',
      frames: OUTDOOR_WALK.map((key) => ({ key })),
      frameRate: 8,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('jimothy-indoor-waddle')) {
    scene.anims.create({
      key: 'jimothy-indoor-waddle',
      frames: INDOOR_WALK.map((key) => ({ key })),
      frameRate: 8,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('jimothy-vest-indoor-waddle')) {
    scene.anims.create({
      key: 'jimothy-vest-indoor-waddle',
      frames: VEST_INDOOR_WALK.map((key) => ({ key })),
      frameRate: 8,
      repeat: -1,
    });
  }
}

export function createJimothy(scene, point, {
  interior = false,
  scaleX = 1,
  scaleY = scaleX,
  idleKey: idleKeyOverride,
  vest = false,
} = {}) {
  const idleKey = idleKeyOverride ?? (vest ? 'jimothyVestInteriorIdle' : interior ? 'jimothyInteriorIdle' : 'jimothyIdle');
  const meta = SPRITE_META[idleKey]
    ?? SPRITE_META[interior ? 'jimothyInteriorIdle' : 'jimothyIdle'];
  const sprite = scene.add.sprite(
    point.x + meta.xOffset,
    point.y + meta.yOffset,
    idleKey,
  ).setOrigin(meta.originX, meta.originY).setScale(scaleX, scaleY).setDepth(DEPTH.actor);
  sprite.setData({ interior, idleKey, vest });
  return sprite;
}

export function autoWaddle(scene, jimothy, destination, { speed = 700 } = {}) {
  const distance = Phaser.Math.Distance.Between(jimothy.x, jimothy.y, destination.x, destination.y);
  const movingRight = destination.x >= jimothy.x;
  // Every exported Jimothy walk frame faces left in its source PNG.
  jimothy.setFlipX(movingRight);
  const waddle = jimothy.getData('vest')
    ? 'jimothy-vest-indoor-waddle'
    : jimothy.getData('interior')
      ? 'jimothy-indoor-waddle'
      : 'jimothy-outdoor-waddle';
  jimothy.play(waddle);

  return new Promise((resolve) => {
    scene.tweens.add({
      targets: jimothy,
      x: destination.x,
      y: destination.y,
      duration: Math.max(280, (distance / speed) * 1000),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        jimothy.stop();
        jimothy.setTexture(jimothy.getData('idleKey'));
        jimothy.setFlipX(destination.flipX ?? false);
        resolve();
      },
    });
  });
}
