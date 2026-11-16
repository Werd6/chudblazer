import { GameObjects, Scene, Scenes } from 'phaser';
import { DEPTH, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { duckMusic, unduckMusic } from '../systems/Music';

export type PauseData = {
    oranges: number;
    level: number;
    elapsed: number;
    hp: number;
    maxHp: number;
    extraLives: number;
    statsLine: string;
    weapons: string[];
    augments: string[];
    onResume: () => void;
    onRestart: () => void;
    onEnd: () => void;
};

const PANEL_W = 420;
const PANEL_H = 420;

export class Pause extends Scene
{
    private payload: PauseData;
    private ducked = false;

    constructor ()
    {
        super('Pause');
    }

    init (data: PauseData)
    {
        this.payload = data;
        this.ducked = false;
    }

    create ()
    {
        duckMusic();
        this.ducked = true;

        const cx = VIEW_WIDTH / 2;
        const cy = VIEW_HEIGHT / 2;
        const p = this.payload;

        this.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.72).setOrigin(0);

        this.add.rectangle(cx, cy, PANEL_W, PANEL_H, 0x162016, 0.96)
            .setStrokeStyle(3, 0xffa500)
            .setDepth(DEPTH.hud);

        this.add.text(cx, cy - PANEL_H / 2 + 28, 'PAUSED', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ffa500',
            stroke: '#000000', strokeThickness: 7,
        }).setOrigin(0.5).setDepth(DEPTH.hud);

        const lines = [
            `Time  ${formatTime(p.elapsed)}`,
            `Level  ${p.level}    Oranges  ${p.oranges}`,
            `HP  ${Math.ceil(p.hp)} / ${p.maxHp}`
                + (p.extraLives > 0 ? `    Lives  ${p.extraLives}` : ''),
            '',
            p.statsLine || 'No upgrades yet',
            '',
            `Guns  ${p.weapons.length ? p.weapons.join(', ') : 'none'}`,
            p.augments.length ? `Augments  ${p.augments.join(', ')}` : '',
        ].filter(Boolean);

        this.add.text(cx, cy - 110, lines.join('\n'), {
            fontFamily: 'Arial', fontSize: 15, color: '#e8e0d0', align: 'center',
            lineSpacing: 6, wordWrap: { width: PANEL_W - 40 },
        }).setOrigin(0.5, 0).setDepth(DEPTH.hud);

        const btnY = cy + PANEL_H / 2 - 78;
        this.makeButton(cx, btnY - 72, 'RESUME', 0x4fc06a, () => this.resume());
        this.makeButton(cx, btnY - 24, 'RESTART RUN', 0xe0a030, () => this.restartRun());
        this.makeButton(cx, btnY + 24, 'END RUN', 0xd9483b, () => this.endRun());

        this.input.keyboard?.on('keydown-ESC', this.resume, this);
        this.input.keyboard?.on('keydown-P', this.resume, this);

        this.events.once(Scenes.Events.SHUTDOWN, this.onShutdown, this);
    }

    private makeButton (x: number, y: number, label: string, color: number, onClick: () => void)
    {
        const bg = this.add.rectangle(x, y, 220, 40, 0x101610)
            .setStrokeStyle(2, color)
            .setDepth(DEPTH.hud)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(DEPTH.hud);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x243024);
            text.setColor('#ffe14a');
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x101610);
            text.setColor('#ffffff');
        });
        bg.on('pointerup', onClick);

        return { bg, text } as { bg: GameObjects.Rectangle; text: GameObjects.Text };
    }

    private resume ()
    {
        this.payload.onResume();
        this.scene.stop();
    }

    private restartRun ()
    {
        this.payload.onRestart();
        this.scene.stop();
    }

    private endRun ()
    {
        this.payload.onEnd();
        this.scene.stop();
    }

    private onShutdown ()
    {
        if (this.ducked)
        {
            unduckMusic();
            this.ducked = false;
        }
    }
}

function formatTime (seconds: number)
{
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
