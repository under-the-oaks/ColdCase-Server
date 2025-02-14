# Tech Stack

Das Projekt ist ein Online-Multiplayer-Spiel, das auf der Web-Plattform mithilfe des LibGDX-Frameworks realisiert wird. Die verwendeten Technologien sind:

## Webserver: Deno
  
Zwei Deno-Server kommen zum Einsatz. Ein erster Server stellt die statischen Spieldaten bereit und liefert diese an die Clients aus. Ein zweiter Deno-Server fungiert als Kommunikations-Server für die Multiplayer-Funktionalität des Spiels. Dieser Server baut Socket-basierte Verbindungen zu den Clients auf, ermöglicht die Echtzeitkommunikation und synchronisiert die Spielstände über Redis.

## Client: LibGDX

Der Client wurde mit LibGDX entwickelt, einem plattformübergreifenden Framework, das für die Implementierung und Darstellung des Spiels im Webbrowser genutzt wird.

## Datenbank: Redis
  
Redis wird für die Speicherung und Synchronisierung der Spielstände verwendet. Da Redis als In-Memory-Datenbank agiert, können die Spielstände in Echtzeit zwischen den Clients synchronisiert werden.