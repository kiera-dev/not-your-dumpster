import { INITIAL_STATE } from '../config/gameConfig.js';

const cloneInitialState = () => ({
  ...INITIAL_STATE,
  flags: { ...INITIAL_STATE.flags },
});

export class GameState {
  constructor(registry) {
    this.registry = registry;
    if (!registry.has('gameState')) registry.set('gameState', cloneInitialState());
  }

  get data() { return this.registry.get('gameState'); }
  has(flag) { return Boolean(this.data.flags[flag]); }

  setFlag(flag, value = true) {
    this.registry.set('gameState', {
      ...this.data,
      flags: { ...this.data.flags, [flag]: value },
    });
  }

  setCurrentObjective(currentObjective) {
    this.registry.set('gameState', { ...this.data, currentObjective });
  }

  setPersonalObjective(personalObjective) {
    this.registry.set('gameState', { ...this.data, personalObjective });
  }

  reset() {
    this.registry.set('gameState', cloneInitialState());
  }
}
