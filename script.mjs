import puppeteer from 'puppeteer-extra';
import fetch from 'node-fetch';
import { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } from 'puppeteer';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

/**
 * To get a token, visit
 * https://api.imgur.com/oauth2/authorize?client_id=7176a68b6fa9e8b&response_type=token&state=blah
 * and provide the value for access_token after allowing
 */
const token = 'XXX';
const user = 'XXX';

puppeteer.use(
    AdblockerPlugin({
        // Optionally enable Cooperative Mode for several request interceptors
        interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
    })
)

async function isAnonymous(id) {
    if (id === undefined) {
        return false;
    }
    const res = await fetch(`https://api.imgur.com/3/image/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    let json = await res.json();
    return json.data.account_id === null;
}

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    let pageNum = 1;
    let maxPage = 0;
    do {
        await page.goto(`https://www.sporcle.com/user/${user}/quizzes/${pageNum}`);
        const payload = await page.evaluate('window.app.payload');
        maxPage = payload.maxPage;

        const games = await page.evaluate(`[...document.getElementById('main-table').querySelectorAll('a')].filter(a => a.href.includes('games/${user}')).map(a => a.href)`);

        for (let game of games.slice(0)) {
            await page.goto(game, { timeout: 60000 });
            const imgurIds = await page.evaluate(`[...document.body.innerHTML.matchAll('imgur.com(.*?)\.(png|jpg)')].map(m => m[1].slice(-7)) `);

            if (await isAnonymous(imgurIds[0])) {
                console.log(game);
            }

        }
        pageNum = pageNum + 1;
    } while (pageNum <= maxPage)

    await browser.close();
})();
