// main.ts
export interface Lobby {
  clients: { socket: WebSocket; clientId: string }[];
  UID: string;
}

export let lobbyList: Lobby[] = [];

export function websocketHandler(
  request: Request,
): Response | Promise<Response> {
  // Check if the request is a WebSocket upgrade
  if (request.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(request);
    const clientId = crypto.randomUUID(); // only used for debugging
    let lobby: Lobby;

    socket.onopen = () => {
      // Get the session ID from the URL
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("session");
      console.log("New connection: " + clientId);

      if (!sessionId) {
        socket.close(1008, "Session ID is required");
        return;
      }

      if (sessionId === "new") {
        const newLobby: Lobby = {
          clients: [{ socket, clientId }],
          UID: crypto.randomUUID(),
        };
        lobbyList.push(newLobby);
        console.log("Lobby created with ID: " + newLobby.UID);

        const message = {
          class: "tech.underoaks.coldcase.remote.Messages$lobbyIdMessage",
          lobbyId: newLobby.UID,
        };

        socket.send(JSON.stringify(message));
        lobby = newLobby;
      } else {
        const foundLobby = lobbyList.find((lobby) => lobby.UID === sessionId);

        if (!foundLobby) {
          console.log(`error finding: ${sessionId}`);
          socket.close(1008, "Lobby doesn't exist");
          return;
        } else if (foundLobby.clients.length >= 2) {
          console.log(`Lobby is full ID: ${foundLobby.UID}`);
          socket.close(1008, "Lobby is full");
          return;
        }
        foundLobby.clients.push({ socket, clientId });
        lobby = foundLobby;
      }
    };

    socket.onmessage = (event) => {
      console.log(`Received message from client ${clientId}: ${event.data}`);
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

    socket.onclose = () => {
      console.log(`Client ${clientId} disconnected`);
      if (!lobby) return;
      lobby.clients = lobby.clients.filter((client) =>
        client.socket !== socket
      );
      if (lobby.clients.length === 0) {
        lobbyList = lobbyList.filter((l) => l !== lobby);
        console.log(
          `Lobby ${lobby.UID} removed because all clients disconnected`,
        );
      }
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      if (lobby) {
        lobby.clients = lobby.clients.filter((client) =>
          client.socket !== socket
        );
      }
      socket.close(1007, "An error occurred. Disconnecting...");
      if (lobby) {
        if (!removeLobbyIfEmpty(lobby)) {
          lobby.clients.forEach((client) => {
            client.socket.close(1001, "Closing because an error occured");
          });
        }
      }
    };

    return response;
  } else {
    // Serve an HTTP response (e.g. an HTML file)
    return new Response("Hello from the WebSocket server");
  }
}

/**
 * Removes a lobby if no clients remain.
 */
export function removeLobbyIfEmpty(lobby: Lobby): boolean {
  if (lobby.clients.length === 0) {
    lobbyList = lobbyList.filter((l) => l !== lobby);
    console.log(`Lobby ${lobby.UID} removed because all clients disconnected.`);
    return true;
  }
  return false;
}

// Only start the server if this module is run directly.
if (import.meta.main) {
  Deno.serve({ port: 8080, handler: websocketHandler });
}
