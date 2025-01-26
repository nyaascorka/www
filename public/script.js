const DQSA = x => document.querySelectorAll(x);
const DATETIME_ELEMENTS = DQSA('#chat .dt.def');
const DATETIMES = [...DATETIME_ELEMENTS].map(dt => +dt.innerHTML);

DQSA('#timeformat > div > label > input').forEach((e,i) => {
    e.onclick = function() {
        console.log(e,i);
        DATETIME_ELEMENTS.forEach((f,j) => {
            switch (i) {
                case 0: f.innerHTML = DATETIMES[j] + ' s'; break;
                case 1:
                    let [Y,M,D,h,m] = new Date(DATETIMES[j] * 1000).toISOString().match(/\d+/g).slice(0,5);
                    f.innerHTML = `${Y}/${M}/${D} ${h}:${m}`;
                    break;
            }
        })

        console.log(e,i);
    }
})