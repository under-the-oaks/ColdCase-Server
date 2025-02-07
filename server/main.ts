/**
 * Interface representing a Lobby in the WebSocket server.
 * It contains the list of connected clients and a unique identifier (UID) for the lobby.
 */
interface Lobby {
  clients: { socket: WebSocket; clientId: string }[]; // Adding clientId to differentiate between clients
  UID: string;
}

/**
 * List to store all active lobbies. Each lobby has a unique UID and a list of connected clients.
 */
let lobbyList: Lobby[] = [];

/**
 * Deno server that listens for WebSocket connections on port 8080.
 * It handles the creation of lobbies, client connections, and message forwarding between clients.
 */
Deno.serve({
  port: 8080,
  handler: async (request) => {
    // Check if the request is a WebSocket upgrade
    if (request.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(request);
      let clientId = crypto.randomUUID(); //only used for debugging
      let lobby: Lobby;

      socket.onopen = () => {
        // Get the session ID from the URL
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("session");
        console.log("New connection: " + clientId);
        
        if (!sessionId) {
          socket.close(1008, "Session ID is required");
          return response;
        }

        if (sessionId == "new") {
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
        } else {
          const foundLobby = lobbyList.find((lobby) => lobby.UID === sessionId);

          // If the lobby is full or not found, reject the connection
          if (!foundLobby) {
            console.log(`error finding: ${sessionId}`);
            socket.close(1008, "Lobby doesn't exist");
            return response;
          } else if (foundLobby.clients.length >= 2) {
            console.log(`Lobby is full ID: ${foundLobby.UID}`);
            socket.close(1008, "Lobby is full");
            return response;
          }
          //add client to lobby
          foundLobby.clients.push({ socket, clientId });
          lobby = foundLobby;
        }
      };

      /**
       * Handles incoming messages from a client.
       * Forwards the received message to all other clients in the same lobby.
       * 
       * @param event - The WebSocket message event containing the data from the client.
       */
      socket.onmessage = (event) => {
        console.log(`Received message from client ${clientId}: ${event.data}`);
        console.log(lobby);
        // Forward the message to other clients in the lobby
        lobby.clients.forEach((client) => {
          if (client.socket !== socket) {
            console.log(
              `Forwarding message from client ${clientId} to client ${client.clientId}`,
            );
            client.socket.send(event.data);
          }
        });
      };

      /**
       * Handles client disconnections.
       * Removes the client from the lobby and deletes the lobby if there are no clients left.
       */
      socket.onclose = () => {
        console.log(`Client ${clientId} disconnected`);
        if(!lobby)return;
        lobby.clients = lobby.clients.filter((client) => client.socket !== socket);
        // Remove the lobby if no clients are left
        if (lobby.clients.length === 0) {
          lobbyList = lobbyList.filter((l) => l !== lobby);
          console.log(`Lobby ${lobby.UID} removed because all clients disconnected`);
        }
      };

      /**
       * Handles any errors that occur with the WebSocket connection.
       * Logs the error to the console.
       * 
       * @param error - The WebSocket error event.
       */
      socket.onerror = (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        // Remove the client from the lobby's client list
        console.log(lobby.clients);
        lobby.clients = lobby.clients.filter((client) =>
          client.socket !== socket
        );

        // Close the socket and notify other clients in the lobby
        socket.close(1007, "An error occurred. Disconnecting...");
        if(!removeLobbyIfEmpty(lobby)){
          lobby.clients.forEach(client => {
            client.socket.close(1001,"Closing because an error occured")
          });
        }

      };

      return response;
    } else {
      // If the request is a normal HTTP request, serve the client HTML file
      const file = await Deno.open("./public/index.html", { read: true });
      return new Response(file.readable);
    }
  },
});

/**
 * Removes a lobby from the lobby list if all clients have disconnected.
 * @param {Lobby} lobby - The lobby to be checked and potentially removed.
 * @returns {boolean} - Returns true if the lobby was removed, otherwise false.
 */
function removeLobbyIfEmpty(lobby: Lobby) {
  if (lobby.clients.length === 0) {
    // Remove the lobby from the global lobby list
    lobbyList = lobbyList.filter((l) => l !== lobby);
    console.log(
      `Lobby ${lobby.UID} removed because all clients disconnected.`,
    );
    return true; // Lobby was removed
  }
  return false; // Lobby was not removed
}