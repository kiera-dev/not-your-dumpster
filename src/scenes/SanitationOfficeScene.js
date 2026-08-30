import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { SCENE_LAYOUTS } from '../config/sceneLayouts.js';
import { GameState } from '../state/GameState.js';
import { autoWaddle, createJimothy } from '../systems/Jimothy.js';
import { playSfx, syncSceneAudio } from '../systems/audio.js';
import {
  createHotspot,
  createObjectiveHud,
  createSceneExit,
  fadeToScene,
  showChoice,
  showDialogue,
  showToast,
} from '../systems/ui.js';

export class SanitationOfficeScene extends Phaser.Scene {
  constructor() { super('SanitationOffice'); }

  async create() {
    const layout = SCENE_LAYOUTS.sanitationOffice;
    this.layout = layout;
    this.busy = true;
    this.exitPrompt = null;
    this.state = new GameState(this.registry);
    syncSceneAudio(this, 'interior');
    this.add.image(0, 0, layout.background).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background);

    const addPlaced = (texture, item) => this.add.image(item.x, item.y, texture)
      .setOrigin(0.5, 1)
      .setDisplaySize(item.displayWidth, item.displayHeight)
      .setDepth(item.depth);

    this.banana = addPlaced('banana', layout.banana);
    this.financeBro = this.add.sprite(layout.financeBro.x, layout.financeBro.y, 'financeBroIdle')
      .setOrigin(0.5, 1)
      .setScale(layout.financeBro.scaleX, layout.financeBro.scaleY)
      .setDepth(layout.financeBro.depth);
    addPlaced('dracaena', layout.dracaena);
    addPlaced('refuseBin', layout.bin);
    addPlaced('fileStack', layout.fileStack);
    addPlaced('officeChair', layout.chair);
    addPlaced('officeDesk', layout.desk);
    addPlaced('hugeFormStack', layout.hugeForms);
    addPlaced('recycleBin', layout.recycleRight);
    addPlaced('recycleBin', layout.recycleLeft);
    addPlaced('chainedPen', layout.pen);
    this.spoon = addPlaced('spoon', layout.spoon);
    this.tinfoil = addPlaced('tinfoilBall', layout.tinfoil);
    this.takeout = addPlaced('takeoutBox', layout.takeout);
    this.banana.setVisible(!this.state.has('bananaSorted'));
    this.tinfoil.setVisible(!this.state.has('foilSorted'));
    this.spoon.setVisible(!this.state.has('spoonSorted'));

    this.beaver = this.add.sprite(layout.beaver.x, layout.beaver.y, 'beaverIdle')
      .setOrigin(0.5, 1)
      .setDisplaySize(layout.beaver.displayWidth, layout.beaver.displayHeight)
      .setDepth(layout.beaver.depth);

    const wearingVest = this.state.has('vestEquipped');
    this.jimothy = createJimothy(this, layout.jimothy.spawn, {
      interior: true,
      vest: wearingVest,
      scaleX: layout.jimothy.scaleX,
      scaleY: layout.jimothy.scaleY,
      idleKey: wearingVest ? 'jimothyVestInteriorWalk1' : 'jimothyInteriorWalk1',
    });
    this.hud = createObjectiveHud(this, this.state);
    this.createTicker();
    if (this.state.has('spoonSorted')) {
      this.setTicker('SPOONS ▼ 96% - TRADING HALTED', { crashed: true });
    } else if (this.state.has('vestEquipped')) {
      this.updateRefuseMarketTicker();
    }
    await autoWaddle(this, this.jimothy, layout.jimothy.settle, { speed: 800 });
    this.installHotspots();
    this.busy = false;
  }

  setBeaverTexture(texture) {
    const source = this.textures.get(texture).getSourceImage();
    const height = this.layout.beaver.displayHeight;
    this.beaver.setTexture(texture).setDisplaySize(height * (source.width / source.height), height);
  }

  createTicker() {
    this.tickerPanel = this.add.rectangle(0, GAME_HEIGHT - 62, GAME_WIDTH, 62, 0x1c2720, 0.96)
      .setOrigin(0).setDepth(DEPTH.ui + 2).setVisible(false);
    this.tickerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 31, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '27px',
      color: '#e8e0bc',
    }).setOrigin(0.5).setDepth(DEPTH.ui + 3).setVisible(false);
  }

  setTicker(text, { marquee = false, crashed = false } = {}) {
    this.tickerTween?.stop();
    this.tickerPanel
      .setFillStyle(crashed ? 0x3a1e20 : 0x1c2720, 0.96)
      .setVisible(true);
    this.tickerText
      .setColor(crashed ? '#f3b8ad' : '#e8e0bc')
      .setText(text)
      .setVisible(true);
    if (marquee) {
      this.tickerText.setOrigin(0, 0.5).setX(GAME_WIDTH);
      this.tickerTween = this.tweens.add({
        targets: this.tickerText,
        x: -this.tickerText.width,
        duration: 15500,
        ease: 'Linear',
        repeat: -1,
      });
    } else {
      this.tickerText.setOrigin(0.5).setX(GAME_WIDTH / 2);
    }
  }

  pause(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  installHotspots() {
    const hotspots = this.layout.hotspots;
    createHotspot(this, hotspots.beaver, () => this.talkToBeaver(), { label: 'Sanitation official' });
    createHotspot(this, hotspots.pen, () => this.inspectPen(), { label: 'Chained pen' });
    createHotspot(this, hotspots.takeout, () => this.inspectLunch(), { label: 'Takeout container' });
    createHotspot(this, hotspots.exit, () => this.useExit(), { label: 'Return to permit office' });
    createHotspot(this, hotspots.financeBro, () => this.inspectFinanceBro(), { label: 'Finance bro' });

    // Item zones are installed last so the small props win over overlapping NPC zones.
    // Correctly sorted items lose both their artwork and their click target.
    this.itemHotspots = {};
    if (!this.state.has('bananaSorted')) {
      this.itemHotspots.banana = createHotspot(
        this,
        hotspots.banana,
        () => this.sortItem('banana'),
        { label: 'Banana' },
      );
    }
    if (!this.state.has('foilSorted')) {
      this.itemHotspots.foil = createHotspot(
        this,
        hotspots.tinfoil,
        () => this.sortItem('foil'),
        { label: 'Aluminium ball' },
      );
    }
    if (!this.state.has('spoonSorted')) {
      this.itemHotspots.spoon = createHotspot(
        this,
        hotspots.spoon,
        () => this.sortItem('spoon'),
        { label: 'Spoon' },
      );
    }
  }

  retireItem(item, sprite) {
    sprite.setVisible(false);
    this.itemHotspots[item]?.destroy();
    this.itemHotspots[item] = null;
  }

  updateRefuseMarketTicker() {
    if (this.state.has('spoonSorted')) return;
    const instruments = [
      'BANANA PEEL ▲ 4%',
      'ALUMINIUM ▲ 8%',
      'BOTTLECAP ▼ 3%',
      'YOGURT LID - STABLE',
      'PIZZA CRUST FUTURES ▲ 2%',
      'TWIST-TIE - VOLATILE',
      'RECEIPT LENGTH ▲ 11%',
      'KETCHUP PACKET ▼ 1%',
      'COFFEE SLEEVE - HOLD',
      'MYSTERY LID ▲ 6%',
      'WET CARDBOARD FUTURES ▼ 9%',
    ];
    const tickerText = instruments.join('     ');
    if (this.tickerTween?.isPlaying() && this.tickerText.text === tickerText) return;
    this.setTicker(tickerText, { marquee: true });
  }

  async talkToBeaver() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('sanitationComplete')) {
      this.setBeaverTexture('beaverTalk');
      await showDialogue(this, [
        { speaker: 'Sanitation official', text: 'Orientation complete.' },
        { speaker: 'Sanitation official', text: 'The trash market will not recover from this.' },
      ]);
      this.setBeaverTexture('beaverIdle');
      this.busy = false;
      return;
    }

    if (!this.state.has('vestEquipped')) {
      this.setBeaverTexture('beaverTalk');
      await showDialogue(this, [
        { speaker: 'Sanitation official', text: 'Temporary Refuse Technician?' },
        { speaker: 'Jimothy', text: '…' },
        { speaker: 'Sanitation official', text: 'Great.' },
        { speaker: 'Sanitation official', text: 'Before employment can begin, I need to establish that you understand responsible waste handling.' },
      ]);
      this.state.setFlag('vestEquipped');
      this.jimothy.setTexture('jimothyVestInteriorWalk1');
      this.jimothy.setData('idleKey', 'jimothyVestInteriorWalk1');
      this.jimothy.setData('vest', true);
      playSfx(this, 'vestEquip');
      await showToast(this, 'EQUIPPED: MUNICIPAL SAFETY VEST');
      await showDialogue(this, [
        { speaker: 'Sanitation official', text: 'There.' },
        { speaker: 'Sanitation official', text: 'Official.' },
        { speaker: 'Sanitation official', text: 'This office’s activities are tied directly to the municipal trash market.' },
        { speaker: 'Sanitation official', text: 'Classify the refuse.' },
      ]);
      playSfx(this, 'tradingBell');
      this.updateRefuseMarketTicker();
      this.setBeaverTexture('beaverIdle');
    } else {
      await showDialogue(this, [
        { speaker: 'Sanitation official', text: 'Three items. Three municipal destinies.' },
      ]);
    }
    this.busy = false;
  }

  async sortItem(item) {
    if (this.busy) return;
    this.busy = true;
    if (!this.state.has('vestEquipped')) {
      await showDialogue(this, [{ speaker: 'Jimothy', text: 'The item appears to require official clothing.' }]);
      this.busy = false;
      return;
    }
    if (this.state.has(`${item}Sorted`)) {
      const itemName = item === 'foil' ? 'Aluminium' : `${item[0].toUpperCase()}${item.slice(1)}`;
      await showDialogue(this, [{ speaker: 'Jimothy', text: `${itemName}. Already municipalized.` }]);
      this.busy = false;
      return;
    }
    if (item === 'foil' && !this.state.has('bananaSorted')) {
      this.setBeaverTexture('beaverTalk');
      await showDialogue(this, [
        { speaker: 'Sanitation official', text: 'Begin with the banana.' },
        { speaker: 'Sanitation official', text: 'The ticker has standards, allegedly.' },
      ]);
      this.setBeaverTexture('beaverIdle');
      this.busy = false;
      return;
    }
    const spoonIsLast = this.state.has('bananaSorted') && this.state.has('foilSorted');
    if (item === 'spoon' && !spoonIsLast) {
      this.state.setFlag('spoonWarned');
      this.setBeaverTexture('beaverTalk');
      await showDialogue(this, [
        { speaker: 'Sanitation official', text: 'Do not move the spoon.' },
        { speaker: 'Jimothy', text: '…' },
        { speaker: 'Sanitation official', text: 'Spoons are currently undergoing price discovery.' },
      ]);
      this.setBeaverTexture('beaverIdle');
      this.busy = false;
      return;
    }

    const label = item === 'foil' ? 'ALUMINIUM' : item.toUpperCase();
    const destination = await showChoice(this, {
      speaker: 'Municipal sorting interface',
      text: `PLACE ${label} IN:`,
      choices: [
        { label: 'ORGANIC', value: 'organic' },
        { label: 'RECYCLABLE', value: 'recyclable' },
        { label: 'STRATEGIC REFUSE ASSETS', value: 'strategic' },
        { label: 'RACCOON', value: 'raccoon' },
      ],
    });

    if (item === 'banana') await this.resolveBanana(destination);
    else if (item === 'foil') await this.resolveFoil(destination);
    else await this.resolveSpoon(destination);
    this.busy = false;
    await this.maybeCompleteOrientation();
  }

  async resolveBanana(destination) {
    if (destination !== 'organic') {
      const text = destination === 'strategic'
        ? 'Please do not speculate on banana.'
        : destination === 'recyclable' ? 'No.' : 'Raccoon is not a disposal stream.';
      await showDialogue(this, [{ speaker: 'Sanitation official', text }]);
      return;
    }
    this.state.setFlag('bananaSorted');
    await showDialogue(this, [{ speaker: 'Sanitation official', text: 'Correct.' }]);
    this.retireItem('banana', this.banana);
    this.updateRefuseMarketTicker();
  }

  async resolveFoil(destination) {
    if (destination !== 'recyclable') {
      const text = destination === 'organic'
        ? 'Optimistic.'
        : destination === 'strategic' ? 'Not at current valuation.' : 'Raccoon remains administratively unusable.';
      await showDialogue(this, [{ speaker: 'Sanitation official', text }]);
      return;
    }
    this.state.setFlag('foilSorted');
    await showDialogue(this, [{ speaker: 'Sanitation official', text: 'Technically.' }]);
    this.retireItem('foil', this.tinfoil);
    this.updateRefuseMarketTicker();
  }

  async resolveSpoon(destination) {
    this.state.setFlag('spoonSorted');
    this.retireItem('spoon', this.spoon);
    this.setBeaverTexture('beaverTalk');
    await showDialogue(this, [{
      speaker: 'Sanitation official',
      text: destination === 'strategic' ? 'I suppose technically-' : 'That classification is-',
    }]);
    for (const value of ['SPOONS ▲ 14%', 'SPOONS ▲ 370%', 'SPOONS ▲ 840%', 'SPOONS ▲ 2,100%', 'SPOONS ▲ 18,400%']) {
      this.setTicker(value);
      playSfx(this, 'marketRise');
      await this.pause(520);
    }
    this.setTicker('SPOONS ▼ 96% - TRADING HALTED', { crashed: true });
    const crashSound = playSfx(this, 'marketCrash');
    await this.pause(crashSound ? Math.ceil(crashSound.duration * 1000) : 650);
    playSfx(this, 'tradingBell');
    this.setBeaverTexture('beaverHorrified');
    this.financeBro.setTexture('financeBroPanic');
    await showDialogue(this, [
      { speaker: 'Sanitation official', text: 'What have you done?' },
      { speaker: 'Jimothy', text: '…' },
      { speaker: 'Finance bro', text: 'EIGHTY PERCENT OF MY PORTFOLIO WAS IN SPOONS!' },
    ]);
  }

  async maybeCompleteOrientation() {
    if (this.state.has('sanitationComplete')) return;
    if (!this.state.has('bananaSorted') || !this.state.has('foilSorted') || !this.state.has('spoonSorted')) return;
    this.busy = true;
    this.setBeaverTexture('beaverStamp');
    await showDialogue(this, [{ speaker: 'Sanitation official', text: 'Passed.', sound: 'stamp1' }]);
    this.state.setFlag('sanitationComplete');
    this.state.setFlag('hasSanitationCertification');
    this.state.setFlag('hasDollarThirteen');
    await showToast(this, 'CASE FILE UPDATED: SANITATION CERTIFICATION');
    playSfx(this, 'cashReceived');
    await showToast(this, 'RECEIVED: $1.13');
    await this.hud.replaceCurrentObjective('PAY COMMERCIAL PROPERTY TAX');
    this.exitPrompt = createSceneExit(this, 'RETURN TO PERMIT OFFICE', () => this.useExit());
    this.setBeaverTexture('beaverIdle');
    this.busy = false;
  }

  async useExit() {
    if (this.busy) return;
    if (!this.state.has('sanitationComplete')) {
      await showDialogue(this, [{ speaker: 'Sanitation official', text: 'Orientation is not optional.' }]);
      return;
    }
    this.busy = true;
    fadeToScene(this, 'PermitOffice');
  }

  async inspectFinanceBro() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('spoonSorted')) {
      await showDialogue(this, [
        { speaker: 'Finance bro', text: 'Spoons were supposed to be decentralized.' },
        { speaker: 'Jimothy', text: 'The spoon is no longer in circulation.' },
      ]);
    } else {
      await showDialogue(this, [
        { speaker: 'Finance bro', text: 'I moved my retirement into dumpster-backed crypto.' },
        { speaker: 'Jimothy', text: 'The dumpster does not appear aware of this.' },
      ]);
    }
    this.busy = false;
  }

  async inspectPen() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'Jimothy tries to take the pen.' },
      { speaker: 'Chained pen', text: 'CLINK.', sound: 'penChain' },
      { speaker: 'Jimothy', text: 'The municipal pen containment program appears to be extremely well funded.' },
      { speaker: 'Jimothy', text: 'The beaver does not notice.' },
    ]);
    this.busy = false;
  }

  async inspectLunch() {
    if (this.busy) return;
    this.busy = true;
    this.setBeaverTexture('beaverTalk');
    await showDialogue(this, [
      { speaker: 'Sanitation official', text: 'That’s my lunch.' },
      { speaker: 'Jimothy', text: '…' },
    ]);
    this.setBeaverTexture('beaverIdle');
    this.busy = false;
  }
}
