import { GameObjects, Scene, Textures } from 'phaser';
import { INTRO, VIEW_HEIGHT, VIEW_WIDTH } from '../config';

export class Intro extends Scene
{
    private index = 0;
    private panel: GameObjects.Image;
    private advancing = false;
    private holdTimer?: Phaser.Time.TimerEvent;

    constructor ()
    {
        super('Intro');
    }

    create ()
    {
        this.index = 0;
        this.advancing = false;

        this.cameras.main.setBackgroundColor(INTRO.background);
        this.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, INTRO.background).setOrigin(0);

        this.panel = this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, INTRO.panels[0]).setAlpha(0);
        this.fitPanel(this.panel);

        this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 22, 'tap / click to continue', {
            fontFamily: 'Arial', fontSize: 16, color: '#d8c8b0',
        }).setOrigin(0.5).setAlpha(0.85);

        this.input.on('pointerdown', this.advance, this);
        this.input.keyboard?.on('keydown', this.advance, this);

        this.tweens.add({
            targets: this.panel,
            alpha: 1,
            duration: INTRO.fadeSeconds * 1000,
            onComplete: () => this.armHold(),
        });
    }

    private fitPanel (image: GameObjects.Image)
    {
        const scale = Math.min(VIEW_WIDTH / image.width, VIEW_HEIGHT / image.height);
        image.setScale(scale);
    }

    private armHold ()
    {
        this.holdTimer?.remove(false);
        this.holdTimer = this.time.delayedCall(INTRO.holdSeconds * 1000, () => this.advance());
    }

    private advance = () =>
    {
        if (this.advancing)
        {
            return;
        }

        this.advancing = true;
        this.holdTimer?.remove(false);

        const next = this.index + 1;

        if (next >= INTRO.panels.length)
        {
            this.tweens.add({
                targets: this.panel,
                alpha: 0,
                duration: INTRO.fadeSeconds * 1000,
                onComplete: () => this.scene.start('Game'),
            });
            return;
        }

        this.tweens.add({
            targets: this.panel,
            alpha: 0,
            duration: INTRO.fadeSeconds * 1000,
            onComplete: () => {
                this.index = next;
                this.panel.setTexture(INTRO.panels[this.index]);
                this.fitPanel(this.panel);
                this.tweens.add({
                    targets: this.panel,
                    alpha: 1,
                    duration: INTRO.fadeSeconds * 1000,
                    onComplete: () => {
                        this.advancing = false;
                        this.armHold();
                    },
                });
            },
        });
    };
}

/** Comic panels need linear filtering so the drawn art stays smooth. */
export function prepareIntroTextures (scene: Scene)
{
    for (const key of INTRO.panels)
    {
        scene.textures.get(key).setFilter(Textures.FilterMode.LINEAR);
    }
}
