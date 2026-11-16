import { xpToNextLevel } from '../config';

export class Progression
{
    level = 1;
    xp = 0;
    pendingLevelUps = 0;

    get xpToNext () { return xpToNextLevel(this.level); }
    get progress () { return this.xp / this.xpToNext; }

    addXp (amount: number)
    {
        this.xp += amount;

        while (this.xp >= this.xpToNext)
        {
            this.xp -= this.xpToNext;
            this.level++;
            this.pendingLevelUps++;
        }
    }

    takePendingLevel (): number | null
    {
        if (this.pendingLevelUps === 0)
        {
            return null;
        }

        this.pendingLevelUps--;
        return this.level - this.pendingLevelUps;
    }
}
