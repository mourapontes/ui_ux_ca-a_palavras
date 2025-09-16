console.log("Script carregado");
const fases = [
  {tema: "Avaliação de Produtos", palavras: ["CLAREZA","FUNCIONALIDADE","USUARIO","CONSISTENCIA"]},
  {tema: "Familiaridade", palavras: ["LIXEIRA","BUSCAR","FECHAR"]},
  {tema: "Visibilidade", palavras: ["BOTOES","MENUS","ACESSO"]},
  {tema: "Consistência", palavras: ["PADROES","IDENTIDADE","LAYOUT"]},
  {tema: "Intuição", palavras: ["BOTAO","CLICAR","ALAVANCA"]},
  {tema: "Cores", palavras: ["VERDE","VERMELHO","AZUL","AMARELO"]},
  {tema: "Duolingo", palavras: ["CORES","MOTIVACAO","ICONE"]},
  {tema: "Netflix", palavras: ["LAYOUT","SERIES","FILMES","SINOPSE"]},
  {tema: "ClickJogos", palavras: ["USABILIDADE","PROBLEMA","INCONSISTENCIA"]},
  {tema: "Steam", palavras: ["NAVEGACAO","CAPAS","COMUNIDADE","SOCIAL"]},
];

let faseAtual = 0;
let gridSize = 12; // será ajustado dinamicamente por fase
const gridEl = document.getElementById("grid");
const wordsEl = document.getElementById("words");
const btnNext = document.getElementById("next");
const feedbackEl = document.getElementById("feedback");
const progressEl = document.getElementById("progress");
const progressTextEl = document.getElementById("progress-text");

let gridData = [];
let selecionadas = [];
let palavrasEncontradas = [];
let arrastando = false;
let listenersBound = false;

function tentarConstruirGrid(palavras){
  // retorna uma grade preenchida com as palavras (permitindo cruzamentos) ou null se não couber
  // Ordena por tamanho desc para facilitar encaixes
  const ordenadas = [...palavras].map(p=>p.toUpperCase()).sort((a,b)=>b.length-a.length);
  const tmp = Array.from({length: gridSize}, () => Array(gridSize).fill(""));
  for(const palavra of ordenadas){
    let colocado = false;
    let tentativas = 0;
    const maxTentativas = 1200;
    while(!colocado && tentativas < maxTentativas){
      const horizontal = Math.random() < 0.5;
      const dir = horizontal ? "H" : "V";
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      let podeColocar = true;
      if(dir === "H"){
        if(x + palavra.length > gridSize){ tentativas++; continue; }
        for(let i=0;i<palavra.length;i++){
          const letraAtual = tmp[y][x+i];
          if(letraAtual !== "" && letraAtual !== palavra[i]){ podeColocar = false; break; }
        }
        if(podeColocar){
          for(let i=0;i<palavra.length;i++) tmp[y][x+i] = palavra[i];
          colocado = true;
        }
      } else {
        if(y + palavra.length > gridSize){ tentativas++; continue; }
        for(let i=0;i<palavra.length;i++){
          const letraAtual = tmp[y+i][x];
          if(letraAtual !== "" && letraAtual !== palavra[i]){ podeColocar = false; break; }
        }
        if(podeColocar){
          for(let i=0;i<palavra.length;i++) tmp[y+i][x] = palavra[i];
          colocado = true;
        }
      }
      tentativas++;
    }
    if(!colocado){
      return null; // falhou em posicionar alguma palavra
    }
  }
  return tmp;
}

function renderizarGrid(){
  gridEl.innerHTML = "";
  selecionadas = [];
  palavrasEncontradas = [];
  // ajustar o CSS da grid para o novo tamanho
  gridEl.style.setProperty('--grid-size', gridSize);

  // preencher espaços vazios com letras aleatórias e criar células
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let y=0;y<gridSize;y++){
    for(let x=0;x<gridSize;x++){
      if(gridData[y][x] === "") gridData[y][x] = letras[Math.floor(Math.random()*letras.length)];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = gridData[y][x];
      cell.dataset.x = x;
      cell.dataset.y = y;
      // Eventos de seleção por arrasto com Pointer Events (funciona para mouse e touch)
      cell.addEventListener("pointerdown", iniciarSelecao);
      cell.addEventListener("pointerenter", continuarSelecao);
      gridEl.appendChild(cell);
    }
  }
  // Eventos globais: bind apenas uma vez
  if(!listenersBound){
    document.addEventListener("pointerup", finalizarSelecao);
    document.addEventListener("keydown", (e) => {
      if(e.key === 'Escape') limparSelecaoTemporaria();
      if((e.key === 'Enter' || e.key === ' ') && selecionadas.length > 1) validarSelecao();
    });
    // Evita contexto/seleção acidental
    gridEl.addEventListener('contextmenu', (e)=> e.preventDefault());
    gridEl.addEventListener('pointerleave', () => { if(arrastando) finalizarSelecao(); });
    listenersBound = true;
  }
}

function gerarGrade(palavras){
  const palavrasUpper = palavras.map(p=>p.toUpperCase());
  // basear o tamanho da grade no maior tamanho de palavra (com folga)
  const maior = Math.max(...palavrasUpper.map(p=>p.length));
  const base = Math.max(12, maior + 1);
  let sucesso = false;
  for(let size = base; size <= base + 6 && !sucesso; size++){
    gridSize = size;
    const tentativa = tentarConstruirGrid(palavrasUpper);
    if(tentativa){
      gridData = tentativa;
      sucesso = true;
    }
  }
  if(!sucesso){
    // como fallback, usa uma grade maior
    gridSize = base + 8;
    const tentativa = tentarConstruirGrid(palavrasUpper);
    if(tentativa){
      gridData = tentativa;
    } else {
      console.warn("Falha ao montar a grade mesmo com expansão");
      // ainda assim segue com grid vazia para não travar
      gridData = Array.from({length: gridSize}, () => Array(gridSize).fill(""));
    }
  }
  wordsEl.innerHTML = `<b>Fase ${faseAtual+1}: ${fases[faseAtual].tema}</b><br>Palavras: ${palavras.join(", ")}`;
  renderizarGrid();
}

function marcarCelula(cell){
  if(!cell || !cell.classList.contains('cell')) return;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);
  const id = `${x},${y}`;
  if(!selecionadas.includes(id)){
    selecionadas.push(id);
    cell.classList.add("selected");
  }
}

function iniciarSelecao(e){
  e.preventDefault();
  arrastando = true;
  // limpar seleção anterior
  selecionadas = [];
  Array.from(gridEl.children).forEach(c => c.classList.remove('selected'));
  marcarCelula(e.target);
}

function continuarSelecao(e){
  if(!arrastando) return;
  e.preventDefault();
  marcarCelula(e.target);
}

function finalizarSelecao(){
  if(!arrastando) return;
  arrastando = false;
  validarSelecao();
}

function validarSelecao(){
  // Sem seleção suficiente
  if(selecionadas.length < 2){ limparSelecaoTemporaria(); return; }
  const coords = selecionadas.map(s => s.split(',').map(Number));
  const xs = coords.map(c=>c[0]);
  const ys = coords.map(c=>c[1]);
  let palavra = '';
  let pathIds = [];
  if(xs.every(x=>x===xs[0])){
    // mesma coluna
    const col = xs[0];
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    for(let y=minY;y<=maxY;y++){ palavra += gridData[y][col]; pathIds.push(`${col},${y}`); }
  } else if(ys.every(y=>y===ys[0])){
    // mesma linha
    const row = ys[0];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    for(let x=minX;x<=maxX;x++){ palavra += gridData[row][x]; pathIds.push(`${x},${row}`); }
  } else {
    feedbackEl && (feedbackEl.textContent = 'Selecione em linha reta.');
    limparSelecaoTemporaria();
    return;
  }
  const palavraUp = palavra.toUpperCase();
  const palavrasFase = fases[faseAtual].palavras.map(p=>p.toUpperCase());
  const palavraRev = palavraUp.split('').reverse().join('');
  let match = null;
  if(palavrasFase.includes(palavraUp)) match = palavraUp;
  else if(palavrasFase.includes(palavraRev)) match = palavraRev;
  if(match && !palavrasEncontradas.includes(match)){
    palavrasEncontradas.push(match);
    const orderedPath = (match === palavraUp) ? pathIds : [...pathIds].reverse();
    animarCaminho(orderedPath);
    feedbackEl && (feedbackEl.textContent = `✓ ${match} encontrada!`);
    atualizarPalavrasEncontradas();
    atualizarProgresso();
  } else {
    feedbackEl && (feedbackEl.textContent = 'Tente novamente.');
    limparSelecaoTemporaria();
  }
}

function destacarSelecionadasComoFound(){
  selecionadas.forEach(s => {
    const [x,y] = s.split(',').map(Number);
    const idx = y*gridSize + x;
    const c = gridEl.children[idx];
    c.classList.remove('selected');
    c.classList.add('found');
  });
  selecionadas = [];
}

function limparSelecaoTemporaria(){
  Array.from(gridEl.children).forEach(c => c.classList.remove('selected'));
  selecionadas = [];
}

function animarCaminho(path){
  // limpar seleção visual antes da animação
  Array.from(gridEl.children).forEach(c => c.classList.remove('selected'));
  selecionadas = [];
  path.forEach((id, i) => {
    setTimeout(() => {
      const [x,y] = id.split(',').map(Number);
      const idx = y*gridSize + x;
      const cell = gridEl.children[idx];
      if(cell){ cell.classList.add('found'); }
    }, i * 70);
  });
}

function atualizarPalavrasEncontradas(){
  let palavrasFase = fases[faseAtual].palavras;
  let html = `<b>Fase ${faseAtual+1}: ${fases[faseAtual].tema}</b><br>Palavras: `;
  html += palavrasFase.map(p => palavrasEncontradas.includes(p.toUpperCase()) ? `<span style='color:green;font-weight:bold'>${p}</span>` : p).join(", ");
  wordsEl.innerHTML = html;
}

function atualizarProgresso(){
  const total = fases[faseAtual].palavras.length;
  const done = palavrasEncontradas.length;
  const pct = Math.round((done/total)*100);
  if(progressEl){ progressEl.style.width = `${Math.max(5, pct)}%`; }
  if(progressTextEl){ progressTextEl.textContent = `Fase ${faseAtual+1} de ${fases.length} · ${done}/${total}`; }
  btnNext.disabled = done !== total;
  if(done === total && feedbackEl){ feedbackEl.textContent = 'Fase concluída!'; }
}

function iniciarFase(){
  gerarGrade(fases[faseAtual].palavras);
  if(faseAtual === fases.length-1) btnNext.textContent = "🏆 Finalizar";
  atualizarProgresso();
}

btnNext.addEventListener("click", () => {
  if(faseAtual < fases.length-1){
    faseAtual++;
    iniciarFase();
  } else {
    alert("Parabéns! Você concluiu todas as fases! 🏆");
  }
});

iniciarFase();
