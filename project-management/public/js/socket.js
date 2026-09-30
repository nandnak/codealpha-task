(function () {
  const { getToken } = window.PMT;

  function connectSocket() {
    if (!window.io || !getToken()) return null;
    if (window.PMT.socket) return window.PMT.socket;
    const socket = window.io({ auth: { token: getToken() } });
    socket.on('connect_error', () => {
      window.PMT.ui.toast('Realtime connection failed. Refresh if updates stop.');
    });
    window.PMT.socket = socket;
    return socket;
  }

  window.PMT.connectSocket = connectSocket;
})();
