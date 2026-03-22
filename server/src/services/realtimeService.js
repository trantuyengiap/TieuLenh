let ioInstance;

export function attachSocket(io) {
  ioInstance = io;
}

export function emitLedUpdate(payload) {
  ioInstance?.emit('led:update', payload);
}

export function emitSessionUpdate(payload) {
  ioInstance?.emit('session:update', payload);
}

export function emitStatsUpdate(payload) {
  ioInstance?.emit('stats:update', payload);
}
