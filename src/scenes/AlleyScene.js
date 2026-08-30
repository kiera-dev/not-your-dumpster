import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { SCENE_LAYOUTS, SPRITE_META } from '../config/sceneLayouts.js';
import { GameState } from '../state/GameState.js';
import { autoWaddle, createJimothy } from '../systems/Jimothy.js';
import { getAudio, playSfx, syncSceneAudio } from '../systems/audio.js';
import {
  createHotspot,
  createObjectiveHud,
  createSceneExit,
  fadeToScene,
  showChoice,
  showDialogue,
  showToast,
} from '../systems/ui.js';

export class AlleyScene extends Phaser.Scene {
  constructor() { super('Alley'); }

  create(data = {}) {
    const layout = SCENE_LAYOUTS.alley;
    this.busy = false;
    // Phaser reuses Scene instances. UI and zones are destroyed on shutdown,
    // but their JavaScript references survive unless explicitly cleared.
    this.exitPrompt = null;
    this.doorHotspot = null;
    this.leafHotspot = null;
    this.coneHotspot = null;
    this.cone = null;
    this.state = new GameState(this.registry);
    syncSceneAudio(this, 'alley');
    this.add.image(0, 0, layout.background).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background);

    const dumpsterKey = this.state.has('dumpsterOpened') ? 'dumpsterOpen' : 'dumpsterClosed';
    this.dumpster = this.add.image(layout.dumpster.x, layout.dumpster.y, dumpsterKey)
      .setOrigin(layout.dumpster.originX, layout.dumpster.originY)
      .setDisplaySize(layout.dumpster.displayWidth, layout.dumpster.displayHeight)
      .setDepth(layout.dumpster.depth);
    if (!this.state.has('hasLeaf')) {
      this.leaf = this.add.image(layout.evidence.leaf.x, layout.evidence.leaf.y, 'leaf')
        .setOrigin(0.5, 1)
        .setDisplaySize(layout.evidence.leaf.displayWidth, layout.evidence.leaf.displayHeight)
        .setDepth(layout.evidence.leaf.depth);
    }
    this.takeoutBox = this.add.image(layout.evidence.takeoutBox.x, layout.evidence.takeoutBox.y, 'takeoutBox')
      .setOrigin(0.5, 1)
      .setDisplaySize(layout.evidence.takeoutBox.displayWidth, layout.evidence.takeoutBox.displayHeight)
      .setDepth(layout.evidence.takeoutBox.depth);
    if (!this.state.has('coneMovedFeral')) {
      const coneShift = (this.state.has('coneMovedEarly') || this.state.has('coneMovedByCity')) ? 45 : 0;
      this.cone = this.add.image(
        layout.evidence.theCone.x - coneShift,
        layout.evidence.theCone.y,
        'theCone',
      )
        .setOrigin(0.5, 1)
        .setDisplaySize(layout.evidence.theCone.displayWidth, layout.evidence.theCone.displayHeight)
        .setDepth(layout.evidence.theCone.depth);
    }
    this.receipt = this.add.image(layout.evidence.receipt.x, layout.evidence.receipt.y, 'crumpledReceipt')
      .setOrigin(0.5, 1)
      .setDisplaySize(layout.evidence.receipt.displayWidth, layout.evidence.receipt.displayHeight)
      .setDepth(layout.evidence.receipt.depth);

    const jimothyStart = data.fromFeralOffice
      ? layout.jimothy.feralReturn
      : data.fromDumpster
      ? layout.jimothy.dumpsterReturn
      : this.state.has('needsResidencyProof')
      ? layout.jimothy.returnFromOffice
      : this.state.has('clerkInterrupted')
        ? layout.jimothy.doorApproach
        : this.state.has('grapeAttempted')
          ? layout.jimothy.dumpsterApproach
          : layout.jimothy.spawn;
    this.jimothy = createJimothy(this, jimothyStart, {
      scaleX: layout.jimothy.scaleX,
      scaleY: layout.jimothy.scaleY,
    });
    this.hud = createObjectiveHud(this, this.state);

    createHotspot(this, layout.dumpster.hotspot, () => this.inspectDumpster(), { label: 'Dumpster' });
    this.installConeHotspot();
    if (this.state.has('clerkInterrupted')) this.installAlleyPropHotspots();
    if (this.state.has('needsResidencyProof') && !this.state.has('hasLeaf')) {
      this.leafHotspot = createHotspot(this, {
        x: layout.evidence.leaf.x,
        y: layout.evidence.leaf.y - 30,
        width: 150,
        height: 130,
      }, () => this.collectLeaf(), { label: 'Leaf' });
    }
    if (this.state.has('permitOfficeUnlocked')) this.enableOfficeDoor();
    if (this.state.has('grapeAttempted') && !this.state.has('clerkInterrupted')) this.runClerkInterruption();
    if (data.fromFeralOffice && this.state.has('deskTaken') && !this.state.has('coneMovedFeral')) {
      this.runFinalConeKick();
    }
  }

  async inspectDumpster() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('dumpsterOpened')) {
      fadeToScene(this, 'DumpsterReveal');
      return;
    }
    await autoWaddle(this, this.jimothy, SCENE_LAYOUTS.alley.jimothy.dumpsterApproach);
    this.jimothy.setTexture('jimothyInteract');
    this.state.setFlag('dumpsterOpened');
    this.dumpster.setTexture('dumpsterOpen');
    playSfx(this, 'dumpsterOpen');
    fadeToScene(this, 'DumpsterReveal');
  }

  async runClerkInterruption() {
    this.busy = true;
    const layout = SCENE_LAYOUTS.alley;
    const meta = SPRITE_META.clerkIdle;
    this.clerk = this.add.sprite(layout.clerk.entrance.x, layout.clerk.entrance.y, 'clerkIdle')
      .setOrigin(meta.originX, meta.originY)
      .setScale(layout.clerk.scaleX, layout.clerk.scaleY)
      .setDepth(layout.clerk.depth);
    await new Promise((resolve) => this.tweens.add({
      targets: this.clerk,
      x: layout.clerk.conversation.x,
      y: layout.clerk.conversation.y,
      duration: 650,
      ease: 'Sine.easeOut',
      onComplete: resolve,
    }));
    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'Hold it! Unauthorized refuse access is prohibited.' },
      { speaker: 'Jimothy', text: '…' },
      { speaker: 'Clerk', text: 'That grape is municipal property. You need a Dumpster Access Permit.' },
    ]);
    this.clerk.setTexture('clerkIdle');
    await this.hud.replaceCurrentObjective('OBTAIN DUMPSTER ACCESS PERMIT');
    this.state.setFlag('clerkInterrupted');
    this.state.setFlag('permitOfficeUnlocked');
    this.enableOfficeDoor();
    this.busy = false;
  }

  enableOfficeDoor() {
    if (!this.doorHotspot) {
      this.doorHotspot = createHotspot(this, SCENE_LAYOUTS.alley.officeDoor.hotspot, () => this.enterOffice(), { label: 'Permit Office door' });
    }
    if (!this.exitPrompt && !this.state.has('needsResidencyProof') && !this.state.has('feralMode')) {
      this.exitPrompt = createSceneExit(this, 'ENTER PERMIT OFFICE', () => this.enterOffice());
    }
  }

  installAlleyPropHotspots() {
    const evidence = SCENE_LAYOUTS.alley.evidence;
    createHotspot(this, {
      x: evidence.takeoutBox.x,
      y: evidence.takeoutBox.y - 30,
      width: 150,
      height: 120,
    }, () => this.inspectTakeout(), { label: 'Takeout container' });
    this.installConeHotspot();
    createHotspot(this, {
      x: evidence.receipt.x,
      y: evidence.receipt.y - 20,
      width: 130,
      height: 110,
    }, () => this.inspectReceipt(), { label: 'Crumpled receipt' });
  }

  installConeHotspot() {
    if (!this.cone || this.coneHotspot) return;
    const evidence = SCENE_LAYOUTS.alley.evidence;
    this.coneHotspot = createHotspot(this, {
      x: this.cone.x,
      y: evidence.theCone.y - 120,
      width: 190,
      height: 260,
    }, () => this.inspectCone(), { label: 'THE CONE' });
  }

  async inspectTakeout() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'Worms!' },
      { speaker: 'Jimothy', text: '…They are only noodles.' },
    ]);
    this.busy = false;
  }

  async inspectReceipt() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'A crumpled receipt.' },
      { speaker: 'Jimothy', text: 'Approximately one receipt long.' },
    ]);
    this.busy = false;
  }

  async inspectCone() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('feralMode')) {
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'The cone is being saved for a final administrative remedy.' },
      ]);
      this.busy = false;
      return;
    }
    if (this.state.has('coneMovedEarly')) {
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'THE CONE.' },
        { speaker: 'Jimothy', text: 'Now six inches more jurisdictional.' },
      ]);
      this.busy = false;
      return;
    }
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'A traffic cone.' },
      { speaker: 'Jimothy', text: 'It appears to be doing its job.' },
    ]);
    const action = await showChoice(this, {
      speaker: 'Jimothy',
      text: 'MOVE THE CONE?',
      choices: [
        { label: 'NO', value: 'no' },
        { label: 'RACCOON', value: 'raccoon' },
        { label: 'MOVE IT SIX INCHES', value: 'move' },
        { label: 'PRRT?', value: 'trill' },
      ],
    });
    if (action === 'move') {
      playSfx(this, 'coneMove');
      await new Promise((resolve) => this.tweens.add({
        targets: this.cone,
        x: this.cone.x - 45,
        duration: 420,
        ease: 'Sine.easeInOut',
        onComplete: resolve,
      }));
      this.state.setFlag('coneMovedEarly');
      await showDialogue(this, [
        { speaker: 'Crow, somewhere', text: 'THE CONE WAS MOVED?' },
        { speaker: 'Crow, somewhere', text: 'SIX INCHES?' },
      ]);
    } else if (action === 'raccoon') {
      await showDialogue(this, [{ speaker: 'System', text: 'No actionable information received.' }]);
    } else if (action === 'trill') {
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'Prrt?' },
        { speaker: 'THE CONE', text: 'The cone remains professionally silent.' },
      ]);
    }
    this.busy = false;
  }

  async runFinalConeKick() {
    this.busy = true;
    const feralScaleX = SCENE_LAYOUTS.alley.jimothy.scaleX
      * (SCENE_LAYOUTS.alley.clerk.scaleX / SCENE_LAYOUTS.permitOffice.clerk.scaleX);
    const feralScaleY = SCENE_LAYOUTS.alley.jimothy.scaleY
      * (SCENE_LAYOUTS.alley.clerk.scaleY / SCENE_LAYOUTS.permitOffice.clerk.scaleY);
    this.jimothy
      .setTexture('jimothyFeralInteriorInteract')
      .setScale(feralScaleX, feralScaleY)
      .setFlipX(true);
    await new Promise((resolve) => this.tweens.add({
      targets: this.jimothy,
      x: 1640,
      y: 1070,
      duration: 560,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => this.jimothy.setAngle(Math.sin(tween.progress * Math.PI * 8) * 2.5),
      onComplete: () => {
        this.jimothy.setAngle(0);
        resolve();
      },
    }));
    const rageShake = this.tweens.add({
      targets: this.jimothy,
      x: { from: 1638.5, to: 1641.5 },
      y: { from: 1069.25, to: 1070.75 },
      duration: 105,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    await showChoice(this, {
      speaker: 'Jimothy',
      text: 'One jurisdictional matter remains outstanding.',
      choices: [{ label: 'KICK THE CONE', value: 'kick', feral: true }],
    });
    rageShake.remove();
    this.jimothy.setPosition(1640, 1070);
    this.cameras.main.shake(220, 0.006);
    playSfx(this, 'coneKick');
    await new Promise((resolve) => this.tweens.add({
      targets: this.cone,
      x: GAME_WIDTH + 360,
      y: 560,
      angle: 1080,
      scaleX: this.cone.scaleX * 0.55,
      scaleY: this.cone.scaleY * 0.55,
      duration: 820,
      ease: 'Cubic.easeIn',
      onComplete: resolve,
    }));
    this.cone.destroy();
    this.cone = null;
    this.coneHotspot?.destroy();
    this.coneHotspot = null;
    this.state.setFlag('coneMovedFeral');
    await showDialogue(this, [
      { speaker: 'Crow, somewhere', text: 'NOOOOOO! NOT THE CONE!' },
      { speaker: 'Crow, somewhere', text: 'THAT WAS THE ENTIRE JURISDICTIONAL BOUNDARY!' },
    ]);
    this.state.setFlag('rageVisualsComplete');
    getAudio(this).stopRage();
    this.jimothy
      .setTexture('jimothyIdle')
      .setScale(SCENE_LAYOUTS.alley.jimothy.scaleX, SCENE_LAYOUTS.alley.jimothy.scaleY)
      .setFlipX(false)
      .setData('idleKey', 'jimothyIdle')
      .setData('vest', false);
    await this.hud.replaceCurrentObjective('GET GRAPE');
    this.busy = false;
  }

  async enterOffice() {
    if (this.busy) return;
    if (this.state.has('feralMode')) {
      this.busy = true;
      await showDialogue(this, [{ speaker: 'Jimothy', text: 'The office has no remaining grape.' }]);
      this.busy = false;
      return;
    }
    this.busy = true;
    // The dumpster blocks a believable straight route. A clean scene cut keeps this
    // point-and-click transition intentional without introducing pathfinding.
    fadeToScene(this, 'PermitOffice');
  }

  async collectLeaf() {
    if (this.busy || this.state.has('hasLeaf')) return;
    this.busy = true;
    await autoWaddle(this, this.jimothy, { x: 1575, y: 1025, flipX: true });
    this.jimothy.setTexture('jimothyInteract');
    this.state.setFlag('hasLeaf');
    this.leaf?.destroy();
    this.leafHotspot?.destroy();
    await showToast(this, 'ACQUIRED: LEAF - PROVENANCE UNCERTAIN');
    this.jimothy.setTexture('jimothyIdle').setFlipX(false);
    fadeToScene(this, 'PermitOffice');
  }
}
