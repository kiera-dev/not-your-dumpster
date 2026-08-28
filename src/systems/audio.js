import { DEPTH, GAME_WIDTH } from '../config/gameConfig.js';

const STORAGE_KEY = 'not-your-dumpster-muted';
const MASTER_VOLUME = 0.78;

const AMBIENCE = Object.freeze({
  alley: { key: 'alleyAmbience', volume: 0.22, overlapMs: 1800 },
  interior: { key: 'officeAmbience', volume: 0.20, overlapMs: 2200 },
});

const SFX_VOLUMES = Object.freeze({
  bell: 0.42,
  coneKick: 0.62,
  coneMove: 0.38,
  deskCrash: 0.52,
  dumpsterDive: 0.42,
  dumpsterOpen: 0.48,
  eatForm: 0.46,
  formSwoosh: 0.40,
  inventoryUpdated: 0.34,
  penChain: 0.44,
  rageSting: 0.66,
  stamp1: 0.50,
  stamp2: 0.50,
  uiClick: 0.20,
  vestEquip: 0.40,
});

function readMutedPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveMutedPreference(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // Audio still works when storage is unavailable (for example, strict privacy mode).
  }
}

class AudioDirector {
  constructor(scene) {
    this.game = scene.game;
    this.sound = scene.sound;
    this.loops = new Map();
    this.rageActive = false;
    this.rageStartTimer = null;
    this.desiredAmbience = null;
    this.sound.volume = MASTER_VOLUME;
    this.sound.mute = readMutedPreference();

    this.sound.once('unlocked', () => this.resumeDesiredAudio());
  }

  isMuted() {
    return this.sound.mute;
  }

  setMuted(muted) {
    this.sound.mute = muted;
    saveMutedPreference(muted);
  }

  toggleMuted() {
    this.setMuted(!this.isMuted());
    return this.isMuted();
  }

  playSfx(key, options = {}) {
    if (!this.game.cache.audio.exists(key)) return null;
    const volume = options.volume ?? SFX_VOLUMES[key] ?? 0.4;
    const sound = this.sound.add(key, { volume, ...options });
    sound.once('complete', () => sound.destroy());
    if (!sound.play()) sound.destroy();
    return sound;
  }

  fadeSound(sound, toVolume, duration = 500, destroyAfter = false) {
    if (!sound?.isPlaying) {
      if (destroyAfter) sound?.destroy();
      return;
    }
    const fromVolume = sound.volume;
    const startedAt = performance.now();
    const update = () => {
      if (!sound.isPlaying) {
        this.game.events.off('step', update);
        if (destroyAfter) sound.destroy();
        return;
      }
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      sound.setVolume(fromVolume + ((toVolume - fromVolume) * progress));
      if (progress >= 1) {
        this.game.events.off('step', update);
        if (destroyAfter) {
          sound.stop();
          sound.destroy();
        }
      }
    };
    this.game.events.on('step', update);
  }

  startCrossfadeLoop(name, key, { volume, overlapMs }) {
    this.stopLoop(name, 650);
    const loop = {
      active: true,
      key,
      volume,
      overlapMs,
      sounds: new Set(),
      timer: null,
    };
    this.loops.set(name, loop);

    const launch = () => {
      if (!loop.active || this.sound.locked) return;
      const next = this.sound.add(key, { volume: 0 });
      loop.sounds.add(next);
      next.once('complete', () => {
        loop.sounds.delete(next);
        next.destroy();
      });
      if (!next.play()) {
        loop.sounds.delete(next);
        next.destroy();
        return;
      }
      this.fadeSound(next, volume, Math.min(900, overlapMs));
      const nextLaunchMs = Math.max(1000, (next.duration * 1000) - overlapMs);
      loop.timer = window.setTimeout(launch, nextLaunchMs);
    };
    loop.launch = launch;
    launch();
  }

  stopLoop(name, fadeMs = 600) {
    const loop = this.loops.get(name);
    if (!loop) return;
    loop.active = false;
    window.clearTimeout(loop.timer);
    loop.sounds.forEach((sound) => {
      if (fadeMs > 0) this.fadeSound(sound, 0, fadeMs, true);
      else {
        sound.stop();
        sound.destroy();
      }
    });
    loop.sounds.clear();
    this.loops.delete(name);
  }

  setLocation(location) {
    const ambience = AMBIENCE[location];
    this.desiredAmbience = ambience ? location : null;
    if (this.rageActive) return;
    const currentLoop = this.loops.get('ambience');
    if (ambience) {
      if (currentLoop?.key !== ambience.key) {
        this.startCrossfadeLoop('ambience', ambience.key, ambience);
      }
    } else {
      this.stopLoop('ambience', 650);
    }
  }

  startRage() {
    if (this.rageActive) return;
    this.rageActive = true;
    this.stopLoop('ambience', 450);
    this.playSfx('rageSting');
    window.clearTimeout(this.rageStartTimer);
    this.rageStartTimer = window.setTimeout(() => {
      if (!this.rageActive) return;
      this.startCrossfadeLoop('rageMusic', 'rageMusic', {
        volume: 0.26,
        overlapMs: 1800,
      });
    }, 3850);
  }

  stopRage() {
    this.rageActive = false;
    window.clearTimeout(this.rageStartTimer);
    this.rageStartTimer = null;
    this.stopLoop('rageMusic', 1100);
    if (this.desiredAmbience) {
      window.setTimeout(() => {
        if (!this.rageActive && this.desiredAmbience) this.setLocation(this.desiredAmbience);
      }, 750);
    }
  }

  resumeDesiredAudio() {
    this.loops.forEach((loop) => {
      if (loop.active && loop.sounds.size === 0) loop.launch();
    });
    if (this.rageActive && !this.loops.has('rageMusic') && !this.rageStartTimer) {
      this.startCrossfadeLoop('rageMusic', 'rageMusic', { volume: 0.26, overlapMs: 1800 });
    } else if (!this.rageActive && this.desiredAmbience && !this.loops.has('ambience')) {
      this.setLocation(this.desiredAmbience);
    }
  }

  reset() {
    this.stopRage();
    this.stopLoop('ambience', 0);
    this.desiredAmbience = null;
  }
}

export function getAudio(scene) {
  if (!scene.game.audioDirector) scene.game.audioDirector = new AudioDirector(scene);
  return scene.game.audioDirector;
}

export function playSfx(scene, key, options) {
  return getAudio(scene).playSfx(key, options);
}

export function syncSceneAudio(scene, location) {
  getAudio(scene).setLocation(location);
}

export function createAudioControl(scene) {
  const audio = getAudio(scene);
  const width = 176;
  const height = 46;
  const x = GAME_WIDTH - 24;
  const y = 18;
  const panel = scene.add.rectangle(x, y, width, height, 0x382824, 0.88)
    .setOrigin(1, 0)
    .setStrokeStyle(2, 0xf1e4c7)
    .setScrollFactor(0)
    .setDepth(DEPTH.ui + 30)
    .setInteractive({ cursor: 'pointer' });
  const label = scene.add.text(x - (width / 2), y + (height / 2), '', {
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
    fontSize: '20px',
    color: '#f1e4c7',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.ui + 31);
  const render = () => label.setText(audio.isMuted() ? 'SOUND: OFF' : 'SOUND: ON');
  render();
  panel.on('pointerdown', () => {
    const wasMuted = audio.isMuted();
    if (!wasMuted) playSfx(scene, 'uiClick');
    audio.toggleMuted();
    if (wasMuted) playSfx(scene, 'uiClick');
    render();
  });
  return { panel, label };
}
