// simon says
const BUTTONS = 3;
const INTERVAL = 1050;

let orderArr = [1,2,3];
let timeOfPlay = 0;

for(let i=BUTTONS;i>0;i--) {
    let button = document.createElement('button');
    button.dataset.index = i;
    document.body.appendChild(button);
}

document.body.addEventListener('keypress', (evt) => {
    switch(evt.key) {
    case 'z':
        clickHandler(1)
        break;
    case 'x':
        clickHandler(2)
        break;
    case 'c':
        clickHandler(3);
        break;
    default:
        break;
    }
});

document.body.addEventListener('click', (el) => {
    let idx = el.target.dataset.index;
    clickHandler(idx);
});

function clickHandler(idx) {
    lightButton(idx);
   
    if (idx == orderArr[timeOfPlay]) {
        timeOfPlay++;
        
        if (timeOfPlay == orderArr.length) {
            drawScore(timeOfPlay);
            setTimeout(() => addNewMoves(orderArr), 1200);
        }
    } else {
        endGame();
        return false;
    }
}

function randomButton() {
    let max = BUTTONS;
    let min = 0;
    return Math.floor(Math.random() * (max - min) + 1);
}

// startGame for amount of orders
// first time play, push to the array.
function startGame(order=0) {
    timeOfPlay = 0;
    drawScore(0);
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
    document.body.classList.add('failed');

    setTimeout(()=> {
        document.body.classList.remove('failed');
        orderArr = [1,2,3];
        drawScore(0);
        setTimeout(startGame(), 1600);
    }, 1500);
    
}

function lightButton(index, speed=200) {
    let button = document.querySelectorAll(`[data-index="${index}"]`)[0];
    button.classList.toggle('active');

    setTimeout(() => {
        button.classList.toggle('active');
    }, speed);
}

setTimeout(() => {
    startGame();
}, 1200);

const scoreKeeper = document.createElement('div');
scoreKeeper.classList.add('score');
scoreKeeper.innerHTML = "0";
document.body.appendChild(scoreKeeper);

function drawScore(score=0) {
    let keeper = document.querySelector('.score');
    keeper.classList.toggle('updated');
    keeper.innerHTML = score;

    setTimeout(()=> {
        keeper.classList.toggle('updated');
    }, 100);
}
