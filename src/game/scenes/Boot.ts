import { Scene } from 'phaser';
import { TEXTURES } from '../config';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    create ()
    {
        this.makeGroundTexture();
        this.makePistolTexture();
        this.makeSmgTexture();
        this.makeShotgunTexture();
        this.makeBulletTexture();
        this.makeOrangeTexture();
        this.makeNewWeaponTextures();
        this.makeProjectileTextures();
        this.makeEffectTextures();

        this.scene.start('Preloader');
    }

    private canvas (key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void)
    {
        const texture = this.textures.createCanvas(key, width, height)!;
        draw(texture.getContext());
        texture.refresh();
    }

    // Weapons face right; the sprite origin is 25% from the left, where the hand holds it.
    private makeNewWeaponTextures ()
    {
        this.canvas(TEXTURES.sword, 28, 8, ctx => {
            ctx.fillStyle = '#6b4220';
            ctx.fillRect(0, 3, 6, 2);
            ctx.fillStyle = '#e0b030';
            ctx.fillRect(6, 0, 2, 8);
            ctx.fillStyle = '#c8d0dc';
            ctx.beginPath();
            ctx.moveTo(8, 2); ctx.lineTo(24, 2); ctx.lineTo(28, 4); ctx.lineTo(24, 6); ctx.lineTo(8, 6);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 3, 16, 1);
        });

        this.canvas(TEXTURES.remington, 32, 9, ctx => {
            ctx.fillStyle = '#7a4a24';
            ctx.fillRect(0, 3, 12, 5);
            ctx.fillStyle = '#222222';
            ctx.fillRect(11, 3, 7, 4);
            ctx.fillRect(17, 4, 15, 2);
            ctx.fillRect(12, 0, 8, 2);
            ctx.fillStyle = '#888888';
            ctx.fillRect(14, 7, 2, 2);
        });

        this.canvas(TEXTURES.glock, 16, 9, ctx => {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(1, 4, 5, 5);
            ctx.fillStyle = '#ffcc33';
            ctx.fillRect(0, 1, 16, 4);
            ctx.fillStyle = '#fff2a8';
            ctx.fillRect(1, 1, 14, 1);
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(0, 4, 16, 1);
        });

        this.canvas(TEXTURES.lips, 16, 11, ctx => {
            ctx.fillStyle = '#d4183a';
            ctx.beginPath();
            ctx.ellipse(8, 3.5, 8, 3.5, 0, 0, Math.PI * 2);
            ctx.ellipse(8, 7.5, 7, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5a0010';
            ctx.fillRect(1, 5, 14, 1);
            ctx.fillStyle = '#ff8aa0';
            ctx.fillRect(4, 1, 3, 1);
            ctx.fillRect(9, 8, 3, 1);
        });

        this.canvas(TEXTURES.bennyBomb, 14, 14, ctx => {
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(6, 8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8a6a3a';
            ctx.fillRect(9, 1, 2, 3);
            ctx.fillStyle = '#ffa020';
            ctx.fillRect(10, 0, 3, 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('B', 6, 9);
        });

        this.canvas(TEXTURES.noKings, 30, 18, ctx => {
            ctx.fillStyle = '#8a5a2a';
            ctx.fillRect(0, 8, 12, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(11, 0, 19, 18);
            ctx.strokeStyle = '#d4183a';
            ctx.lineWidth = 1;
            ctx.strokeRect(11.5, 0.5, 18, 17);
            ctx.fillStyle = '#d4183a';
            ctx.font = 'bold 7px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NO', 20.5, 5);
            ctx.fillText('KINGS', 20.5, 12.5);
        });

        this.canvas(TEXTURES.lightsaber, 30, 7, ctx => {
            ctx.fillStyle = '#9aa0a8';
            ctx.fillRect(0, 2, 8, 3);
            ctx.fillStyle = '#222222';
            ctx.fillRect(2, 2, 1, 3);
            ctx.fillRect(4, 2, 1, 3);
            ctx.fillStyle = 'rgba(79, 210, 255, 0.45)';
            ctx.fillRect(8, 0, 22, 7);
            ctx.fillStyle = '#4fd2ff';
            ctx.fillRect(8, 1, 21, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 3, 20, 1);
        });

        this.canvas(TEXTURES.gatling, 28, 12, ctx => {
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 2, 12, 8);
            ctx.fillRect(3, 9, 3, 3);
            ctx.fillStyle = '#555555';
            ctx.fillRect(11, 2, 17, 2);
            ctx.fillRect(11, 5, 17, 2);
            ctx.fillRect(11, 8, 17, 2);
            ctx.fillStyle = '#8a8a8a';
            ctx.fillRect(15, 1, 2, 10);
            ctx.fillRect(24, 1, 2, 10);
        });

        this.drawSquishmallow(TEXTURES.squishmallow, 15);
    }

    private makeProjectileTextures ()
    {
        this.canvas(TEXTURES.rifleRound, 10, 3, ctx => {
            ctx.fillStyle = '#ffe9a0';
            ctx.fillRect(0, 0, 8, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, 1, 2, 1);
        });

        this.canvas(TEXTURES.goldRound, 8, 4, ctx => {
            ctx.fillStyle = '#ffcc33';
            ctx.fillRect(0, 0, 7, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(1, 1, 6, 1);
        });

        this.canvas(TEXTURES.urMom, 50, 16, ctx => {
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000000';
            ctx.strokeText('ur mom', 25, 8);
            ctx.fillStyle = '#ff5c8a';
            ctx.fillText('ur mom', 25, 8);
        });

        this.drawSquishmallow(TEXTURES.squishShot, 9);
    }

    private drawSquishmallow (key: string, size: number)
    {
        this.canvas(key, size, size, ctx => {
            const r = size / 2;
            ctx.fillStyle = '#5a3a6a';
            ctx.beginPath();
            ctx.arc(r, r + 0.5, r - 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d9a8ff';
            ctx.beginPath();
            ctx.arc(r, r + 0.5, r - 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222222';
            ctx.fillRect(Math.round(r * 0.6), Math.round(r * 0.9), 1, 1);
            ctx.fillRect(Math.round(r * 1.3), Math.round(r * 0.9), 1, 1);
            ctx.fillStyle = '#ff7ab0';
            ctx.fillRect(Math.round(r * 0.4), Math.round(r * 1.2), 1, 1);
            ctx.fillRect(Math.round(r * 1.5), Math.round(r * 1.2), 1, 1);
        });
    }

    private makeEffectTextures ()
    {
        this.canvas(TEXTURES.fxPixel, 4, 4, ctx => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 4, 4);
        });

        // Half-ring around the left-centre point; drawn with origin (0, 0.5) and scaled to the swing reach.
        this.canvas(TEXTURES.fxSlash, 64, 128, ctx => {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.arc(0, 64, 52, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(0, 64, 56, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
        });

        this.canvas(TEXTURES.fxBoom, 64, 64, ctx => {
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
            gradient.addColorStop(0.35, 'rgba(255, 200, 60, 0.95)');
            gradient.addColorStop(0.7, 'rgba(255, 90, 20, 0.8)');
            gradient.addColorStop(1, 'rgba(120, 30, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
        });
    }

    private makePistolTexture ()
    {
        const g = this.make.graphics({}, false);

        g.fillStyle(0x111111);
        g.fillRect(0, 1, 16, 5);
        g.fillRect(1, 4, 5, 4);
        g.fillStyle(0x5a5a5a);
        g.fillRect(1, 2, 14, 3);
        g.fillRect(2, 5, 3, 2);

        g.generateTexture(TEXTURES.pistol, 16, 8);
        g.destroy();
    }

    private makeSmgTexture ()
    {
        const g = this.make.graphics({}, false);

        g.fillStyle(0x111111);
        g.fillRect(0, 1, 16, 5);
        g.fillRect(6, 4, 4, 6);
        g.fillRect(1, 4, 3, 4);
        g.fillStyle(0x3a4a6a);
        g.fillRect(1, 2, 14, 3);
        g.fillRect(7, 5, 2, 4);

        g.generateTexture(TEXTURES.smg, 16, 10);
        g.destroy();
    }

    private makeShotgunTexture ()
    {
        const g = this.make.graphics({}, false);

        g.fillStyle(0x111111);
        g.fillRect(0, 1, 22, 5);
        g.fillStyle(0x6b4220);
        g.fillRect(1, 2, 7, 4);
        g.fillStyle(0x777777);
        g.fillRect(8, 2, 13, 2);

        g.generateTexture(TEXTURES.shotgun, 22, 7);
        g.destroy();
    }

    private makeBulletTexture ()
    {
        const g = this.make.graphics({}, false);

        g.fillStyle(0xffe14a);
        g.fillCircle(3, 3, 3);

        g.generateTexture(TEXTURES.bullet, 6, 6);
        g.destroy();
    }

    private makeOrangeTexture ()
    {
        const g = this.make.graphics({}, false);

        g.fillStyle(0x7a3a00);
        g.fillCircle(6, 7, 5);
        g.fillStyle(0xff9a1a);
        g.fillCircle(6, 7, 4);
        g.fillStyle(0x3fbf3f);
        g.fillRect(6, 0, 3, 2);

        g.generateTexture(TEXTURES.orange, 12, 12);
        g.destroy();
    }

    private makeGroundTexture ()
    {
        const g = this.make.graphics({}, false);

        g.fillStyle(0x1a2e1a);
        g.fillRect(0, 0, 64, 64);
        g.fillStyle(0x223a22);
        g.fillRect(0, 0, 32, 32);
        g.fillRect(32, 32, 32, 32);

        g.generateTexture(TEXTURES.ground, 64, 64);
        g.destroy();
    }
}
