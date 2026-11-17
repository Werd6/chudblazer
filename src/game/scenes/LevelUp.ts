import { GameObjects, Scene, Scenes } from 'phaser';
import { AUGMENTS, DEPTH, LEVEL_UP, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { duckMusic, unduckMusic } from '../systems/Music';
import type { ChoiceCard } from '../upgrades';

export type LevelUpData = {
    level: number;
    cards: ChoiceCard[];
    statsLine: string;
    /** Return another LevelUpData to chain into a follow-up pick without softlocking. */
    onPick: (index: number) => LevelUpData | void;
    mythical?: boolean;
    title?: string;
    subtitle?: string;
};

const CARD_WIDTH = 240;
const CARD_HEIGHT = 270;
const CARD_GAP = 30;
const CARD_Y = 290;
const CARD_FILL = 0x1d241d;
const MYTHIC_FILL = 0x2a1808;

export class LevelUp extends Scene
{
    private payload: LevelUpData;
    private ready = false;
    private picked = false;

    constructor ()
    {
        super('LevelUp');
    }

    init (data: LevelUpData)
    {
        this.payload = data;
        this.ready = false;
        this.picked = false;
    }

    create ()
    {
        duckMusic();

        const { level, cards, statsLine, mythical } = this.payload;
        const cx = VIEW_WIDTH / 2;
        const title = this.payload.title ?? (mythical ? 'MYTHICAL ORANGE!' : 'LEVEL UP!');
        const subtitle = this.payload.subtitle
            ?? (mythical ? `Level ${level}  -  choose an augment` : `Level ${level}  -  pick one`);
        const titleColor = mythical ? '#ff7a18' : '#ffa500';

        this.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, mythical ? 0.72 : 0.65).setOrigin(0);

        this.add.text(cx, 72, title, {
            fontFamily: 'Arial Black', fontSize: mythical ? 40 : 44, color: titleColor,
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5);

        this.add.text(cx, 118, subtitle, {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff',
        }).setOrigin(0.5);

        const totalWidth = cards.length * CARD_WIDTH + (cards.length - 1) * CARD_GAP;
        const firstX = cx - totalWidth / 2 + CARD_WIDTH / 2;

        cards.forEach((card, i) => this.makeCard(card, i, firstX + i * (CARD_WIDTH + CARD_GAP), mythical === true));

        this.add.text(cx, VIEW_HEIGHT - 28, statsLine, {
            fontFamily: 'Arial', fontSize: 15, color: '#b8c8b8',
        }).setOrigin(0.5);

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            const n = Number(event.key);

            if (Number.isInteger(n) && n >= 1 && n <= cards.length)
            {
                this.pick(n - 1);
            }
        });

        this.time.delayedCall(LEVEL_UP.inputDelaySeconds * 1000, () => {
            this.ready = true;
        });

        this.events.once(Scenes.Events.SHUTDOWN, () => unduckMusic());
    }

    private makeCard (card: ChoiceCard, index: number, x: number, mythical: boolean)
    {
        const container = this.add.container(x, CARD_Y).setDepth(DEPTH.hud);
        const fill = mythical ? MYTHIC_FILL : CARD_FILL;
        const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, fill).setStrokeStyle(3, card.color);
        const children: GameObjects.GameObject[] = [bg];

        children.push(this.add.text(0, -CARD_HEIGHT / 2 + 18, card.tag, {
            fontFamily: 'Arial Black', fontSize: 14, color: toCss(card.color),
        }).setOrigin(0.5));

        if (card.texture)
        {
            children.push(this.add.image(0, -62, card.texture).setScale(4));
        }
        else
        {
            children.push(this.add.circle(0, -62, 30, card.color));
            children.push(this.add.text(0, -62, card.badge ?? '', {
                fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4,
            }).setOrigin(0.5));
        }

        const title = this.add.text(0, -6, card.title, {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
        }).setOrigin(0.5);
        title.setScale(Math.min(1, (CARD_WIDTH - 20) / title.width));
        children.push(title);

        children.push(this.add.text(0, 22, card.body, {
            fontFamily: 'Arial', fontSize: 15, color: '#dddddd', align: 'center',
            wordWrap: { width: CARD_WIDTH - 30 },
        }).setOrigin(0.5, 0));

        children.push(this.add.text(0, CARD_HEIGHT / 2 - 22, card.footer, {
            fontFamily: 'Arial Black', fontSize: 15, color: mythical ? toCss(AUGMENTS.color) : '#ffe14a',
        }).setOrigin(0.5));

        children.push(this.add.text(0, CARD_HEIGHT / 2 + 22, `[${index + 1}]`, {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff',
        }).setOrigin(0.5));

        container.add(children);

        // Require press+release after the grace period so a lingering joystick finger-up can't pick.
        let armed = false;

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
            bg.setStrokeStyle(4, 0xffffff);
            container.setScale(1.04);
        });
        bg.on('pointerout', () => {
            armed = false;
            bg.setStrokeStyle(3, card.color);
            container.setScale(1);
        });
        bg.on('pointerdown', () => {
            armed = this.ready && !this.picked;
        });
        bg.on('pointerup', () => {
            if (armed)
            {
                armed = false;
                this.pick(index);
            }
        });
    }

    pick (index: number)
    {
        if (!this.ready || this.picked)
        {
            return;
        }

        this.picked = true;
        const next = this.payload.onPick(index);

        if (next)
        {
            // Restart this scene with the follow-up cards (e.g. Single Minded weapon pick).
            this.scene.restart(next);
            return;
        }

        this.scene.stop();
    }
}

function toCss (color: number)
{
    return `#${color.toString(16).padStart(6, '0')}`;
}
