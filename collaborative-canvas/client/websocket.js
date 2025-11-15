const socket = io();
const WS={on(e,h){socket.on(e,h)},emit(e,p){socket.emit(e,p)}};
window.WS=WS;