const express = require('express');
const fs = require('fs');
const {chromium} = require('playwright');

/*
    ЗАПУСК СЕРВЕРА
*/

var APP = express();
var PORT = 443;
APP.listen(PORT, () => console.log(`Прослушка порта ${PORT}`));
APP.set('views', 'views');
APP.set('view engine', 'pug');
APP.use(express.urlencoded({extended: false}));
APP.use(express.static('public'));

var chatArchive = {
        name: 'public/chat.json',
        get string() {return fs.readFileSync(this.name).toString();},
        get JSONAndErr() {
            try {return {JSON: JSON.parse(this.string), err: false};}
            catch {return {JSON: [], err: true};}
        },
        edit(input) {fs.writeFileSync(this.name, input);},
        add(input) {
            var resJSON = ( input ).concat( this.JSONAndErr.JSON );
            fs.writeFileSync(this.name, JSON.stringify(resJSON));
        }
    },
    pass = '1234567890';
    
APP.get('/michurin', (_, res) => {
    if (chatArchive.JSONAndErr.err) res.render('500');
    else res.render('index', {chatArchive: chatArchive.JSONAndErr.JSON, isPassCorrect: true});
});
APP.get('/michurin/edit', (_, res) => res.render('edit', {string: chatArchive.string}));
APP.get('/michurin/add', (_, res) => res.render('add'));
APP.post('/michurin/edit', (req, res) => {
    if (req.body.pass === pass) {
        chatArchive.edit(req.body.json);
        return res.redirect('/michurin');
    }
    else res.render('index', {chatArchive: chatArchive.JSONAndErr.JSON, isPassCorrect: false});
});
APP.post('/michurin/add', (req, res) => {
    if (req.body.pass === pass) {
        chatArchive.add(JSON.parse(req.body.json));
        return res.redirect('/michurin');
    }
    else res.render('index', {chatArchive: chatArchive.JSONAndErr.JSON, isPassCorrect: false});
});
APP.use((_, res) => res.render('404'));

/*
    ВЕБ-СКРЕЙПИНГ САЙТА NONO.MICHURIN.NET/CHAT И ВЫЧИТАНИЕ ЧАТОВ
*/

// ВНУТРИ ФУНКЦИИ API() ВСЁ ПОДЕЛЕНО НА СМЫСЛОВЫЕ БЛОКИ:

var API = async () => {
    {
        /* Мичурин (новые сверху) */
        var browser = await chromium.launch({headless: true});
        var page = await browser.newPage();

        await page.goto('http://nono.michurin.net/chat');
        await page.waitForSelector('#wall > div');
        var currentTime = new Date(); // Понадобится в 4-м смысловом блоке (ниже)
        var chatMichurin = await page.evaluate( () =>
            [...document.querySelectorAll('#wall > div > span')].toReversed().map( e => {
                var [n,m] = e.childNodes[1].textContent.split(/(?<!: .*): /);
                var c = e.style.color.match(/\d{1,3}/g).map(rgb => +rgb);
                if (c[0] + c[1] + c[2] === 0) c = [];
                return {t: e.childNodes[0].innerHTML.slice(1,6), c, n, m};
            } )
        );
        console.log('0)');
        console.log(chatMichurin[0]);

        browser.close();
    }
    {
        /* Архив (новые сверху) */
        // Тут, в принципе, ничего — просто подсказка, что нужен объект chatArchive.JSONAndErr.JSON
        console.log('1)');
        console.log(chatArchive.JSONAndErr.JSON[0]);
    }
    {
        /* Разность Мичурина и архива */
        
        // Вычислить последнее время в архиве и число его повторов вверх подряд
        var lastTimeArchive = chatArchive.JSONAndErr.JSON[0].t,
            lastIndexArchive = 0;
            console.log('2)');
            console.log(lastTimeArchive, lastIndexArchive);
        for (let i=1; lastTimeArchive === chatArchive.JSONAndErr.JSON[i].t; lastIndexArchive = ++i) {
            console.log('2)');
            console.log(chatArchive.JSONAndErr.JSON[i].t);}

        // Где оно последним есть у Мичурина и сколько повторяется вверх подряд хотя бы по модулю в сутки
        var lastIndexMichurin = chatMichurin.map(msg => msg.t).indexOf(lastTimeArchive);
            console.log('3)');
            console.log(lastIndexMichurin);
        for (let i=1; lastTimeArchive === chatMichurin.at(i).t; lastIndexMichurin = ++i) {
            console.log('3)');
            console.log(chatMichurin.at(i).t);}

        // Индекс массива Мичурина, с которого начинаются уникальные реплики
        // Если он оказывается 0 — равносильно отсутствию новых реплик
        var i = lastIndexMichurin - lastIndexArchive;
        var chatForAPI = chatMichurin.slice(0, i);
        console.log('4)');
        console.log(i, chatForAPI);
    }
    if (chatForAPI.length) {
        /* Вставить дату */
        var today = new Date(currentTime - - 3*3600*1000),
            yesterday = new Date(currentTime - 21*3600*1000),
            todayD = [today.getFullYear(), today.getMonth()+1, today.getDate()].join('/'),
            yesterdayD = [yesterday.getFullYear(), yesterday.getMonth()+1, yesterday.getDate()].join('/'),
            todayT = [
                `${(yesterday.getHours() < 10) ? '0' : ''}${yesterday.getHours()}`,
                `${(yesterday.getMinutes() < 10) ? '0' : ''}${yesterday.getMinutes()}`
            ].join(':');
        var initialDate = (chatForAPI[0].t < todayT) ? todayD : yesterdayD;
        for (let msg of chatForAPI) msg.d = (msg.t <= todayT) ? todayD : yesterdayD;
    }
    if (chatForAPI.length) {
        /* API */
        chatArchive.add(chatForAPI);
    }
};

setInterval(() => API(), 3600_000);