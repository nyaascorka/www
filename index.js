const express = require('express');
const fs = require('fs');
const {chromium} = require('playwright');

/*
    ЗАПУСК СЕРВЕРА
*/

var APP = express();
var PORT = 3000;
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
            fs.writeFileSync(this.name, JSON.stringify(resJSON, null, 2));
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
        var currentMs = new Date(); // Понадобится в 4-м смысловом блоке (ниже)
        var chatMichurin = await page.evaluate( () =>
            [...document.querySelectorAll('#wall > div > span')].toReversed().map( e => {
                var [t,n_m] = e.childNodes;
                t = t.innerHTML.match(/\d\d/g);
                var [n,m] = n_m.textContent.split(/(?<!: .*): /);
                var c = e.style.color.match(/\d{1,3}/g).map(rgb => +rgb);
                if (c[0]+c[1]+c[2] === 0) c = [];
                return {t: 3600*((+t[0]+21) % 24) + 60*t[1], c, n, m};
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
        for (let i=0; lastTimeArchive === chatArchive.JSONAndErr.JSON[i].t; lastIndexArchive = i++) {
            console.log('2)');
            console.log(chatArchive.JSONAndErr.JSON[i].t, i);}

        // Где оно последним есть у Мичурина и сколько повторяется вверх подряд хотя бы по модулю в сутки
        var lastIndexMichurin = chatMichurin.map(msg => msg.t).indexOf(lastTimeArchive);
            console.log('3)');
            console.log(lastIndexMichurin);
        for (let i=lastIndexMichurin; lastTimeArchive === chatMichurin.at(i).t; lastIndexMichurin = i++) {
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
        var currentS = (currentMs - currentMs % 1000)/1000,
            todayT = currentS % 86400,
            todayD = currentS - todayT;
        for (let msg of chatForAPI) msg.d = todayD - (msg.t > todayT) * 86400;
    }
    if (chatForAPI.length) {
        /* API */
        chatArchive.add(chatForAPI);
    }
};

API(); setInterval(() => API(), 1_000_000);

/*

[python]
len_string = 666
string = '2' * string

[c(++)]
int len_string = 666;
char string[len_string] = {};
for (int i=0; i<len_string; i++)
    string[i] = '2';


12 * 2^20 B / (2^2 * 2^5) = 12 * 2^13 = 96 * 10^10

*/