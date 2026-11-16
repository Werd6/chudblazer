/** Touch / coarse-pointer helpers and fullscreen landscape entry. */

export function isTouchUi (): boolean
{
    return window.matchMedia('(pointer: coarse)').matches
        || navigator.maxTouchPoints > 0
        || 'ontouchstart' in window;
}

export function isPortrait (): boolean
{
    return window.matchMedia('(orientation: portrait)').matches;
}

export function isFullscreen (): boolean
{
    return Boolean(
        document.fullscreenElement
        || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement,
    );
}

/** Fullscreen the app shell, then try to lock landscape (requires gesture + often fullscreen). */
export async function enterFullscreenLandscape (): Promise<void>
{
    const root = document.getElementById('app') ?? document.documentElement;

    try
    {
        if (!isFullscreen())
        {
            const req = root.requestFullscreen?.bind(root)
                ?? (root as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
                    .webkitRequestFullscreen?.bind(root);

            if (req)
            {
                await req();
            }
        }
    }
    catch
    {
        // Still try orientation lock — some browsers allow it without FS.
    }

    try
    {
        const orientation = screen.orientation as ScreenOrientation & {
            lock?: (orientation: string) => Promise<void>;
        };

        await orientation.lock?.('landscape');
    }
    catch
    {
        // iOS Safari often refuses lock; the rotate hint covers that case.
    }

    syncMobileChrome();
}

export async function exitFullscreen (): Promise<void>
{
    try
    {
        if (isFullscreen())
        {
            const exit = document.exitFullscreen?.bind(document)
                ?? (document as Document & { webkitExitFullscreen?: () => Promise<void> })
                    .webkitExitFullscreen?.bind(document);

            await exit?.();
        }
    }
    catch
    {
        // Ignore.
    }

    syncMobileChrome();
}

export function syncMobileChrome ()
{
    document.body.classList.toggle('touch-ui', isTouchUi());
    document.body.classList.toggle('portrait', isPortrait());
    document.body.classList.toggle('is-fullscreen', isFullscreen());
}

/** Wire the HTML fullscreen / rotate buttons and viewport class syncing. */
export function installMobileChrome ()
{
    syncMobileChrome();

    const fsBtn = document.getElementById('fullscreen-btn');
    const rotateBtn = document.getElementById('rotate-fs');

    const onFs = (event: Event) => {
        event.preventDefault();
        void (isFullscreen() ? exitFullscreen() : enterFullscreenLandscape());
    };

    fsBtn?.addEventListener('click', onFs);
    rotateBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        void enterFullscreenLandscape();
    });

    window.addEventListener('resize', syncMobileChrome);
    window.addEventListener('orientationchange', syncMobileChrome);
    document.addEventListener('fullscreenchange', syncMobileChrome);
    document.addEventListener('webkitfullscreenchange', syncMobileChrome);
}

export type NamePromptResult = { name: string; cancelled: boolean };

/** Native-feeling name entry for mobile (opens the OS keyboard). */
export function promptNameMobile (maxLength: number): Promise<NamePromptResult>
{
    const overlay = document.getElementById('name-overlay');
    const input = document.getElementById('name-input') as HTMLInputElement | null;
    const save = document.getElementById('name-save');

    if (!overlay || !input || !save)
    {
        const fallback = window.prompt('NEW TOP 10! Enter your name', '') ?? '';
        return Promise.resolve({ name: fallback.slice(0, maxLength), cancelled: false });
    }

    return new Promise(resolve => {
        overlay.hidden = false;
        input.value = '';
        input.maxLength = maxLength;

        const finish = (name: string, cancelled: boolean) => {
            overlay.hidden = true;
            input.blur();
            save.removeEventListener('click', onSave);
            input.removeEventListener('keydown', onKey);
            resolve({ name, cancelled });
        };

        const onSave = () => finish(input.value, false);
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Enter')
            {
                event.preventDefault();
                finish(input.value, false);
            }
        };

        save.addEventListener('click', onSave);
        input.addEventListener('keydown', onKey);
        window.setTimeout(() => input.focus(), 50);
    });
}
