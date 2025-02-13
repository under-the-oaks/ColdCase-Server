// main_test.ts
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  Lobby,
  lobbyList,
  removeLobbyIfEmpty,
  websocketHandler,
} from "./main.ts";

/**
 * Starts a test server on the specified port.
 * Returns an AbortController to stop the server when done.
 */
function startTestServer(port: number): { abortController: AbortController } {
  const abortController = new AbortController();
  Deno.serve({
    port,
    signal: abortController.signal,
    handler: websocketHandler,
  });
  return { abortController };
}

/**
 * Wait for a WebSocket to open.
 */
function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = reject;
  });
}

/**
 * Wait for the next message from the WebSocket.
 */
function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    ws.onmessage = (event) => resolve(event.data);
    ws.onerror = reject;
  });
}

/**
 * Wait for the WebSocket to close, returning the close event info.
 */
function waitForClose(
  ws: WebSocket,
): Promise<{ code: number; reason: string }> {
  return new Promise((resolve, reject) => {
    ws.onclose = (event) => resolve({ code: event.code, reason: event.reason });
    ws.onerror = reject;
  });
}

/* ---------------------------------------------------------------------------
   Existing Tests
--------------------------------------------------------------------------- */
Deno.test("Lobby Creation Test", async () => {
  const port = 8081;
  const { abortController } = startTestServer(port);

  const ws = new WebSocket(`ws://localhost:${port}?session=new`);
  await waitForOpen(ws);

  // The server should send back a message with the new lobby ID.
  const data = await waitForMessage(ws);
  const message = JSON.parse(data);
  assertEquals(
    message.class,
    "tech.underoaks.coldcase.remote.Messages$lobbyIdMessage",
  );
  assert(message.lobbyId, "lobbyId should be present in the message");

  ws.close();
  await waitForClose(ws);
  abortController.abort();
});

Deno.test("Message Forwarding Test", async () => {
  const port = 8082;
  const { abortController } = startTestServer(port);

  // First client creates a new lobby.
  const ws1 = new WebSocket(`ws://localhost:${port}?session=new`);
  await waitForOpen(ws1);
  const data1 = await waitForMessage(ws1);
  const message1 = JSON.parse(data1);
  const lobbyId = message1.lobbyId;
  assert(lobbyId, "Lobby ID must be returned for a new lobby");

  // Second client joins the created lobby.
  const ws2 = new WebSocket(`ws://localhost:${port}?session=${lobbyId}`);
  await waitForOpen(ws2);

  // Prepare to catch the forwarded message on ws2.
  const msgPromise = waitForMessage(ws2);

  // Send a message from ws1.
  const testMessage = "Hello from ws1";
  ws1.send(testMessage);

  const forwardedMsg = await msgPromise;
  assertEquals(forwardedMsg, testMessage);

  // Similarly, test forwarding in the opposite direction.
  const msgPromise2 = waitForMessage(ws1);
  const replyMessage = "Hello back from ws2";
  ws2.send(replyMessage);
  const forwardedReply = await msgPromise2;
  assertEquals(forwardedReply, replyMessage);

  // Clean up: close the websockets and wait for them to actually close.
  ws1.close();
  ws2.close();
  await waitForClose(ws1);
  await waitForClose(ws2);
  abortController.abort();
});

Deno.test("Full Lobby Test", async () => {
  const port = 8083;
  const { abortController } = startTestServer(port);

  // First client creates a lobby.
  const ws1 = new WebSocket(`ws://localhost:${port}?session=new`);
  await waitForOpen(ws1);
  const data1 = await waitForMessage(ws1);
  const lobbyId = JSON.parse(data1).lobbyId;
  assert(lobbyId);

  // Second client joins.
  const ws2 = new WebSocket(`ws://localhost:${port}?session=${lobbyId}`);
  await waitForOpen(ws2);

  // Third client tries to join the same lobby.
  const ws3 = new WebSocket(`ws://localhost:${port}?session=${lobbyId}`);
  // Wait for the close event on ws3.
  const closeEvent = await waitForClose(ws3);
  assertEquals(closeEvent.code, 1008);
  assertEquals(closeEvent.reason, "Lobby is full");

  ws1.close();
  ws2.close();
  abortController.abort();
});

Deno.test("Invalid Lobby Test", async () => {
  const port = 8084;
  const { abortController } = startTestServer(port);

  // Client attempts to join a non-existent lobby.
  const ws = new WebSocket(`ws://localhost:${port}?session=non-existent`);
  const closeEvent = await waitForClose(ws);
  assertEquals(closeEvent.code, 1008);
  assertEquals(closeEvent.reason, "Lobby doesn't exist");

  abortController.abort();
});

/* ---------------------------------------------------------------------------
   Additional Tests for Missing Branch Coverage
--------------------------------------------------------------------------- */
Deno.test("Missing Session Test", async () => {
  const port = 8085;
  const { abortController } = startTestServer(port);

  // Connect without a session parameter.
  const ws = new WebSocket(`ws://localhost:${port}`);
  await waitForOpen(ws);
  const closeEvent = await waitForClose(ws);
  assertEquals(closeEvent.code, 1008);
  assertEquals(closeEvent.reason, "Session ID is required");

  abortController.abort();
});

Deno.test("HTTP Response Test", async () => {
  // Create a Request that does not have the "upgrade" header.
  const request = new Request("http://localhost", {
    headers: new Headers({}),
  });
  const response = await websocketHandler(request);
  const text = await response.text();
  assertEquals(text, "Hello from the WebSocket server");
});

Deno.test("removeLobbyIfEmpty Test", () => {
  // Clear any existing lobbies for isolation.
  lobbyList.length = 0;

  // Create an empty lobby.
  const lobby: Lobby = { clients: [], UID: "test-uid" };
  lobbyList.push(lobby);
  const removed = removeLobbyIfEmpty(lobby);
  assertEquals(removed, true);
  assert(!lobbyList.includes(lobby), "Lobby should be removed when empty");

  // Create a lobby with one dummy client.
  const dummyWs = {} as WebSocket;
  const lobby2: Lobby = {
    clients: [{ socket: dummyWs, clientId: "dummy" }],
    UID: "test-uid2",
  };
  lobbyList.push(lobby2);
  const removed2 = removeLobbyIfEmpty(lobby2);
  assertEquals(removed2, false);
  assert(lobbyList.includes(lobby2), "Lobby should remain when not empty");
});
