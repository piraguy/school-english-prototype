let recognition, synth = window.speechSynthesis;
let session = {started:false, turn:0, logs:[], lastQuestion:'', mode:'unit'};
let unit = null;

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
  u.rate = 0.8;
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
    const txt = e.results[0][0].transcript.trim();
    document.getElementById('transcript').innerText = txt || '—';
    if(txt){
      handleAnswer(txt);
    } else {
      document.getElementById('feedback').innerText = 'I didn’t hear you. Let’s try again.';
      speak('I didn’t hear you. Let’s try again.');
    }
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
  session.mode = 'unit';
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

  const q = getNextQuestion();
  session.lastQuestion = q;
  session.logs.push({type:'question', text:q, turn:session.turn});
  speak(q);

  setTimeout(() => {
    try {
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento:', err);
      document
