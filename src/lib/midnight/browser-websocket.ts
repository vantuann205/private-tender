// Midnight's indexer imports a named WebSocket; isomorphic-ws only defaults it in browsers.
export const WebSocket = globalThis.WebSocket;
export default WebSocket;
