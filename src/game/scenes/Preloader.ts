import { Scene, Textures } from 'phaser';
import { INTRO, SOUND_FILES, TEXTURES } from '../config';
import { prepareIntroTextures } from './Intro';

// Drawn art from scripts/prepare-sprites.py; each texture key matches its file name.
const SPRITES = [
    TEXTURES.capybaraStand,
    TEXTURES.capybaraWalk,
    TEXTURES.goblin,
    TEXTURES.ork,
    TEXTURES.troll,
    TEXTURES.kingStinky,
    TEXTURES.frankenfart,
    TEXTURES.ooglyBoogly,
    TEXTURES.grosstesque,
];

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    preload ()
    {
        this.load.setPath('assets');

        for (const key of SPRITES)
        {
            this.load.image(key, `${key}.png`);
        }

        for (const [key, file] of Object.entries(INTRO.files))
        {
            this.load.image(key, file);
        }

        for (const [key, file] of Object.entries(SOUND_FILES))
        {
            this.load.audio(key, file);
        }
    }

    create ()
    {
        // pixelArt: true makes every texture nearest-filtered; drawn art needs linear to scale down cleanly.
        for (const key of SPRITES)
        {
            this.textures.get(key).setFilter(Textures.FilterMode.LINEAR);
        }

        prepareIntroTextures(this);
        this.scene.start('MainMenu');
    }
}
