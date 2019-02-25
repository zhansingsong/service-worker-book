/* ******************************** app interaction ********************************* */

const btn = document.querySelector('.btn');
const img = document.querySelector('.img');
const IMAGES = ['/images/fox.jpg', '/images/husky.jpg', '/images/husky2.jpg', '/images/wolf.jpg']
const timeStamp = () => {
    const date = new Date();
    return [date.getHours(), date.getMinutes(), date.getSeconds()].join(':')
}

btn.addEventListener('click', () => {
    const currentImgIndex = img.currentImgIndex || 0;
    const nextImgIndex = currentImgIndex === 3 ? 0 : currentImgIndex + 1;
    img.src = IMAGES[currentImgIndex];
    img.currentImgIndex = nextImgIndex;
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
    

    const txtarea = document.querySelector('.txtarea');
    navigator.serviceWorker.addEventListener('message', function (e) {
        txtarea.value = txtarea.value + timeStamp() + '\n' + e.data + '\n\n';
        })
}