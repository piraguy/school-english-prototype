let recognition, synth = window.speechSynthesis;
let session = {started:false, turn:0, logs:[], lastQuestion:''};
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

  session.lastQuestion = q;
  session.logs.push({type:'question', text:q, turn});
  speak(q);

  setTimeout(() => {
    try {
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento:', err);
      document.getElementById('feedback').innerText = 'Erro ao iniciar microfone. Tente novamente.';
    }
  }, 1500);
}
function handleAnswer(text){
  const turn = session.turn;
  const question = session.lastQuestion || '';
  let fb = '';
  let nextStep = '';

  // Resposta à pergunta "What is your name?"
  if(question.includes('your name')){
    if(text.toLowerCase().includes('my name is') || text.toLowerCase().includes("i'm")){
      fb = 'Nice to meet you! Let’s continue.';
      nextStep = 'What do you like to do at school?';
    } else {
      fb = 'Try saying: My name is…';
    }
  }
  // Resposta à pergunta "How old are you?"
  else if(question.includes('old are you')){
    if(text.match(/\d+/)){
      fb = 'Great! Thanks for sharing.';
      nextStep = 'Can you tell me your favorite subject?';
    } else {
      fb = 'Try saying: I am 10 years old.';
    }
  }
  // Resposta a vocabulário
  else if(question.includes('Say this word')){
    const expected = question.split(':')[1].trim().toLowerCase();
    if(text.toLowerCase().includes(expected)){
      fb = 'Perfect pronunciation!';
    } else {
      fb = 'Let’s try again. Say: ' + expected;
    }
  }
  // Resposta a frases da unidade
  else {
    fb = 'Thanks! Let’s keep going.';
  }

  session.logs.push({type:'answer', text, question, feedback:fb, turn});
  document.getElementById('feedback').innerText = fb;
  speak(fb);
  session.turn++;

  if(nextStep){
    setTimeout(() => {
      session.lastQuestion = nextStep;
      session.logs.push({type:'question', text:nextStep, turn:session.turn});
      speak(nextStep);
      setTimeout(() => {
        try {
          recognition.start();
        } catch (err) {
          console.error('Erro ao iniciar reconhecimento:', err);
        }
      }, 1500);
    }, 3000);
  }

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
