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

const STAMP_RAMPAGE = Object.freeze([
  { key: 'deniedStamp', x: 485, y: 345, width: 185, angle: -8, target: 'wall' },
  { key: 'voidStamp', x: 720, y: 835, width: 170, angle: 7, target: 'desk' },
  { key: 'returnedStamp', x: 285, y: 720, width: 175, angle: -13, target: 'forms' },
  { key: 'approvedStamp', x: 835, y: 545, width: 160, angle: 9, target: 'plant' },
  { key: 'deniedStamp', x: 820, y: 610, width: 165, angle: -5, target: 'wall' },
  { key: 'voidStamp', x: 1175, y: 410, width: 190, angle: 12, target: 'wall' },
  { key: 'approvedStamp', x: 1490, y: 630, width: 180, angle: -10, target: 'wall' },
  { key: 'returnedStamp', x: 1760, y: 925, width: 205, angle: 6, target: 'wall' },
]);
const HALF_EATEN_FORM_WIDTH = 437;

export class PermitOfficeScene extends Phaser.Scene {
  constructor() { super('PermitOffice'); }

  async create() {
    const layout = SCENE_LAYOUTS.permitOffice;
    this.layout = layout;
    this.busy = true;
    this.exitPrompt = null;
    this.form12Hotspot = null;
    this.penHotspot = null;
    this.stampHotspot = null;
    this.keyHotspot = null;
    this.screenInspections = 0;
    this.stampMarks = [];
    this.state = new GameState(this.registry);
    syncSceneAudio(this, 'interior');
    this.state.setFlag('enteredPermitOffice');
    this.add.image(0, 0, layout.background).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background);

    const addPlaced = (texture, item) => this.add.image(item.x, item.y, texture)
      .setOrigin(0.5, 1)
      .setDisplaySize(item.displayWidth, item.displayHeight)
      .setDepth(item.depth);

    addPlaced('crumpledReceipt', layout.receipt);
    // Deliberate PSD layer sandwich: background → clerk → counter → props → Jimothy → UI.
    const clerkMeta = SPRITE_META.clerkIdle;
    const clerkTexture = this.state.has('feralMode') ? 'clerkPanic' : 'clerkIdle';
    this.clerk = this.add.sprite(layout.clerk.x, layout.clerk.y, clerkTexture)
      .setOrigin(clerkMeta.originX, clerkMeta.originY)
      .setScale(layout.clerk.scaleX, layout.clerk.scaleY)
      .setDepth(layout.clerk.depth);
    this.counter = this.state.has('deskTaken') ? null : addPlaced('officeCounter', layout.counter);
    this.counterFormStack = addPlaced('formStack', layout.counterFormStack);
    if (!this.state.has('hasMunicipalStamp')) this.stamp = addPlaced('municipalStamp', layout.stamp);
    if (!this.state.has('hasMunicipalKey')) this.municipalKey = addPlaced('municipalKey', layout.key);
    addPlaced('fileStack', layout.fileStack);
    const plantLayout = this.state.has('deskTaken') ? layout.happyPlant : layout.sadPlant;
    this.plant = addPlaced(this.state.has('deskTaken') ? 'happyPlant' : 'sadPlant', plantLayout);
    addPlaced('ticketScreen', layout.ticketScreen);
    addPlaced('hugeFormStack', layout.hugeFormStack);
    this.ticketMachine = this.state.has('deskTaken') ? null : addPlaced('ticketMachine', layout.ticketMachine);
    this.chainedPen = this.state.has('deskTaken') ? null : addPlaced('chainedPen', layout.pen);
    addPlaced('dracaena', layout.dracaena);
    addPlaced('formStack', layout.rightFormStack);
    this.serviceBell = addPlaced('serviceBell', layout.serviceBell);
    if (this.state.has('deskTaken')) {
      this.counterFormStack.setPosition(460, 1070).setAngle(-72).setDepth(DEPTH.prop);
      this.stamp?.setPosition(590, 1085).setAngle(90).setDepth(DEPTH.prop + 1);
      this.serviceBell.setPosition(810, 1090).setAngle(82).setDepth(DEPTH.prop + 1);
    }
    if (this.state.has('form12Presented') && !this.state.has('form12Submitted')) {
      this.createForm12Prop();
    }
    if (this.state.has('stampRampageComplete')) this.restoreStampRampage();

    this.ticketNumber = this.add.text(
      layout.ticketScreen.x,
      layout.ticketScreen.y - 72,
      this.state.has('number033Called') ? '033' : '007',
      {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '53px',
      color: '#d8ead2',
      stroke: '#18201a',
      strokeThickness: 5,
      },
    ).setOrigin(0.5).setDepth(layout.ticketScreen.depth + 1);

    const wearingVest = this.state.has('vestEquipped');
    const feral = this.state.has('feralMode');
    this.jimothy = createJimothy(this, layout.jimothy.spawn, {
      interior: true,
      scaleX: layout.jimothy.scaleX,
      scaleY: layout.jimothy.scaleY,
      vest: wearingVest,
      idleKey: wearingVest
        ? 'jimothyVestInteriorWalk1'
        : feral ? 'jimothyFeralInteriorInteract' : 'jimothyInteriorWalk1',
    });
    this.hud = createObjectiveHud(this, this.state);
    await autoWaddle(this, this.jimothy, layout.jimothy.settle, { speed: 800 });
    this.installHotspots();
    this.refreshExitPrompt();
    this.busy = false;
  }

  installHotspots() {
    const hotspots = SCENE_LAYOUTS.permitOffice.hotspots;
    createHotspot(this, hotspots.clerk, () => this.speakToClerk(), { label: 'Clerk' });
    if (!this.state.has('deskTaken')) {
      this.ticketMachineHotspot = createHotspot(this, hotspots.ticketMachine, () => this.takeNumber(), { label: 'Ticket machine' });
    }
    createHotspot(this, hotspots.ticketScreen, () => this.inspectTicketScreen(), { label: 'Now serving display' });
    this.serviceBellHotspot = createHotspot(this, this.state.has('deskTaken') ? {
      x: 810, y: 1050, width: 120, height: 100,
    } : hotspots.serviceBell, () => this.ringBell(), { label: 'Service bell' });
    this.plantHotspot = createHotspot(this, this.state.has('deskTaken') ? {
      x: this.layout.happyPlant.x,
      y: this.layout.happyPlant.y - 90,
      width: 180,
      height: 210,
    } : hotspots.sadPlant, () => this.inspectPlant(), { label: this.state.has('deskTaken') ? 'Happy plant' : 'Sad plant' });
    createHotspot(this, hotspots.formStacks, () => this.inspectForms(), { label: 'Forms' });
    if (!this.state.has('deskTaken')) {
      this.penHotspot = createHotspot(this, hotspots.chainedPen, () => this.inspectPen(), { label: 'Chained pen' });
    }
    if (this.state.has('form12Presented') && !this.state.has('form12Submitted')) this.ensureForm12Hotspot();
    this.ensureRageStampHotspot();
    if (this.state.has('feralMode') && !this.state.has('hasMunicipalKey')) {
      this.keyHotspot = createHotspot(this, hotspots.key, () => this.inspectMunicipalKey(), { label: 'Municipal key' });
    }
    createHotspot(this, hotspots.exit, () => this.useOfficeExit(), { label: 'Office hallway' });
  }

  refreshExitPrompt() {
    if (this.exitPrompt) {
      this.exitPrompt.panel.destroy();
      this.exitPrompt.label.destroy();
      this.exitPrompt = null;
    }
    let text = null;
    let action = () => this.useOfficeExit();
    if (this.state.has('deskTaken') && this.state.has('stampRampageComplete')) {
      text = 'RETURN TO DUMPSTER';
      action = () => this.useOfficeExit();
    } else if (this.state.has('needsJurisdictionReview')) text = 'ATTEND HEARING';
    else if (this.state.has('sanitationOfficeUnlocked') && !this.state.has('sanitationComplete')) text = 'ENTER SANITATION OFFICE';
    else if (this.state.has('needsResidencyProof') && !this.state.has('hasLeaf')) text = 'RETURN TO ALLEY';
    if (text) this.exitPrompt = createSceneExit(this, text, action);
  }

  createForm12Prop() {
    if (this.form12) return this.form12;
    const item = SCENE_LAYOUTS.permitOffice.form12C;
    this.form12 = this.add.image(item.x, item.y, 'form12C')
      .setOrigin(0.5, 1)
      .setDisplaySize(item.displayWidth, item.displayHeight)
      .setDepth(item.depth);
    if (this.state.has('form12PartiallyEaten')) {
      this.form12
        .setDisplaySize(HALF_EATEN_FORM_WIDTH, item.displayHeight)
        .setX(this.form12.x - 120);
    }
    return this.form12;
  }

  ensureForm12Hotspot() {
    if (this.form12Hotspot || this.state.has('form12Submitted')) return;
    this.form12Hotspot = createHotspot(
      this,
      this.layout.hotspots.form12C,
      () => this.eatForm12(),
      { label: 'Form 12-C' },
    );
  }

  async withClerkDialogue(lines) {
    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, lines);
    this.clerk.setTexture('clerkIdle');
  }

  async speakToClerk() {
    if (this.busy) return;
    this.busy = true;

    if (this.state.has('hearingComplete') && !this.state.has('form12Presented')) {
      await this.receiveForm12C();
    } else if (this.state.has('feralMode')) {
      this.clerk.setTexture('clerkPanic');
      await showDialogue(this, [{
        speaker: 'Clerk',
        text: this.state.has('form12Submitted')
          ? 'The system has no field for what you just did.'
          : 'The form is on the counter.',
      }]);
    } else if (this.state.has('hasDollarThirteen') && !this.state.has('taxPaid')) {
      await this.payTax();
    } else if (this.state.has('hasLeaf') && this.state.has('needsResidencyProof') && !this.state.has('taxDebtKnown')) {
      await this.presentLeaf();
    } else if (this.state.has('needsResidencyProof')) {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'Proof of residency?' },
        { speaker: 'Jimothy', text: '…' },
        { speaker: 'Clerk', text: 'Something establishing that you reside at or immediately adjacent to Container 7-C.' },
      ]);
    } else if (this.state.has('needsJurisdictionReview')) {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'Your jurisdictional review is waiting.' },
        { speaker: 'Clerk', text: 'I would avoid describing the cone as “mobile.”' },
      ]);
    } else if (this.state.has('sanitationOfficeUnlocked') && !this.state.has('sanitationComplete')) {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'The sanitation department is through the hall.' },
        { speaker: 'Clerk', text: 'They pay exactly one dollar and thirteen cents.' },
      ]);
    } else if (!this.state.has('hasTicket033')) {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'Number?' },
        { speaker: 'Jimothy', text: '…' },
        { speaker: 'Clerk', text: 'Please take a number.' },
      ]);
      if (!this.state.has('clerkAskedForNumber')) {
        this.state.setFlag('clerkAskedForNumber');
        await this.hud.replaceCurrentObjective('TAKE A NUMBER');
      }
    } else if (!this.state.has('number033Called')) {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'Please wait until your number is called.' },
        { speaker: 'Jimothy', text: '…' },
        { speaker: 'Clerk', text: 'The bell is right there.' },
      ]);
    } else {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'Number thirty-three is already being served.' },
      ]);
    }

    this.busy = false;
  }

  async receiveForm12C() {
    this.clerk.setTexture('clerkGiantForm');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'Ah. Form 12-C.' },
      { speaker: 'Clerk', text: 'Locating the form and completing the form are distinct municipal events.' },
      { speaker: 'Clerk', text: 'It requires updated proof of residency, renewed refuse-handling certification, and a jurisdictional appeal.' },
      { speaker: 'Clerk', text: '—and naturally, a new Form 8-B.' },
    ]);
    this.state.setFlag('form12Presented');
    this.createForm12Prop();
    playSfx(this, 'formSwoosh');
    await showToast(this, 'RECEIVED: FORM 12-C — APPROXIMATELY 11.4 FEET');
    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'Sir, you’ll need to complete—' },
    ]);
    await showChoice(this, {
      speaker: 'Jimothy',
      text: 'Jimothy considers the complete administrative record.',
      choices: [{ label: '[HISS]', value: 'hiss' }],
    });

    this.jimothy.setTexture('jimothyVestInteriorHiss').setFlipX(false);
    this.clerk.setTexture('clerkPanic');
    await showDialogue(this, [{ speaker: 'Jimothy', text: 'HHHHSSSSSSSSS.' }]);
    this.state.setFlag('vestEquipped', false);
    this.jimothy
      .setTexture('jimothyInteriorWalk1')
      .setScale(this.layout.jimothy.scaleX, this.layout.jimothy.scaleY)
      .setData('idleKey', 'jimothyInteriorWalk1')
      .setData('vest', false);
    await this.hud.enterFeralMode();
    this.setFeralPose();
    getAudio(this).startRage();
    await showToast(this, 'NEW MECHANIC UNLOCKED: RACCOON');
    this.ensureForm12Hotspot();
    this.refreshExitPrompt();
  }

  async eatForm12() {
    if (this.busy || !this.state.has('feralMode') || this.state.has('form12Submitted')) return;
    this.busy = true;
    const form = this.createForm12Prop();
    this.jimothy.setTexture('jimothyEat').setScale(1.05).setFlipX(false);
    const firstBite = !this.state.has('form12PartiallyEaten');
    playSfx(this, 'eatForm', { volume: 0.30 });
    playSfx(this, 'cronchGrape', { volume: 0.27, rate: firstBite ? 1.08 : 0.92 });

    if (firstBite) {
      const halfEatenScaleX = form.scaleX * (HALF_EATEN_FORM_WIDTH / form.displayWidth);
      await new Promise((resolve) => this.tweens.add({
        targets: form,
        scaleX: halfEatenScaleX,
        x: form.x - 120,
        duration: 520,
        ease: 'Back.easeIn',
        onComplete: resolve,
      }));
      this.state.setFlag('form12PartiallyEaten');
      this.setFeralPose();
      await this.hud.replaceCurrentObjective('FINISH FORM 12-C');
      await showDialogue(this, [
        { speaker: 'Clerk', text: 'Partial submission.' },
      ]);
      this.refreshExitPrompt();
      this.busy = false;
      return;
    }

    await new Promise((resolve) => this.tweens.add({
      targets: form,
      alpha: 0,
      scaleX: 0,
      duration: 480,
      ease: 'Back.easeIn',
      onComplete: resolve,
    }));
    form.destroy();
    this.form12 = null;
    this.form12Hotspot?.destroy();
    this.form12Hotspot = null;
    this.state.setFlag('form12Submitted');
    this.setFeralPose();
    await showDialogue(this, [
      { speaker: 'Clerk', text: '…complete submission.' },
    ]);
    await showToast(this, 'FORM 12-C: SUBMITTED');
    await this.hud.replaceCurrentObjective('TAKE PEN');
    this.refreshExitPrompt();
    this.busy = false;
  }

  async takeNumber() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('hasTicket033')) {
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'Ticket 033.' },
        { speaker: 'Jimothy', text: 'A small document granting the right to continue waiting.' },
      ]);
      this.busy = false;
      return;
    }

    await showDialogue(this, [
      { speaker: 'Ticket machine', text: 'CHK.' },
    ]);
    this.state.setFlag('hasTicket033');
    await showToast(this, 'RECEIVED TICKET 033');
    if (this.state.data.currentObjective === 'TAKE A NUMBER') {
      await this.hud.replaceCurrentObjective('OBTAIN DUMPSTER ACCESS PERMIT');
    }
    this.busy = false;
  }

  async inspectTicketScreen() {
    if (this.busy) return;
    this.busy = true;
    const lines = ['007.', 'Still 007.', 'Time has ceased to have meaning.'];
    const text = this.state.has('number033Called')
      ? '033. Twenty-five applicants have vanished from the administrative record.'
      : lines[Math.min(this.screenInspections, lines.length - 1)];
    this.screenInspections += 1;
    await showDialogue(this, [{ speaker: 'Jimothy', text }]);
    this.busy = false;
  }

  async ringBell() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [{ speaker: 'Service bell', text: 'DING.', sound: 'bell' }]);

    if (this.state.has('feralMode')
      && this.state.has('deskTaken')
      && !this.state.has('stampRampageComplete')) {
      await showDialogue(this, [
        { speaker: 'Clerk', text: 'Please stop summoning me. I am already witnessing this.' },
      ]);
      this.ensureRageStampHotspot();
      this.stamp?.setDepth(DEPTH.effect + 1);
      if (this.state.data.currentObjective !== 'TAKE STAMP') {
        await this.hud.replaceCurrentObjective('TAKE STAMP');
      }
      this.busy = false;
      return;
    }

    if (!this.state.has('hasTicket033')) {
      await this.withClerkDialogue([
        { speaker: 'Clerk', text: 'Please take a number before summoning the government.' },
      ]);
      if (!this.state.has('clerkAskedForNumber')) {
        this.state.setFlag('clerkAskedForNumber');
        await this.hud.replaceCurrentObjective('TAKE A NUMBER');
      }
      this.busy = false;
      return;
    }

    if (this.state.has('number033Called')) {
      await this.withClerkDialogue([{ speaker: 'Clerk', text: 'Once was sufficient.' }]);
      this.busy = false;
      return;
    }

    this.state.setFlag('number033Called');
    this.ticketNumber.setText('033');
    await this.withClerkDialogue([{ speaker: 'Clerk', text: 'Number thirty-three.' }]);
    await this.runFormIntake();
    this.busy = false;
  }

  async runFormIntake() {
    let purposeResolved = false;
    while (!purposeResolved) {
      this.clerk.setTexture('clerkTalk');
      const purpose = await showChoice(this, {
        speaker: 'Clerk',
        text: 'Purpose of visit?',
        choices: [
          { label: 'DUMPSTER', value: 'dumpster' },
          { label: 'RACCOON', value: 'raccoon' },
          { label: 'SLOWLY TAKE PEN', value: 'pen' },
          { label: 'PRRT?', value: 'trill' },
        ],
      });

      if (purpose === 'dumpster') {
        await showDialogue(this, [
          { speaker: 'Jimothy', text: 'Dumpster access.' },
          { speaker: 'Clerk', text: 'Form 8-B.' },
        ]);
        purposeResolved = true;
      } else if (purpose === 'raccoon') {
        await showDialogue(this, [
          { speaker: 'Clerk', text: 'That is your species.' },
          { speaker: 'Jimothy', text: 'Raccoon.' },
          { speaker: 'Clerk', text: 'Yes. Purpose of visit?' },
        ]);
      } else if (purpose === 'pen') {
        await showDialogue(this, [
          { speaker: 'Jimothy', text: 'Jimothy reaches very slowly for the pen.' },
          { speaker: 'System', text: 'The clerk watches Jimothy, judgingly.' },
          { speaker: 'Chained pen', text: 'CLINK.', sound: 'penChain' },
          { speaker: 'System', text: 'The pen cannot be removed.' },
          { speaker: 'Clerk', text: 'Purpose of visit?' },
        ]);
      } else {
        await showDialogue(this, [
          { speaker: 'Jimothy', text: 'Prrt?' },
          { speaker: 'Clerk', text: 'I’ll mark that as “refuse-related.”' },
        ]);
        purposeResolved = true;
      }
    }

    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'Dumpster access requires Form 8-B.' },
    ]);
    this.state.setFlag('hasForm8B');
    await showToast(this, 'RECEIVED FORM 8-B');

    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'I’ll also need proof of residency.' },
      { speaker: 'Clerk', text: 'Where do you currently reside?' },
    ]);
    const residence = await showChoice(this, {
      speaker: 'Jimothy',
      text: 'Jimothy considers the legal definition of home.',
      choices: [
        { label: 'DUMPSTER', value: 'dumpster' },
        { label: 'RACCOON', value: 'raccoon' },
        { label: 'POINT OUTSIDE', value: 'outside' },
        { label: 'TAKE PEN NOW', value: 'pen' },
      ],
    });

    const responses = {
      dumpster: 'Container 7-C is not, by itself, a complete address.',
      raccoon: 'Species is not residency.',
      outside: 'The clerk looks outside. Outside remains legally inconclusive.',
      pen: 'The clerk watches Jimothy, judgingly.',
    };
    const residenceResponse = residence === 'pen' ? [
      { speaker: 'System', text: responses.pen },
      { speaker: 'Chained pen', text: 'CLINK.', sound: 'penChain' },
      { speaker: 'System', text: 'The pen cannot be removed.' },
    ] : [{ speaker: 'Clerk', text: responses[residence] }];
    await showDialogue(this, [
      ...residenceResponse,
      { speaker: 'Clerk', text: 'Bring me something establishing that you reside at or immediately adjacent to Container 7-C.' },
    ]);
    this.clerk.setTexture('clerkIdle');
    this.state.setFlag('needsResidencyProof');
    await this.hud.replaceCurrentObjective('ESTABLISH LEGAL RESIDENCY');
    this.refreshExitPrompt();
  }

  async presentLeaf() {
    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [{ speaker: 'Clerk', text: 'This is a leaf.' }]);
    const answer = await showChoice(this, {
      speaker: 'Jimothy',
      text: 'The leaf waits to be administratively filed.',
      choices: [
        { label: 'YES', value: 'yes' },
        { label: 'RACCOON', value: 'raccoon' },
        { label: 'IT WAS OUTSIDE MY HOUSE', value: 'house' },
        { label: 'PRRT?', value: 'trill' },
      ],
    });
    const responses = {
      yes: 'I appreciate the confirmation.',
      raccoon: 'I am beginning to understand that this may be your answer to several unrelated questions.',
      house: 'Hm.',
      trill: 'That does not improve the leaf.',
    };
    await showDialogue(this, [
      { speaker: 'Clerk', text: responses[answer] },
      { speaker: 'Clerk', text: 'However… a naturally occurring site-adjacent artifact can be notarized as provisional residency evidence.' },
      { speaker: 'Clerk', text: 'Under Section 4.' },
    ]);
    this.clerk.setTexture('clerkPaperwork');
    this.state.setFlag('hasNotarizedLeaf');
    this.state.setFlag('needsResidencyProof', false);
    await showToast(this, 'CASE FILE UPDATED: NOTARIZED LEAF');
    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'Current resident… Behind Container 7-C.' },
      { speaker: 'Clerk', text: 'Oh.' },
      { speaker: 'Clerk', text: 'That dumpster is zoned commercial.' },
      { speaker: 'Clerk', text: 'You have an outstanding commercial property-tax liability.' },
    ]);
    this.state.setFlag('taxDebtKnown');
    await showToast(this, 'BALANCE DUE: $1.13');
    await this.hud.replaceCurrentObjective('RESOLVE OUTSTANDING COMMERCIAL PROPERTY-TAX LIABILITY');

    const payment = await showChoice(this, {
      speaker: 'Jimothy',
      text: 'Jimothy reviews his liquid assets.',
      choices: [
        { label: 'RACCOON', value: 'raccoon' },
        { label: 'OFFER BOTTLECAP', value: 'bottlecap' },
        { label: 'SLOWLY TAKE PEN', value: 'pen' },
        { label: 'DECLARE BANKRUPTCY', value: 'bankruptcy' },
      ],
    });
    const paymentResponses = {
      raccoon: 'The city does not currently accept species as currency.',
      bottlecap: 'Unfortunately, bottlecap liquidity is currently poor.',
      pen: 'That is city property.',
      bankruptcy: 'You have no recognized assets to restructure. Congratulations?',
    };
    await showDialogue(this, [
      { speaker: 'Clerk', text: paymentResponses[payment] },
      { speaker: 'Clerk', text: 'The sanitation department has temporary municipal openings.' },
      { speaker: 'Clerk', text: 'They pay exactly enough to resolve this.' },
    ]);
    this.clerk.setTexture('clerkIdle');
    this.state.setFlag('sanitationOfficeUnlocked');
    await this.hud.replaceCurrentObjective('COMPLETE MUNICIPAL SANITATION ORIENTATION');
    this.refreshExitPrompt();
  }

  async payTax() {
    this.clerk.setTexture('clerkTalk');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'You found employment.' },
      { speaker: 'Jimothy', text: '…' },
      { speaker: 'Clerk', text: 'Congratulations.' },
    ]);
    this.state.setFlag('taxPaid');
    await showToast(this, 'PAID: $1.13');
    this.clerk.setTexture('clerkPaperwork');
    await showDialogue(this, [
      { speaker: 'Clerk', text: 'Residency verified.' },
      { speaker: 'Clerk', text: 'Commercial property-tax liability resolved.' },
      { speaker: 'Clerk', text: 'Responsible refuse handling certified.' },
      { speaker: 'Clerk', text: 'One moment.' },
      { speaker: 'Clerk', text: 'Container 7-C sits directly on a jurisdictional boundary.' },
      { speaker: 'Clerk', text: 'That is inconvenient.' },
      { speaker: 'Clerk', text: 'Due to jurisdictional complications, you must take the matter of grape ownership to the hearing board.' },
    ]);
    this.clerk.setTexture('clerkIdle');
    this.state.setFlag('needsJurisdictionReview');
    await this.hud.replaceCurrentObjective('ATTEND JURISDICTIONAL REVIEW');
    this.refreshExitPrompt();
  }

  async useOfficeExit() {
    if (this.busy) return;
    if (this.state.has('deskTaken')) {
      if (!this.state.has('stampRampageComplete')) {
        this.busy = true;
        await showDialogue(this, [{ speaker: 'Jimothy', text: 'Municipal authority remains insufficiently distributed.' }]);
        await this.hud.replaceCurrentObjective('TAKE STAMP');
        this.busy = false;
        return;
      }
      this.busy = true;
      fadeToScene(this, 'Alley', { fromFeralOffice: true });
      return;
    }
    if (this.state.has('needsJurisdictionReview')) {
      this.busy = true;
      fadeToScene(this, 'HearingRoom');
      return;
    }
    if (this.state.has('sanitationOfficeUnlocked') && !this.state.has('sanitationComplete')) {
      this.busy = true;
      fadeToScene(this, 'SanitationOffice');
      return;
    }
    if (this.state.has('needsResidencyProof') && !this.state.has('hasLeaf')) {
      this.busy = true;
      fadeToScene(this, 'Alley');
      return;
    }
    await showDialogue(this, [{ speaker: 'Jimothy', text: 'The hallway is not currently relevant to grape.' }]);
  }

  async inspectPlant() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('deskTaken')) {
      await showDialogue(this, [{ speaker: 'Happy plant', text: 'YES! ANARCHY!!!' }]);
      this.busy = false;
      return;
    }
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'The plant is sad.' },
      { speaker: 'Plant', text: 'The plant mumbles something about declaring anarchy.' },
      { speaker: 'Jimothy', text: 'Its demands appear to be mostly sunlight-related.' },
    ]);
    this.busy = false;
  }

  async inspectForms() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'Forms.' },
      { speaker: 'Jimothy', text: 'Forms relating to other forms.' },
      { speaker: 'Jimothy', text: 'Do not disturb their nesting habitat.' },
    ]);
    this.busy = false;
  }

  async inspectPen() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('feralMode') && this.state.has('form12Submitted')) {
      if (this.state.has('deskTaken')) {
        await showDialogue(this, [
          { speaker: 'Jimothy', text: 'The pen and desk have entered raccoon custody.' },
        ]);
        this.busy = false;
        return;
      }
      await showDialogue(this, [
        { speaker: 'Chained pen', text: 'CLINK.', sound: 'penChain' },
        { speaker: 'Jimothy', text: 'The pen cannot be removed from the desk.' },
      ]);
      await showChoice(this, {
        speaker: 'Jimothy',
        text: 'A new administrative remedy becomes available.',
        choices: [{ label: 'TAKE DESK', value: 'desk', feral: true }],
      });
      this.setFeralPose();
      const takeTargets = [this.counter, this.chainedPen, this.ticketMachine].filter(Boolean);
      const spill = (target, x, y, angle) => new Promise((resolve) => this.tweens.add({
        targets: target,
        x,
        y,
        angle,
        duration: 620,
        ease: 'Bounce.easeOut',
        onComplete: resolve,
      }));
      const disappear = takeTargets.length ? new Promise((resolve) => this.tweens.add({
        targets: takeTargets,
        x: this.jimothy.x - 80,
        y: this.jimothy.y,
        scaleX: 0.08,
        scaleY: 0.08,
        alpha: 0,
        duration: 620,
        ease: 'Back.easeIn',
        onComplete: resolve,
      })) : Promise.resolve();
      playSfx(this, 'deskCrash');
      await Promise.all([
        disappear,
        spill(this.counterFormStack, 460, 1070, -72),
        spill(this.serviceBell, 810, 1090, 82),
        this.stamp ? spill(this.stamp, 590, 1085, 90) : Promise.resolve(),
        spill(this.plant, this.layout.happyPlant.x, this.layout.happyPlant.y, 0),
      ]);
      takeTargets.forEach((target) => target.destroy());
      this.counter = null;
      this.chainedPen = null;
      this.ticketMachine = null;
      this.penHotspot?.destroy();
      this.ticketMachineHotspot?.destroy();
      this.penHotspot = null;
      this.ticketMachineHotspot = null;
      this.serviceBellHotspot?.setPosition(810, 1050);
      this.stampHotspot?.destroy();
      this.stampHotspot = null;
      this.plantHotspot?.setPosition(this.layout.happyPlant.x, this.layout.happyPlant.y - 90);
      this.cameras.main.shake(180, 0.004);
      this.state.setFlag('deskTaken');
      this.ensureRageStampHotspot();
      this.stampMarks
        .filter((mark) => mark.getData('stampTarget') === 'desk')
        .forEach((mark) => mark.destroy());
      const plantStamp = this.stampMarks.find((mark) => mark.getData('stampTarget') === 'plant');
      if (plantStamp) plantStamp.setPosition(this.layout.happyPlant.x, this.layout.happyPlant.y - 105);
      this.plant
        .setTexture('happyPlant')
        .setPosition(this.layout.happyPlant.x, this.layout.happyPlant.y)
        .setDisplaySize(this.layout.happyPlant.displayWidth, this.layout.happyPlant.displayHeight);
      this.clerk.setTexture('clerkPanic');
      await showDialogue(this, [
        { speaker: 'Clerk', text: 'My desk!!' },
      ]);
      await showToast(this, 'DESK RECEIVED');
      await this.hud.replaceCurrentObjective(
        this.state.has('stampRampageComplete') ? 'RETURN TO DUMPSTER' : 'TAKE STAMP',
      );
      this.refreshExitPrompt();
      this.busy = false;
      return;
    }
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'Jimothy reaches for the pen.' },
      { speaker: 'Chained pen', text: 'CLINK.', sound: 'penChain' },
      { speaker: 'Jimothy', text: 'PROPERTY OF MUNICIPAL SERVICES.' },
      { speaker: 'Jimothy', text: 'The pen is more securely housed than Jimothy.' },
    ]);
    this.busy = false;
  }

  setFeralPose() {
    this.rageJitter?.remove();
    if (this.rageRestingPoint) {
      this.jimothy.setPosition(this.rageRestingPoint.x, this.rageRestingPoint.y);
    }
    this.jimothy
      .setTexture('jimothyFeralInteriorInteract')
      .setScale(this.layout.jimothy.scaleX, this.layout.jimothy.scaleY)
      .setFlipX(false)
      .setData('idleKey', 'jimothyFeralInteriorInteract')
      .setData('vest', false);
    const restingX = this.jimothy.x;
    const restingY = this.jimothy.y;
    this.rageRestingPoint = { x: restingX, y: restingY };
    this.rageJitter = this.tweens.add({
      targets: this.jimothy,
      x: { from: restingX - 1.5, to: restingX + 1.5 },
      y: { from: restingY - 0.75, to: restingY + 0.75 },
      duration: 105,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  ensureRageStampHotspot() {
    if (this.stampHotspot
      || !this.state.has('feralMode')
      || this.state.has('hasMunicipalStamp')) return;
    const hotspot = this.layout.hotspots.stamp;
    const bounds = this.state.has('deskTaken')
      ? { x: 590, y: 1045, width: 230, height: 220 }
      : { ...hotspot, y: 650, width: 175, height: 190 };
    this.stampHotspot = createHotspot(
      this,
      bounds,
      () => this.inspectStamp(),
      { label: 'Municipal stamp' },
    );
  }

  createStampMark(mark, animate = false) {
    const texture = this.textures.get(mark.key).getSourceImage();
    const image = this.add.image(mark.x, mark.y, mark.key)
      .setDisplaySize(mark.width, mark.width * (texture.height / texture.width))
      .setAngle(mark.angle)
      .setDepth(DEPTH.effect)
      .setData('stampTarget', mark.target);
    if (mark.yScale) image.setScale(image.scaleX, image.scaleY * mark.yScale);
    if (animate) image.setScale(image.scaleX * 2.1, image.scaleY * 2.1).setAlpha(0);
    this.stampMarks.push(image);
    return image;
  }

  getStampRampageMarks() {
    return STAMP_RAMPAGE.map((mark) => {
      if (mark.target === 'plant' && this.state.has('deskTaken')) {
        return { ...mark, x: this.layout.happyPlant.x, y: this.layout.happyPlant.y - 105 };
      }
      if (mark.target === 'desk' && this.state.has('deskTaken')) {
        if (this.state.has('stampRampageBeforeDesk')) return null;
        return { ...mark, x: 960, y: 1010, width: 205, angle: -6, yScale: 0.68, target: 'floor' };
      }
      return mark;
    }).filter(Boolean);
  }

  restoreStampRampage() {
    this.getStampRampageMarks().forEach((mark) => this.createStampMark(mark));
  }

  async stampEverything() {
    this.state.setFlag('stampRampageBeforeDesk', !this.state.has('deskTaken'));
    await showChoice(this, {
      speaker: 'Jimothy',
      text: 'Municipal authority requires broad and immediate application.',
      choices: [{ label: 'STAMP EVERYTHING', value: 'stamp', feral: true }],
    });
    for (const mark of this.getStampRampageMarks()) {
      playSfx(this, this.stampMarks.length % 2 === 0 ? 'stamp1' : 'stamp2');
      const impression = this.createStampMark(mark, true);
      const impactText = this.add.text(mark.x, mark.y - 70, 'THUNK', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '32px',
        color: '#6f2722',
        stroke: '#f1e4c7',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(DEPTH.effect + 1).setAngle(mark.angle);
      this.cameras.main.shake(70, 0.0025);
      await new Promise((resolve) => this.tweens.add({
        targets: impression,
        scaleX: impression.scaleX / 2.1,
        scaleY: impression.scaleY / 2.1,
        alpha: 0.92,
        duration: 125,
        ease: 'Back.easeOut',
        onComplete: resolve,
      }));
      this.tweens.add({
        targets: impactText,
        y: impactText.y - 35,
        alpha: 0,
        duration: 260,
        onComplete: () => impactText.destroy(),
      });
      await new Promise((resolve) => this.time.delayedCall(70, resolve));
    }
    this.state.setFlag('stampRampageComplete');
  }

  async inspectStamp() {
    if (this.busy) return;
    this.busy = true;
    if (!this.state.has('feralMode')) {
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'A municipal authority stamp.' },
        { speaker: 'Jimothy', text: 'Authority appears to be mostly handle.' },
      ]);
      this.busy = false;
      return;
    }
    this.setFeralPose();
    this.state.setFlag('hasMunicipalStamp');
    this.stamp?.destroy();
    this.stampHotspot?.destroy();
    this.stamp = null;
    this.stampHotspot = null;
    await showToast(this, 'ACQUIRED: MUNICIPAL AUTHORITY STAMP');
    await showDialogue(this, [{ speaker: 'Clerk', text: 'That does not make you a municipal authority.' }]);
    await this.stampEverything();
    await showDialogue(this, [{ speaker: 'Clerk', text: 'Authority recognized.' }]);
    if (this.state.has('deskTaken')) {
      await this.hud.replaceCurrentObjective('RETURN TO DUMPSTER');
      this.refreshExitPrompt();
    }
    this.busy = false;
  }

  async inspectMunicipalKey() {
    if (this.busy) return;
    this.busy = true;
    if (!this.state.has('feralMode')) {
      await showDialogue(this, [
        { speaker: 'Jimothy', text: 'A municipal key.' },
        { speaker: 'Jimothy', text: 'Municipal.' },
      ]);
      this.busy = false;
      return;
    }
    this.setFeralPose();
    this.state.setFlag('hasMunicipalKey');
    this.municipalKey?.destroy();
    this.keyHotspot?.destroy();
    this.municipalKey = null;
    this.keyHotspot = null;
    await showToast(this, 'ACQUIRED: MUNICIPAL KEY — MUNICIPAL.');
    this.busy = false;
  }
}
