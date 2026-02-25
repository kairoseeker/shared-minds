import { db, rtdb } from './firebase-config.js';

// Firestore — saved drawings (stored as base64 strings, no Storage needed)
import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Realtime Database — live in-progress strokes
import {
  ref as dbRef, push, update, remove,
  onChildAdded, onChildChanged, onChildRemoved, off
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── STATE ───────────────────────────────────────────────────────────────────
let userName     = '';
let myRtdbKey    = null;
let currentEnv   = 'beach';
let currentTool  = 'pen';
let currentColor = '#e63946';
let brushSize    = 6;
let opacity      = 1;
let isDrawing    = false;
let lastX = 0, lastY = 0;
let myLiveTrail  = [];
let liveStrokes  = {};
let savedDrawings = [];
let undoStack    = [];
let redoStack    = [];
const MAX_HISTORY = 30;
let unsubscribeFirestore = null;
let liveRef = null;

// ─── CANVASES ────────────────────────────────────────────────────────────────
const wrapper      = document.getElementById('canvas-wrapper');
const bgCanvas     = document.getElementById('bg-canvas');
const othersCanvas = document.getElementById('others-canvas');
const liveCanvas   = document.getElementById('live-canvas');
const drawCanvas   = document.getElementById('draw-canvas');
const bgCtx        = bgCanvas.getContext('2d');
const othersCtx    = othersCanvas.getContext('2d');
const liveCtx      = liveCanvas.getContext('2d');
const drawCtx      = drawCanvas.getContext('2d');
const tooltip      = document.getElementById('name-tooltip');

function resizeCanvases() {
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  let saved = null;
  if (drawCanvas.width > 0 && drawCanvas.height > 0) {
    saved = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
  }
  [bgCanvas, othersCanvas, liveCanvas, drawCanvas].forEach(c => {
    c.width = w; c.height = h;
  });
  drawBackground();
  renderSaved();
  renderLive();
  if (saved) drawCtx.putImageData(saved, 0, 0);
}

// ─── BACKGROUNDS ─────────────────────────────────────────────────────────────
function drawBackground() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  ({ beach: drawBeach, classroom: drawClassroom, cafe: drawCafe })[currentEnv]
    ?.(bgCtx, bgCanvas.width, bgCanvas.height);
}

function drawBeach(ctx, w, h) {
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, w, h);
  ctx.beginPath(); ctx.arc(w*0.8, h*0.15, 40, 0, Math.PI*2);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, h*0.55); ctx.lineTo(w, h*0.55);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const y = h*0.55 + i*18; ctx.beginPath();
    for (let x = 0; x < w; x += 40) {
      ctx.quadraticCurveTo(x+10, y-6, x+20, y);
      ctx.quadraticCurveTo(x+30, y+6, x+40, y);
    }
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.fillStyle = '#e8e0c8'; ctx.fillRect(0, h*0.7, w, h*0.3);
  ctx.beginPath(); ctx.moveTo(0, h*0.7); ctx.lineTo(w, h*0.7);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "bold 28px 'Nunito', sans-serif";
  ctx.fillStyle = '#ccc'; ctx.fillText('beach', 16, h-16);
}

function drawClassroom(ctx, w, h) {
  ctx.fillStyle = '#f5f5f0'; ctx.fillRect(0, 0, w, h);
  ctx.beginPath(); ctx.moveTo(0, h*0.78); ctx.lineTo(w, h*0.78);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  const [bx,by,bw,bh] = [w*0.15, h*0.08, w*0.7, h*0.38];
  ctx.fillStyle = '#d0d8c8'; ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.strokeRect(bx,by,bw,bh);
  ctx.font = "20px 'Nunito', sans-serif"; ctx.fillStyle = '#888';
  ctx.fillText('welcome :)', bx+20, by+44);
  for (let i = 0; i < 4; i++) {
    const dx = w*0.08+i*(w*0.23), dy = h*0.62;
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(dx,dy,w*0.18,h*0.1);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.strokeRect(dx,dy,w*0.18,h*0.1);
  }
  ctx.font = "bold 28px 'Nunito', sans-serif";
  ctx.fillStyle = '#ccc'; ctx.fillText('classroom', 16, h-16);
}

function drawCafe(ctx, w, h) {
  ctx.fillStyle = '#f5f0ea'; ctx.fillRect(0, 0, w, h);
  ctx.beginPath(); ctx.moveTo(0, h*0.78); ctx.lineTo(w, h*0.78);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.strokeRect(w*0.1, h*0.1, w*0.25, h*0.3);
  ctx.beginPath();
  ctx.moveTo(w*0.225,h*0.1); ctx.lineTo(w*0.225,h*0.4);
  ctx.moveTo(w*0.1,h*0.25);  ctx.lineTo(w*0.35,h*0.25);
  ctx.stroke();
  ctx.fillStyle = '#c8c0b0'; ctx.fillRect(w*0.55,h*0.08,w*0.3,h*0.25);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.strokeRect(w*0.55,h*0.08,w*0.3,h*0.25);
  ctx.font = "16px 'Nunito', sans-serif"; ctx.fillStyle = '#555';
  ctx.fillText('☕ espresso', w*0.57, h*0.17);
  ctx.fillText('🫖 tea',       w*0.57, h*0.23);
  ctx.fillText('🥐 croissant', w*0.57, h*0.29);
  ctx.fillStyle = '#d4c4a8'; ctx.fillRect(w*0.3,h*0.58,w*0.4,h*0.12);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.strokeRect(w*0.3,h*0.58,w*0.4,h*0.12);
  ctx.font = "bold 28px 'Nunito', sans-serif";
  ctx.fillStyle = '#ccc'; ctx.fillText('café', 16, h-16);
}

// ─── RENDER LIVE STROKES ─────────────────────────────────────────────────────
function renderLive() {
  liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  for (const key in liveStrokes) {
    const s = liveStrokes[key];
    if (!s.trail || s.trail.length < 2) continue;
    liveCtx.beginPath();
    liveCtx.moveTo(s.trail[0][0], s.trail[0][1]);
    for (let i = 1; i < s.trail.length; i++) {
      liveCtx.lineTo(s.trail[i][0], s.trail[i][1]);
    }
    liveCtx.strokeStyle = s.color || '#000';
    liveCtx.lineWidth   = s.size  || 4;
    liveCtx.globalAlpha = s.opacity || 1;
    liveCtx.lineCap     = 'round';
    liveCtx.lineJoin    = 'round';
    liveCtx.stroke();
    if (s.name) {
      liveCtx.globalAlpha = 1;
      liveCtx.font = "bold 14px 'Nunito', sans-serif";
      liveCtx.fillStyle = s.color || '#000';
      const tip = s.trail[s.trail.length - 1];
      liveCtx.fillText(s.name, tip[0] + 8, tip[1] - 6);
    }
    liveCtx.globalAlpha = 1;
  }
}

// ─── RENDER SAVED DRAWINGS ───────────────────────────────────────────────────
// Drawings are stored as base64 strings in Firestore.
// We create an Image object from the base64 and draw it onto the canvas.
function renderSaved() {
  othersCtx.clearRect(0, 0, othersCanvas.width, othersCanvas.height);
  for (const d of savedDrawings) {
    othersCtx.drawImage(d.img, d.x, d.y, d.width, d.height);
  }
}

// ─── SUBSCRIBE TO ENVIRONMENT ────────────────────────────────────────────────
function subscribeToEnvironment(env) {
  if (unsubscribeFirestore) { unsubscribeFirestore(); unsubscribeFirestore = null; }
  if (liveRef) { off(liveRef); liveRef = null; }
  if (myRtdbKey) {
    remove(dbRef(rtdb, `liveStrokes/${currentEnv}/${myRtdbKey}`));
    myRtdbKey = null;
  }
  savedDrawings = [];
  liveStrokes   = {};
  renderSaved();
  renderLive();

  // Firestore: load saved drawings for this environment
  const q = query(
    collection(db, 'drawings'),
    where('environment', '==', env)
  );
  unsubscribeFirestore = onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        // base64 string → Image object
        const img = new Image();
        img.onload = () => {
          if (!savedDrawings.some(d => d.id === change.doc.id)) {
            savedDrawings.push({
              id: change.doc.id,
              name: data.name,
              x: data.x, y: data.y,
              width: data.width, height: data.height,
              img
            });
            renderSaved();
          }
        };
        img.src = data.imageData; // imageData is the base64 string
      }
      if (change.type === 'removed') {
        savedDrawings = savedDrawings.filter(d => d.id !== change.doc.id);
        renderSaved();
      }
    });
  });

  // Realtime DB: live strokes for this environment
  liveRef = dbRef(rtdb, `liveStrokes/${env}`);
  onChildAdded(liveRef, snap => {
    if (snap.key === myRtdbKey) return;
    liveStrokes[snap.key] = snap.val(); renderLive();
  });
  onChildChanged(liveRef, snap => {
    if (snap.key === myRtdbKey) return;
    liveStrokes[snap.key] = snap.val(); renderLive();
  });
  onChildRemoved(liveRef, snap => {
    delete liveStrokes[snap.key]; renderLive();
  });
}

// ─── PUSH LIVE STROKE ────────────────────────────────────────────────────────
function pushLiveStroke() {
  const data = {
    name:    userName,
    color:   currentTool === 'eraser' ? '#f0f0f0' : currentColor,
    size:    currentTool === 'pencil' ? brushSize * 0.7 : brushSize,
    opacity: currentTool === 'pencil' ? opacity * 0.45 : opacity,
    trail:   myLiveTrail
  };
  if (myRtdbKey) {
    update(dbRef(rtdb, `liveStrokes/${currentEnv}/${myRtdbKey}`), data);
  } else {
    myRtdbKey = push(dbRef(rtdb, `liveStrokes/${currentEnv}`), data).key;
  }
}

function clearMyLiveStroke() {
  myLiveTrail = [];
  if (myRtdbKey) {
    remove(dbRef(rtdb, `liveStrokes/${currentEnv}/${myRtdbKey}`));
    myRtdbKey = null;
  }
}

// ─── SAVE DRAWING ────────────────────────────────────────────────────────────
async function saveDrawing() {
  const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
  const bounds    = getDrawingBounds(imageData);
  if (!bounds) { alert("draw something first!"); return; }

  const btn = document.getElementById('save-btn');
  btn.textContent = 'saving…'; btn.disabled = true;

  const { minX, minY, maxX, maxY } = bounds;
  const pad  = 10;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(drawCanvas.width  - cropX, maxX - minX + pad * 2);
  const cropH = Math.min(drawCanvas.height - cropY, maxY - minY + pad * 2);

  // Crop to a small offscreen canvas, then convert to base64
  const off = document.createElement('canvas');
  off.width = cropW; off.height = cropH;
  off.getContext('2d').drawImage(drawCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // toDataURL gives us a base64 PNG string — no Storage needed
  const imageDataBase64 = off.toDataURL('image/png');

  // Save everything directly to Firestore
  await addDoc(collection(db, 'drawings'), {
    name:        userName,
    environment: currentEnv,
    imageData:   imageDataBase64,  // the full base64 string
    x:           cropX,
    y:           cropY,
    width:       cropW,
    height:      cropH,
    timestamp:   serverTimestamp()
  });

  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  undoStack = []; redoStack = []; updateHistoryButtons();
  btn.textContent = 'save ✓'; btn.disabled = false;
  alert(`saved! your drawing is now part of the ${currentEnv} :)`);
}

function getDrawingBounds(imageData) {
  const { data, width, height } = imageData;
  let minX=width, minY=height, maxX=0, maxY=0, found=false;
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    if (data[(y*width+x)*4+3] > 0) {
      minX=Math.min(minX,x); minY=Math.min(minY,y);
      maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); found=true;
    }
  }
  return found ? {minX,minY,maxX,maxY} : null;
}

// ─── UNDO / REDO ─────────────────────────────────────────────────────────────
function pushHistory() {
  undoStack.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
  drawCtx.putImageData(undoStack.pop(), 0, 0);
  updateHistoryButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
  drawCtx.putImageData(redoStack.pop(), 0, 0);
  updateHistoryButtons();
}
function updateHistoryButtons() {
  document.getElementById('btn-undo').disabled = undoStack.length === 0;
  document.getElementById('btn-redo').disabled = redoStack.length === 0;
}

// ─── DRAWING ─────────────────────────────────────────────────────────────────
function getPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return [cx - rect.left, cy - rect.top];
}

function startDraw(e) {
  isDrawing = true;
  [lastX, lastY] = getPos(e);
  myLiveTrail = [[lastX, lastY]];
  pushHistory();
}

function draw(e) {
  if (!isDrawing) return;
  const [x, y] = getPos(e);

  drawCtx.lineWidth  = currentTool === 'pencil' ? brushSize * 0.7 : brushSize;
  drawCtx.lineCap    = 'round';
  drawCtx.lineJoin   = 'round';

  if (currentTool === 'eraser') {
    drawCtx.globalAlpha = 1;
    drawCtx.globalCompositeOperation = 'destination-out';
    drawCtx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    drawCtx.globalCompositeOperation = 'source-over';
    drawCtx.strokeStyle = currentColor;
    drawCtx.globalAlpha = currentTool === 'pencil' ? opacity * 0.45 : opacity;
  }

  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(x, y);
  drawCtx.stroke();
  [lastX, lastY] = [x, y];

  myLiveTrail.push([x, y]);
  if (myLiveTrail.length % 3 === 0) pushLiveStroke();
}

function stopDraw() {
  if (!isDrawing) return;
  isDrawing = false;
  drawCtx.globalCompositeOperation = 'source-over';
  drawCtx.globalAlpha = 1;
  pushLiveStroke();
  setTimeout(clearMyLiveStroke, 200);
}

// ─── HOVER TOOLTIP ───────────────────────────────────────────────────────────
wrapper.addEventListener('mousemove', e => {
  const rect = wrapper.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const found = savedDrawings.find(d =>
    mx >= d.x && mx <= d.x + d.width && my >= d.y && my <= d.y + d.height
  );
  if (found) {
    tooltip.style.display = 'block';
    tooltip.style.left = (mx + 14) + 'px';
    tooltip.style.top  = (my + 14) + 'px';
    tooltip.textContent = found.name;
  } else {
    tooltip.style.display = 'none';
  }
});

// ─── TOOLBAR ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.tool-btn[id^="tool-"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn[id^="tool-"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.id.replace('tool-', '');
  });
});

document.querySelectorAll('.swatch').forEach(s => {
  s.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(sw => sw.classList.remove('active'));
    s.classList.add('active');
    currentColor = s.dataset.color;
    currentTool  = 'pen';
    document.querySelectorAll('.tool-btn[id^="tool-"]').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-pen').classList.add('active');
  });
});

document.getElementById('custom-color').addEventListener('input', e => {
  currentColor = e.target.value;
  currentTool  = 'pen';
  document.querySelectorAll('.tool-btn[id^="tool-"]').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-pen').classList.add('active');
});

document.getElementById('brush-size').addEventListener('input',    e => { brushSize = parseInt(e.target.value); });
document.getElementById('opacity-slider').addEventListener('input', e => { opacity   = parseFloat(e.target.value); });

document.getElementById('clear-btn').addEventListener('click', () => {
  pushHistory();
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
});
document.getElementById('save-btn').addEventListener('click', saveDrawing);
document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);

window.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='z'))) { e.preventDefault(); redo(); }
});

// ─── ENVIRONMENT SWITCHING ───────────────────────────────────────────────────
document.querySelectorAll('.env-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentEnv = btn.dataset.env;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    undoStack = []; redoStack = []; updateHistoryButtons();
    drawBackground();
    subscribeToEnvironment(currentEnv);
  });
});

drawCanvas.addEventListener('mousedown', startDraw);
drawCanvas.addEventListener('mousemove', draw);
drawCanvas.addEventListener('mouseup',   stopDraw);
drawCanvas.addEventListener('mouseleave', stopDraw);
window.addEventListener('resize', resizeCanvases);

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  userName = prompt("what's your name?")?.trim() || 'anonymous';
  resizeCanvases();
  updateHistoryButtons();
  subscribeToEnvironment(currentEnv);
}

init();
