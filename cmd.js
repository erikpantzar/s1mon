// simon says
const BUTTONS = 3;
const INTERVAL = 1050;

for(let i=BUTTONS;i>0;i--) {
    let button = document.createElement('button');
    button.classList.add(`btn-simon-${i}`);
    button.dataset.index = i;
    document.body.appendChild(button);
}

let orderArr = [1,2,3];
let timeOfPlay = 0;

document.body.addEventListener('click', (el) => {
    let idx = el.target.dataset.index;
    
    if (idx == orderArr[timeOfPlay]) {
        timeOfPlay++;
       
        if (timeOfPlay == orderArr.length) {
           addNewMoves(orderArr);
        }
    } else {
        endGame();
        return false;
    }
});

function randomButton() {
    let max = BUTTONS;
    let min = 0;
    return Math.floor(Math.random() * (max - min) + 1);
}

// startGame for amount of orders
// first time play, push to the array.
function startGame(order=0) {
    timeOfPlay = 0;
    if (order < orderArr.length) {
        playMoves(orderArr);
    }
}

function addNewMoves(arr) {
    timeOfPlay = 0;
    playMoves(arr);
    
    let index = randomButton();
    setTimeout(() => {
        lightButton(index);
        orderArr.push(index);
    }, (INTERVAL * orderArr.length) + 300);
}

function playMoves(arr) {
    timeOfPlay = 0;
    if(arr.length>0) {
        let index = arr[0];
        lightButton(index);
        setTimeout(() => {
            playMoves(arr.slice(1));
        }, INTERVAL);
    }
}

function endGame() {
    orderArr = [];
    timeOfPlay = 0;
    setTimeout(startGame(), 5000);
}

function lightButton(index) {
    let button = document.querySelectorAll(`[data-index="${index}"]`)[0];
    button.classList.toggle('active');

    setTimeout(() => {
        button.classList.toggle('active');
    }, 500);
}


startGame();
