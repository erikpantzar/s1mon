import simon from './simon';
import 'whatwg-fetch';


const API = 'https://h1score.herokuapp.com/api'

fetch(`${API}/h1score`)
   .then((response)=>{
           console.log('response', response);
 });


simon.init();
simon.startGame();