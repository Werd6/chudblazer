import { AUTO, Game, Scale } from 'phaser';
import { BACKGROUND_COLOR, VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { Intro } from './scenes/Intro';
import { LevelUp } from './scenes/LevelUp';
import { MainMenu } from './scenes/MainMenu';
import { Pause } from './scenes/Pause';
import { Preloader } from './scenes/Preloader';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'game-container',
    backgroundColor: BACKGROUND_COLOR,
    pixelArt: true,
    input: {
        activePointers: 3,
        // Keep page from scrolling / zooming while playing on phones.
        touch: { capture: true },
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
        width: VIEW_WIDTH,
        height: VIEW_HEIGHT,
        fullscreenTarget: 'app',
        expandParent: true,
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Intro,
        MainGame,
        LevelUp,
        Pause,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
