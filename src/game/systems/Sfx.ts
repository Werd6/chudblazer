import type { Scene } from 'phaser';
import {
    CHUD_HIT_SOUNDS, ChudKind, SOUND, SOUNDS, WEAPON_SOUNDS, WeaponKind,
} from '../config';

const lastPlayedAt = new Map<string, number>();

function play (scene: Scene, key: string, volume: number, throttleMs = 0)
{
    if (!scene.sound || !scene.cache.audio.exists(key))
    {
        return;
    }

    if (throttleMs > 0)
    {
        const now = scene.time.now;
        const last = lastPlayedAt.get(key) ?? -Infinity;

        if (now - last < throttleMs)
        {
            return;
        }

        lastPlayedAt.set(key, now);
    }

    scene.sound.play(key, { volume: volume * SOUND.masterVolume });
}

export function playWeaponFire (scene: Scene, kind: WeaponKind)
{
    play(scene, WEAPON_SOUNDS[kind], SOUND.weaponVolume[kind], SOUND.throttleMs[kind] ?? 0);
}

export function playOrangePickup (scene: Scene)
{
    play(scene, SOUNDS.orange, SOUND.orangeVolume, SOUND.throttleMs.orange ?? 0);
}

export function playChudHit (scene: Scene, kind: ChudKind)
{
    play(scene, CHUD_HIT_SOUNDS[kind], SOUND.hitVolume[kind], SOUND.throttleMs[kind] ?? 50);
}

export function playLevelUp (scene: Scene)
{
    play(scene, SOUNDS.levelUp, SOUND.levelUpVolume);
}
