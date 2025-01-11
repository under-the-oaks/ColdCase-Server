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
      let clientId = crypto.randomUUID(); //only used for debugging
      let lobby:Lobby;

      socket.onopen = () => {
        
  
        // Get the session ID from the URL
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("session");
        console.log("New connection");
  
        if (!sessionId) {
          socket.close(1008, "Session ID is required");
          return response;
        }
  
        if(sessionId == "new"){
          const newLobby: Lobby = {
            clients: [{ socket, clientId }],
            UID: crypto.randomUUID(),
          };
          lobbyList.push(newLobby);
          console.log("Lobby created with ID: " + newLobby.UID);

          const message = {
            class: "tech.underoaks.coldcase.remote.Messages$lobbyIdMessage",
            lobbyId: newLobby.UID, // Replace 'test' with the variable
          };

          socket.send(JSON.stringify(message));
          lobby = newLobby;
        }else{
          const foundLobby = lobbyList.find((lobby) => lobby.UID === sessionId);
  
          // If the lobby is full or not found, reject the connection
          if(!foundLobby){
            console.log(`error finding: ${sessionId}`);
            socket.close(1008, "Lobby doesn't exist");
            return response;
          }
          else if (foundLobby.clients.length >= 2) {
            console.log(`Lobby is full ID: ${foundLobby.UID}`);
            socket.close(1008, "Lobby is full");
            return response;
          }
          //add client to lobby 
          foundLobby.clients.push({ socket, clientId });
          lobby = foundLobby;
        }     
      };

      // Handle incoming messages from the client
      socket.onmessage = (event) => {
        console.log(`Received message from client ${clientId}: ${event.data}`);
        console.log(lobby);
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
        //lobby.clients = lobby.clients.filter((client) => client.socket !== socket);
        //// Remove the lobby if no clients are left
        //if (lobby.clients.length === 0) {
        //  lobbyList = lobbyList.filter((l) => l !== lobby);
        //  console.log(`Lobby ${lobby.UID} removed because all clients disconnected`);
        //}
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
