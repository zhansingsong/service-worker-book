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

function notifyMe() {
    // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
        alert("This browser does not support system notifications");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        var notification = new Notification("Hi there!");
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            // If the user accepts, let's create a notification
            if (permission === "granted") {
                var notification = new Notification("Hi there!");
            }
        });
    }
    // Finally, if the user has denied notifications and you 
    // want to be respectful there is no need to bother them any more.
}

// btn.addEventListener('mouseenter', () => {
//     btn.querySelector('.animated').classList.remove('infinite');
// }, false);

// btn.addEventListener('mouseleave', () => {
//     btn.querySelector('.animated').classList.add('infinite');
// }, false);

/* ******************************** registeration sw ********************************* */

if ('serviceWorker' in navigator) {
    notifyMe();
    navigator.serviceWorker
        .register('/sw.js')
        .then(function () { console.log("Service Worker Registered"); });


    const txtarea = document.querySelector('.txtarea');
    navigator.serviceWorker.addEventListener('message', function (e) {
        txtarea.value = txtarea.value + timeStamp() + '\n' + e.data + '\n\n';
    })
}