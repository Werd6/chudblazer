import { GameObjects, Input, Math as PMath, Scene } from 'phaser';
import { DEPTH, VIEW_HEIGHT, VIEW_WIDTH } from '../config';

const BASE_RADIUS = 54;
const THUMB_RADIUS = 24;
const DEAD_ZONE = 8;
/** Left portion of the view that can start the stick. */
const ZONE_WIDTH = VIEW_WIDTH * 0.48;

/**
 * Dynamic virtual stick: touch anywhere on the left side of the screen to move.
 * Fixed to the camera; only created on touch devices.
 */
export class VirtualJoystick
{
    readonly vector = new PMath.Vector2();
    private readonly base: GameObjects.Arc;
    private readonly thumb: GameObjects.Arc;
    private readonly zone: GameObjects.Zone;
    private pointerId: number | null = null;
    private originX = 0;
    private originY = 0;

    constructor (private readonly scene: Scene)
    {
        const y = VIEW_HEIGHT - 88;

        this.base = scene.add.circle(90, y, BASE_RADIUS, 0x000000, 0.28)
            .setStrokeStyle(3, 0xffa500, 0.55)
            .setScrollFactor(0)
            .setDepth(DEPTH.hud)
            .setVisible(false);

        this.thumb = scene.add.circle(90, y, THUMB_RADIUS, 0xffa500, 0.55)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setScrollFactor(0)
            .setDepth(DEPTH.hud + 1)
            .setVisible(false);

        this.zone = scene.add.zone(ZONE_WIDTH / 2, VIEW_HEIGHT / 2, ZONE_WIDTH, VIEW_HEIGHT)
            .setScrollFactor(0)
            .setDepth(DEPTH.hud - 1)
            .setInteractive();

        this.zone.on('pointerdown', (pointer: Input.Pointer) => this.grab(pointer));
        scene.input.on('pointermove', this.drag, this);
        scene.input.on('pointerup', this.release, this);
        scene.input.on('pointerupoutside', this.release, this);
    }

    get active () { return this.pointerId !== null; }

    private grab (pointer: Input.Pointer)
    {
        if (this.pointerId !== null)
        {
            return;
        }

        this.pointerId = pointer.id;
        this.originX = PMath.Clamp(pointer.x, BASE_RADIUS + 8, ZONE_WIDTH - BASE_RADIUS - 8);
        this.originY = PMath.Clamp(pointer.y, BASE_RADIUS + 8, VIEW_HEIGHT - BASE_RADIUS - 8);

        this.base.setPosition(this.originX, this.originY).setVisible(true);
        this.thumb.setPosition(this.originX, this.originY).setVisible(true);
        this.vector.set(0, 0);
    }

    private drag = (pointer: Input.Pointer) => {
        if (pointer.id !== this.pointerId)
        {
            return;
        }

        const dx = pointer.x - this.originX;
        const dy = pointer.y - this.originY;
        const dist = Math.hypot(dx, dy);
        const capped = Math.min(dist, BASE_RADIUS);
        const angle = Math.atan2(dy, dx);

        this.thumb.setPosition(
            this.originX + Math.cos(angle) * capped,
            this.originY + Math.sin(angle) * capped,
        );

        if (dist < DEAD_ZONE)
        {
            this.vector.set(0, 0);
            return;
        }

        this.vector.set(Math.cos(angle), Math.sin(angle));
    };

    private release = (pointer: Input.Pointer) => {
        if (pointer.id !== this.pointerId)
        {
            return;
        }

        this.pointerId = null;
        this.vector.set(0, 0);
        this.base.setVisible(false);
        this.thumb.setVisible(false);
    };

    destroy ()
    {
        this.scene.input.off('pointermove', this.drag, this);
        this.scene.input.off('pointerup', this.release, this);
        this.scene.input.off('pointerupoutside', this.release, this);
        this.zone.destroy();
        this.base.destroy();
        this.thumb.destroy();
    }
}
