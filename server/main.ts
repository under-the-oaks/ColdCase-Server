interface Lobby {
  clients: WebSocket[];
  UID: string;
}

let lobbyList: Lobby[] = [];

Deno.serve({
  port: 8080,
  handler: async (request) => {
    // Check if the request is a WebSocket upgrade
    if (request.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(request);

      // Get the session ID from the URL
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("session");
      console.log("New connection");

      if (!sessionId) {
        socket.close(1008, "Session ID is required");
        return response;
      }

      // Find or create a lobby for the session ID
      let lobby = lobbyList.find((lobby) => lobby.UID === sessionId);
      if (!lobby) {
        // If the lobby doesn't exist, create a new one
        lobby = { clients: [], UID: sessionId };
        lobbyList.push(lobby);
        console.log("Lobby created with ID: " + lobby.UID);
      }

      // If the lobby is full, reject the connection
      if (lobby.clients.length >= 2) {
        socket.close(1008, "Lobby is full");
        return response;
      }

      // Add the client to the lobby
      lobby.clients.push(socket);

      // Send messages to the client only after the connection is open
      socket.onopen = () => {
        socket.send("Joined Lobby " + lobby.UID);
      };

      // Handle incoming messages from the client
      socket.onmessage = (event) => {
        console.log(`Received message: ${event.data}`);
        // Forward the message to other clients in the lobby
        lobby.clients.forEach((client) => {
          if (client !== socket) {
            client.send(event.data);
          }
        });
      };

      // Handle client disconnection
      socket.onclose = () => {
        console.log("Client disconnected");
        lobby.clients = lobby.clients.filter((client) => client !== socket);
        // Remove the lobby if no clients are left
        if (lobby.clients.length === 0) {
          lobbyList = lobbyList.filter((l) => l !== lobby);
        }
      };

      // Handle socket errors
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return response;
    } else {
      // If the request is a normal HTTP request, serve the client HTML file
      const file = await Deno.open("./index.html", { read: true });
      return new Response(file.readable);
    }
  },
});
