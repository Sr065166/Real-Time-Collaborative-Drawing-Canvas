// client/canvas.js
// Simple but robust canvas drawing + WS hooks (works locally even if WS undefined)

(function(){
  const canvas = document.getElementById('draw');
  const ctx = canvas.getContext('2d', { alpha: true });

  // size canvas to fill parent
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    redrawAll();
  }
  window.addEventListener('resize', resize);
  // ensure the container has size before initial resize
  setTimeout(resize, 50);

  // tools & ui
  const colorInput = document.getElementById('color');
  const widthInput = document.getElementById('width');
  const toolEraser = document.getElementById('tool-eraser');
  const toolBrush = document.getElementById('tool-brush');

  // op model: { id, clientId, type: 'stroke'|'erase', color, width, points: [{x,y}] }
  let history = []; // authoritative local history (will also be replaced by server history events)
  let undone = [];

  // drawing state
  let drawing = false;
  let currentOp = null;
  let lastSentAt = 0;

  // helpers
  function getPointerPos(evt){
    const r = canvas.getBoundingClientRect();
    return { x: evt.clientX - r.left, y: evt.clientY - r.top };
  }

  function makeOp(){
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      clientId: null,
      type: toolEraser.checked ? 'erase' : 'stroke',
      color: colorInput.value || '#000',
      width: Number(widthInput.value) || 4,
      points: [],
      timestamp: Date.now()
    };
  }

  function drawOpToContext(ctxRef, op){
    if(!op || !op.points || op.points.length===0) return;
    ctxRef.save();
    if(op.type === 'erase'){
      ctxRef.globalCompositeOperation = 'destination-out';
      ctxRef.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctxRef.globalCompositeOperation = 'source-over';
      ctxRef.strokeStyle = op.color;
    }
    ctxRef.lineWidth = op.width;
    ctxRef.lineJoin = 'round';
    ctxRef.lineCap = 'round';

    const pts = op.points;
    ctxRef.beginPath();
    ctxRef.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++){
      const prev = pts[i-1], cur = pts[i];
      const midx = (prev.x + cur.x) / 2;
      const midy = (prev.y + cur.y) / 2;
      ctxRef.quadraticCurveTo(prev.x, prev.y, midx, midy);
    }
    ctxRef.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    ctxRef.stroke();
    ctxRef.restore();
  }

  function redrawAll(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const op of history){
      drawOpToContext(ctx, op);
    }
  }

  // websocket hook helper (if WS exists)
  function wsEmit(event, payload){
    if(window.WS && typeof window.WS.emit === 'function'){
      try { window.WS.emit(event, payload); } catch(e){ /*ignore*/ }
    }
  }

  // pointer events
  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    currentOp = makeOp();
    const p = getPointerPos(e);
    currentOp.points.push(p);
    // optimistic preview: draw current stroke on top
    redrawAll();
    drawOpToContext(ctx, currentOp);
    // send initial partial
    wsEmit('draw-partial', { opId: currentOp.id, points: currentOp.points.slice() });
    lastSentAt = Date.now();
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    const pos = getPointerPos(e);
    // send cursor updates for others (non-blocking)
    wsEmit('cursor', { x: pos.x, y: pos.y });
    if(!drawing || !currentOp) return;
    currentOp.points.push(pos);
    // incremental draw: redraw base history then current stroke
    redrawAll();
    drawOpToContext(ctx, currentOp);

    // throttle partial sends (~60ms)
    if(Date.now() - lastSentAt > 60){
      wsEmit('draw-partial', { opId: currentOp.id, points: currentOp.points.slice() });
      lastSentAt = Date.now();
    }
  });

  canvas.addEventListener('pointerup', e => {
    if(!drawing || !currentOp) return;
    drawing = false;
    canvas.releasePointerCapture(e.pointerId);

    // finalize op
    history.push(currentOp);
    undone = []; // clear redo stack
    wsEmit('draw-complete', { op: currentOp });
    redrawAll();
    currentOp = null;
  });

  canvas.addEventListener('pointercancel', e => {
    drawing = false;
    currentOp = null;
  });

  // keyboard undo/redo shortcuts for convenience
  window.addEventListener('keydown', ev => {
    if((ev.ctrlKey || ev.metaKey) && ev.key === 'z'){
      ev.preventDefault();
      doUndo();
    } else if((ev.ctrlKey || ev.metaKey) && (ev.key === 'y' || (ev.shiftKey && ev.key === 'Z'))){
      ev.preventDefault();
      doRedo();
    }
  });

  // send undo request to server and wait for authoritative 'history' event
function doUndo(){
  // only send request; server will broadcast updated history
  wsEmit('undo');
}

// send redo request to server and wait for authoritative 'history' event
function doRedo(){
  wsEmit('redo');
}

  // hook up toolbar buttons (if present)
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  if(undoBtn) undoBtn.addEventListener('click', doUndo);
  if(redoBtn) redoBtn.addEventListener('click', doRedo);

  // receive server-sent state updates (if WS is present)
  if(window.WS && typeof window.WS.on === 'function'){
    WS.on('init', data => {
      if(data && data.roomState && Array.isArray(data.roomState.history)){
        history = data.roomState.history.slice();
        undone = [];
        redrawAll();
      }
    });
    WS.on('peer-draw', payload => {
      if(payload && payload.op){
        history.push(payload.op);
        redrawAll();
      }
    });
   WS.on('history', payload => {
  if(payload && Array.isArray(payload.ops)){
    history = payload.ops.slice();
    // don't clear client's undo/redo stacks blindly; server is authoritative
    // If you want to fully trust server, you could also set undone=[] here,
    // but that was causing the redo bug. For now, just redraw from server.
    redrawAll();
  }
});

  }

  // expose for debugging
  window._CanvasState = { getHistory: ()=>history, redoStack: ()=>undone };

  // initial draw
  redrawAll();
})();
