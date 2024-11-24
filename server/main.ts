interface Lobby {
  clients: { socket: WebSocket, clientId: string }[]; // Adding clientId to differentiate between clients
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
        console.log(`Lobby is full ID: ${lobby.UID}`);
        socket.close(1008, "Lobby is full");
        return response;
      }

      // Generate a unique client ID (could use remoteAddress, or just a random string)
      const clientId = Math.random().toString(36).substring(7);
      console.log(`New client connected with clientId: ${clientId}`);

      // Add the client to the lobby
      lobby.clients.push({ socket, clientId });

      // Send messages to the client only after the connection is open
      socket.onopen = () => {
        console.log(`Client ${clientId} joined lobby ${lobby.UID}`);
        //socket.send("Joined Lobby " + lobby.UID);
      };

      // Handle incoming messages from the client
      socket.onmessage = (event) => {
        console.log(`Received message from client ${clientId}: ${event.data}`);
        // Forward the message to other clients in the lobby
        lobby.clients.forEach((client) => {
          if (client.socket !== socket) {
            console.log(`Forwarding message from client ${clientId} to client ${client.clientId}`);
            client.socket.send(event.data);
          }
        });
      };

      // Handle client disconnection
      socket.onclose = () => {
        console.log(`Client ${clientId} disconnected`);
        lobby.clients = lobby.clients.filter((client) => client.socket !== socket);
        // Remove the lobby if no clients are left
        if (lobby.clients.length === 0) {
          lobbyList = lobbyList.filter((l) => l !== lobby);
          console.log(`Lobby ${lobby.UID} removed because all clients disconnected`);
        }
      };

      // Handle socket errors
      socket.onerror = (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      };

      return response;
    } else {
      // If the request is a normal HTTP request, serve the client HTML file
      const file = await Deno.open("./index.html", { read: true });
      return new Response(file.readable);
    }
  },
});
