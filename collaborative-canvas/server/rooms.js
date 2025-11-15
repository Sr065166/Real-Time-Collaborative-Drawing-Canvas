class RoomManager{
 constructor(){this.rooms=new Map()}
 _r(id){if(!this.rooms.has(id))this.rooms.set(id,{users:new Set(),history:[],undone:[]});return this.rooms.get(id)}
 join(id,c){this._r(id).users.add(c)}
 leave(id,c){this._r(id).users.delete(c)}
 getUsers(id){return [...this._r(id).users].map(i=>({id:i}))}
 appendOp(id,op,c){const r=this._r(id);op.clientId=c;r.history.push(op);r.undone=[]}
 getState(id){const r=this._r(id);return{history:[...r.history]}}
 undo(id){const r=this._r(id);if(r.history.length)r.undone.push(r.history.pop())}
 redo(id){const r=this._r(id);if(r.undone.length)r.history.push(r.undone.pop())}
}
module.exports=RoomManager;
