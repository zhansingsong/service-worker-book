/* ******************************** app interaction ********************************* */

const btn = document.querySelector('.box-btn');
const createImg = (url) => `<img class="box-img" src="${url}">`;

btn.addEventListener('click', () => {
    document.querySelector('.box').innerHTML = createImg('./images/wolf.jpg');
}, false);


// btn.addEventListener('mouseenter', () => {
//     btn.querySelector('.animated').classList.remove('infinite');
// }, false);

// btn.addEventListener('mouseleave', () => {
//     btn.querySelector('.animated').classList.add('infinite');
// }, false);

/* ******************************** registeration sw ********************************* */

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(function () { console.log("Service Worker Registered"); });
}