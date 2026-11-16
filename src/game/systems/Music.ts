import type { Scene } from 'phaser';
import { SOUND, SOUNDS } from '../config';

type MusicHandle = Phaser.Sound.BaseSound & {
    isPlaying?: boolean;
    setVolume: (value: number) => void;
    play: (config?: object) => boolean | void;
    stop: () => void;
};

let track: MusicHandle | null = null;
let duckDepth = 0;

/** Start (or resume) the looping score. Safe to call from any scene after audio is loaded. */
export function ensureMusic (scene: Scene)
{
    if (!scene.sound || !scene.cache.audio.exists(SOUNDS.music))
    {
        return;
    }

    if (!track)
    {
        track = scene.sound.add(SOUNDS.music, {
            loop: true,
            volume: currentVolume(),
        }) as MusicHandle;
    }

    if (!track.isPlaying)
    {
        track.play({ loop: true, volume: currentVolume() });
    }
    else
    {
        track.setVolume(currentVolume());
    }
}

/** Lower music while a blocking menu is open. Nestable. */
export function duckMusic ()
{
    duckDepth += 1;
    applyVolume();
}

/** Restore music after a ducked menu closes. */
export function unduckMusic ()
{
    duckDepth = Math.max(0, duckDepth - 1);
    applyVolume();
}

export function stopMusic ()
{
    track?.stop();
    duckDepth = 0;
}

function currentVolume ()
{
    const duck = duckDepth > 0 ? SOUND.musicDuckFactor : 1;
    return SOUND.musicVolume * SOUND.masterVolume * duck;
}

function applyVolume ()
{
    track?.setVolume(currentVolume());
}
