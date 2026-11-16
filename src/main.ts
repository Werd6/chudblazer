import StartGame from './game/main';
import { installMobileChrome } from './mobile';

document.addEventListener('DOMContentLoaded', () => {

    installMobileChrome();

    const game = StartGame('game-container');

    if (import.meta.env.DEV)
    {
        Object.assign(window, { game });
    }

});
