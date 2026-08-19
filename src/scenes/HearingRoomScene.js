import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { SCENE_LAYOUTS } from '../config/sceneLayouts.js';
import { GameState } from '../state/GameState.js';
import { autoWaddle, createJimothy } from '../systems/Jimothy.js';
import {
  createHotspot,
  createObjectiveHud,
  createSceneExit,
  fadeToScene,
  showChoice,
  showDialogue,
  showToast,
} from '../systems/ui.js';

export class HearingRoomScene extends Phaser.Scene {
  constructor() { super('HearingRoom'); }

  async create() {
    const layout = SCENE_LAYOUTS.hearingRoom;
    this.layout = layout;
    this.busy = true;
    this.exitPrompt = null;
    this.state = new GameState(this.registry);
    this.add.image(0, 0, layout.background).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background);

    const addPlaced = (texture, item) => this.add.image(item.x, item.y, texture)
      .setOrigin(0.5, 1)
      .setDisplaySize(item.displayWidth, item.displayHeight)
      .setDepth(item.depth);

    this.crow = this.add.sprite(layout.crow.x, layout.crow.y, 'crowIdle')
      .setOrigin(0.5, 1)
      .setDisplaySize(layout.crow.displayWidth, layout.crow.displayHeight)
      .setDepth(layout.crow.depth);
    addPlaced('squirrelIdle', layout.squirrel);
    addPlaced('pigeonIdle', layout.pigeon);
    addPlaced('chainedPen', layout.pen);
    addPlaced('formStack', layout.formStack);
    addPlaced('leaf', layout.leaf);
    addPlaced('fileStack', layout.fileStack);
    addPlaced('tinfoilBall', layout.tinfoil);
    addPlaced('hugeFormStack', layout.hugeForms);
    addPlaced('crumpledReceipt', layout.receiptLarge);
    addPlaced('dracaena', layout.dracaena);
    addPlaced('crumpledReceipt', layout.receiptDesk);
    addPlaced('municipalStamp', layout.stamp);

    this.jimothy = createJimothy(this, layout.jimothy.spawn, {
      interior: true,
      vest: true,
      scaleX: layout.jimothy.scaleX,
      scaleY: layout.jimothy.scaleY,
      idleKey: 'jimothyVestInteriorWalk1',
    });
    this.hud = createObjectiveHud(this, this.state);
    await autoWaddle(this, this.jimothy, layout.jimothy.settle, { speed: 760 });
    createHotspot(this, layout.hotspots.tribunal, () => this.beginHearing(), { label: 'Municipal tribunal' });
    createHotspot(this, layout.hotspots.jimothy, () => this.inspectApplicant(), { label: 'Jimothy, applicant' });
    createHotspot(this, layout.hotspots.pen, () => this.inspectPen(), { label: 'Chained pen' });
    if (this.state.has('hearingComplete')) this.showReturnPrompt();
    this.busy = false;
  }

  setCrowTexture(texture) {
    this.crow.setTexture(texture).setDisplaySize(
      this.layout.crow.displayWidth,
      this.layout.crow.displayHeight,
    );
  }

  async inspectApplicant() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'Municipal safety vest.' },
      { speaker: 'Jimothy', text: 'Still the exact same raccoon.' },
    ]);
    this.busy = false;
  }

  async inspectPen() {
    if (this.busy) return;
    this.busy = true;
    await showDialogue(this, [
      { speaker: 'Jimothy', text: 'Another. Chained. Pen.' },
      { speaker: 'Jimothy', text: 'Jimothy is beginning to suspect this goes all the way to the top.' },
    ]);
    this.busy = false;
  }

  showReturnPrompt() {
    if (this.exitPrompt) return;
    this.exitPrompt = createSceneExit(this, 'RETURN TO PERMIT OFFICE', () => {
      if (this.busy) return;
      this.busy = true;
      fadeToScene(this, 'PermitOffice');
    });
  }

  async beginHearing() {
    if (this.busy) return;
    this.busy = true;
    if (this.state.has('hearingComplete')) {
      await showDialogue(this, [{ speaker: 'Crow', text: 'The denial remains extremely filed.' }]);
      this.busy = false;
      return;
    }

    this.setCrowTexture('crowTalk');
    await showDialogue(this, [
      { speaker: 'Crow', text: 'Municipal Services Hearing Room, case 7-C.' },
      { speaker: 'Crow', text: 'Jimothy versus one grape, ownership pending.' },
      { speaker: 'Squirrel', text: 'The applicant has submitted Form 8-B, a notarized leaf, sanitation certification, and one dollar and thirteen cents.' },
      { speaker: 'Pigeon', text: 'The leaf is upside down.' },
      { speaker: 'Squirrel', text: 'It is a leaf.' },
    ]);

    const oath = await showChoice(this, {
      speaker: 'Crow',
      text: 'Do you swear that all information contained in this application is true and complete?',
      choices: [
        { label: 'YES', value: 'yes' },
        { label: 'NO', value: 'no' },
        { label: 'RACCOON', value: 'raccoon' },
        { label: 'PRRT?', value: 'trill' },
      ],
    });
    const oathResponses = {
      yes: 'The record will reflect “yes.”',
      no: 'The record will reflect unusual candor.',
      raccoon: 'The record will reflect “raccoon.”',
      trill: 'The record will reflect a small questioning trill.',
    };
    await showDialogue(this, [{ speaker: 'Crow', text: oathResponses[oath] }]);

    await showDialogue(this, [
      { speaker: 'Crow', text: 'Container 7-C rests directly on a municipal jurisdictional boundary.' },
      { speaker: 'Pigeon', text: 'The boundary is marked by a traffic cone.' },
    ]);
    if (this.state.has('coneMovedEarly')) {
      await showDialogue(this, [
        { speaker: 'Squirrel', text: 'Records indicate six inches west.' },
        { speaker: 'Pigeon', text: 'That is practically another government.' },
      ]);
    } else {
      await showDialogue(this, [
        { speaker: 'Squirrel', text: 'A traffic cone is not a survey monument.' },
        { speaker: 'Pigeon', text: 'It is orange.' },
      ]);
    }
    const cone = await showChoice(this, {
      speaker: 'Crow',
      text: 'Has the applicant altered the position of THE CONE?',
      choices: [
        { label: 'NO', value: 'no' },
        { label: 'SIX INCHES', value: 'six' },
        { label: 'RACCOON', value: 'raccoon' },
        { label: 'DEFINE “POSITION”', value: 'define' },
      ],
    });
    const coneResponses = {
      no: 'No cone incident is presently attached to this docket.',
      six: 'Six inches is apparently enough to require three districts.',
      raccoon: 'The cone is not a raccoon.',
      define: 'The tribunal begins defining “position.”',
    };
    await showDialogue(this, [{ speaker: 'Crow', text: coneResponses[cone] }]);

    // The cone incident is inevitable. If Jimothy did not move it in the alley,
    // municipal activity moves it during the hearing instead. Either way, the
    // Crow discovers it after the response and reacts before returning to idle.
    if (!this.state.has('coneMovedEarly')) {
      this.state.setFlag('coneMovedByCity');
      await showDialogue(this, [
        { speaker: 'Pigeon', text: 'The cone has moved during the hearing.' },
      ]);
    }
    this.setCrowTexture('crowPanic');
    await showDialogue(this, this.state.has('coneMovedEarly') ? [
      { speaker: 'Crow', text: 'THE CONE WAS MOVED?' },
      { speaker: 'Crow', text: 'SIX INCHES?' },
      { speaker: 'Crow', text: 'THE CONE CANNOT SIMPLY CHANGE JURISDICTIONS.' },
    ] : [
        { speaker: 'Crow', text: 'THE CONE WAS MOVED?' },
        { speaker: 'Crow', text: 'WHO MOVED THE CONE?' },
        { speaker: 'Squirrel', text: 'No responsible party is currently on the record.' },
    ]);
    this.setCrowTexture('crowIdle');

    if (this.state.has('coneMovedEarly') || this.state.has('coneMovedByCity')) {
      await showDialogue(this, [{
        speaker: 'Crow',
        text: 'You are receiving a sanction for violating BS 0736.02, subsection C — Unauthorized Changing of Jurisdictional Boundaries. Please come back for your hearing date on November 23, 2088.',
      }]);
    }

    this.setCrowTexture(this.state.has('coneMovedEarly') ? 'crowPanic' : 'crowIdle');
    await showDialogue(this, [
      { speaker: 'Crow', text: 'This tribunal finds that the applicant completed every requirement presented.' },
      { speaker: 'Crow', text: 'The Dumpster Access Permit is therefore—' },
      { speaker: 'Pigeon', text: 'Form 12-C is missing.' },
      { speaker: 'Crow', text: 'Of course it is.' },
      { speaker: 'Crow', text: 'DENIED.' },
    ]);
    this.state.setFlag('hearingComplete');
    this.state.setFlag('needsJurisdictionReview', false);
    await showToast(this, 'RULING: DENIED — FORM 12-C REQUIRED');
    await this.hud.replaceCurrentObjective('OBTAIN FORM 12-C');
    this.setCrowTexture('crowIdle');
    this.busy = false;
    this.showReturnPrompt();
  }
}
