// Protótipo cliente: usa Web Speech API para ASR e TTS e lógica baseada em templates
let recognition, synth = window.speechSynthesis;
let session = {started:false, turn:0, logs:[]};
let unit = null;

// Carrega conteúdo da unidade local (arquivo content/unit.json)
async function loadUnit(){
  try{
    const res = await fetch('content/unit.json');
    unit = await res.json();
  }catch(e){
    unit = {
      title:"Demo Unit",
      vocabulary:["apple","school","teacher"],
      target_phrases:["What is your name?","How old are you?"],
      activities:["greeting","vocab_review","roleplay"]
    };
  }
}
function speak(text){
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.8; // velocidade mais lenta para alunos
  synth.cancel();
  synth.speak(u);
}
function initRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) return null;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = e => {
    const txt = e.results[0][0].transcript;
    document.getElementById('transcript').innerText = txt;
    handleAnswer(txt);
  };
  recognition.onerror = e => {
    console.error('ASR error', e);
    document.getElementById('feedback').innerText = 'Erro ao ouvir sua resposta. Clique Ask Question e tente novamente.';
  };
}
function startSession(){
  session.started = true;
  session.turn = 0;
  session.logs = [];
  document.getElementById('askBtn').disabled = false;
  document.getElementById('endBtn').disabled = false;
  document.getElementById('downloadBtn').disabled = true;
  document.getElementById('feedback').innerText = 'Sessão iniciada. Clique Ask Question para começar.';
}
function endSession(){
  session.started = false;
  document.getElementById('askBtn').disabled = true;
  document.getElementById('endBtn').disabled = true;
  document.getElementById('downloadBtn').disabled = false;
  document.getElementById('feedback').innerText = 'Sessão finalizada. Faça download do relatório se quiser.';
}
function askQuestion(){
  if(!session.started) return;

  if(!recognition){
    document.getElementById('feedback').innerText = 'Reconhecimento de voz não disponível. Use Chrome ou Edge.';
    return;
  }

  const turn = session.turn;
  let q = '';
  if(turn === 0){
    q = unit.target_phrases[0] || 'What is your name?';
  } else if(turn <= unit.vocabulary.length){
    q = 'Say this word: ' + unit.vocabulary[(turn-1) % unit.vocabulary.length];
  } else {
    q = unit.target_phrases[(turn - unit.vocabulary.length) % unit.target_phrases.length] || 'Tell me about your school.';
  }

  session.logs.push({type:'question', text:q, turn});
  speak(q);

  // aguarda 1 segundo antes de iniciar reconhecimento para evitar conflito
  setTimeout(() => {
    try {
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento:', err);
      document.getElementById('feedback').innerText = 'Erro ao iniciar microfone. Tente novamente.';
    }
  }, 1000);
}
function simpleSimilarity(a,b){
  a = a.toLowerCase().replace(/[^a-z\s]/g,'').trim();
  b = b.toLowerCase().replace(/[^a-z\s]/g,'').trim();
  if(!a || !b) return 0;
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  let matches = 0;
  aWords.forEach(w => { if(bWords.includes(w)) matches++; });
  return matches / Math.max(aWords.length, bWords.length);
}
function handleAnswer(text){
  const turn = session.turn;
  let expected = '';
  if(turn === 0) expected = unit.target_phrases[0] || 'What is your name?';
  else if(turn <= unit.vocabulary.length) expected = unit.vocabulary[(turn-1) % unit.vocabulary.length];
  else expected = unit.target_phrases[(turn - unit.vocabulary.length) % unit.target_phrases.length] || '';
  const score = simpleSimilarity(expected, text);
  let fb = '';
  if(score >= 0.7) fb = 'Great! That was clear. Try the next one.';
  else if(score >= 0.4) fb = 'Good effort, try again and speak a bit more clearly.';
  else fb = 'Let\'s repeat slowly together. Listen and repeat.';
  session.logs.push({type:'answer', text, expected, score, turn});
  document.getElementById('feedback').innerText = fb;
  speak(fb);
  session.turn++;
  if(session.turn > 20){
    document.getElementById('feedback').innerText = 'Sessão longa. Chame o tutor humano se necessário.';
    endSession();
  }
}
function downloadReport(){
  const data = JSON.stringify({unit, session, generatedAt: new Date().toISOString()}, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'session-report.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('startBtn').addEventListener('click', startSession);
document.getElementById('askBtn').addEventListener('click', askQuestion);
document.getElementById('endBtn').addEventListener('click', endSession);
document.getElementById('downloadBtn').addEventListener('click', downloadReport);

loadUnit().then(()=> {
  initRecognition();
  document.getElementById('feedback').innerText = 'Unidade carregada: ' + (unit.title || 'Demo Unit');
});
