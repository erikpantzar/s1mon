import 'whatwg-fetch';

const API = 'https://h1score.herokuapp.com/api';
//const API = "http://localhost:8080/api";

let hiscoreContainer = document.createElement('section');
hiscoreContainer.classList.add('hiscores');
document.body.appendChild(hiscoreContainer);

const hiscore = {
    getScores: ()=> {
        fetch(`${API}/h1score`)
            .then((res)=> res.json())
            .then((hiscores)=> {
                hiscoreContainer.innerHTML = "";
                hiscore.scoreHandler(hiscores);
            });
    },
    scoreHandler: (scores)=> {
        scores.forEach((score)=> {
            let item = document.createElement('div');
            item.classList.add('hiscores-score');
            item.innerHTML = `
                       <span class="result">${score.score}</span>
                       <span class="name">${score.name}</span>
                      <span class="time">${score.time}</span>
          `;
            hiscoreContainer.appendChild(item);
        })
    }
};

setInterval(hiscore.getScores, 25000);
hiscore.getScores();

export default hiscore;
