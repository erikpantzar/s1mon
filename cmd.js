// simon says

// 3 buttons
// that make light in order
// identifier

// [0,0,0]  // none was pressed
// [1,0,0] // first was pressed
// [0,1,0] // second was pressed

// amount of buttons
const BUTTONS = 3;
const INTERVAL = 900;

for(let i=BUTTONS;i>0;i--) {
    let button = document.createElement('button');
    button.classList.add(`btn-simon-${i}`);
    button.dataset.index = i;
    document.body.appendChild(button);
}


let order = 0;
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
        console.log('false');
        endGame();
        return false;
    }

    console.log(orderArr.length);
    console.log(timeOfPlay);
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
    console.log('startgame');
    if (order < orderArr.length) {
        playMoves(orderArr);
    }
}

function addNewMoves(arr) {
    timeOfPlay = 0;
    playMoves(arr);
    
    console.log('adding the new move');
    let index = randomButton();
    console.log('pre timeout', INTERVAL*orderArr.length);
    setTimeout(() => {
        console.log('adding new');
        lightButton(index);
        orderArr.push(index);
    }, INTERVAL * orderArr.length);
}

function playMoves(arr) {
    timeOfPlay = 0;
    console.log('Playing the moves');
    if(arr.length>0) {
        let index = arr[0];
        lightButton(index);
        setTimeout(() => {
            playMoves(arr.slice(1));
        }, INTERVAL);
    }
}

startGame();

function endGame() {
    order = [];
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
