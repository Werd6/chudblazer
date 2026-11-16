import { Scene } from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { createLeaderboardPanel } from '../leaderboard';
import { ensureMusic } from '../systems/Music';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        ensureMusic(this);

        const cx = VIEW_WIDTH / 2;

        this.add.text(cx, 70, 'chudlblazer', {
            fontFamily: 'Arial Black', fontSize: 56, color: '#ffa500',
            stroke: '#000000', strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5);

        this.add.text(cx, 120, 'collect oranges. blast chuds.', {
            fontFamily: 'Arial', fontSize: 18, color: '#d8e0d0',
        }).setOrigin(0.5);

        const board = createLeaderboardPanel(this, cx, 310, { width: 300 });
        void board.load();

        this.add.text(cx, VIEW_HEIGHT - 36, 'tap / click to start', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
        }).setOrigin(0.5);

        const start = () => {
            // First gesture unlocks audio in browsers that block autoplay.
            ensureMusic(this);
            this.scene.start('Intro');
        };

        this.input.once('pointerdown', start);
        this.input.keyboard?.once('keydown', start);
    }
}
