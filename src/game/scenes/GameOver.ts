import { GameObjects, Scene, Scenes } from 'phaser';
import { LEADERBOARD, VIEW_WIDTH } from '../config';
import {
    createLeaderboardPanel,
    qualifiesForLeaderboard,
    sanitizeName,
    submitScore,
    type LeaderboardPanel,
} from '../leaderboard';
import { duckMusic, ensureMusic, unduckMusic } from '../systems/Music';
import { isTouchUi, promptNameMobile } from '../../mobile';

export type GameOverData = {
    oranges: number;
};

export class GameOver extends Scene
{
    private oranges = 0;
    private phase: 'loading' | 'name' | 'done' = 'loading';
    private name = '';
    private nameText: GameObjects.Text;
    private promptText: GameObjects.Text;
    private board: LeaderboardPanel;
    private submitting = false;

    constructor ()
    {
        super('GameOver');
    }

    init (data: GameOverData)
    {
        this.oranges = Math.max(0, Math.floor(data?.oranges ?? 0));
        this.phase = 'loading';
        this.name = '';
        this.submitting = false;
    }

    create ()
    {
        ensureMusic(this);
        duckMusic();
        this.events.once(Scenes.Events.SHUTDOWN, () => unduckMusic());

        this.cameras.main.setBackgroundColor(0x3a0f0f);

        const cx = VIEW_WIDTH / 2;

        this.add.text(cx, 48, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5);

        this.add.text(cx, 100, `Oranges  ${this.oranges}`, {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffa500',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5);

        this.promptText = this.add.text(cx, 140, 'Loading leaderboard...', {
            fontFamily: 'Arial', fontSize: 18, color: '#e8e0d0',
        }).setOrigin(0.5);

        this.nameText = this.add.text(cx, 172, '', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffe14a',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setVisible(false);

        this.board = createLeaderboardPanel(this, cx, 350, { width: 300 });

        this.input.keyboard?.on('keydown', this.onKey, this);
        this.input.on('pointerdown', this.onPointer, this);

        void this.begin();
    }

    private async begin ()
    {
        await this.board.load();

        if (!(await qualifiesForLeaderboard(this.oranges)))
        {
            this.finish(0);
            return;
        }

        if (isTouchUi())
        {
            this.phase = 'name';
            this.promptText.setText('NEW TOP 10!');
            const { name } = await promptNameMobile(LEADERBOARD.maxNameLength);
            this.name = sanitizeName(name);
            await this.saveName();
            return;
        }

        this.phase = 'name';
        this.promptText.setText('NEW TOP 10! Type a name, then Enter');
        this.nameText.setVisible(true).setText('_');
    }

    private onKey (event: KeyboardEvent)
    {
        if (this.phase === 'done')
        {
            if (event.key === 'Enter' || event.key.length === 1)
            {
                this.goMenu();
            }
            return;
        }

        if (this.phase !== 'name' || this.submitting)
        {
            return;
        }

        if (event.key === 'Enter')
        {
            void this.saveName();
            return;
        }

        if (event.key === 'Backspace')
        {
            event.preventDefault();
            this.name = this.name.slice(0, -1);
            this.paintName();
            return;
        }

        if (event.key.length === 1 && this.name.length < LEADERBOARD.maxNameLength)
        {
            const next = sanitizeName(this.name + event.key);

            if (next.length >= this.name.length)
            {
                this.name = next;
                this.paintName();
            }
        }
    }

    private onPointer ()
    {
        if (this.phase === 'done')
        {
            this.goMenu();
        }
    }

    private paintName ()
    {
        this.nameText.setText(this.name.length > 0 ? this.name : '_');
    }

    private async saveName ()
    {
        if (this.submitting)
        {
            return;
        }

        this.submitting = true;
        this.promptText.setText('Saving...');

        const result = await submitScore(this.name, this.oranges);
        this.board.refresh(result.rank || undefined, result.entries);
        this.finish(result.rank);
    }

    private finish (rank: number)
    {
        this.phase = 'done';
        this.nameText.setVisible(false);
        this.promptText.setText(
            rank > 0
                ? `Rank #${rank}  ·  tap to continue`
                : 'tap to continue',
        );
    }

    private goMenu ()
    {
        this.scene.start('MainMenu');
    }
}
