# Orion Chat UI (Vue 3 + Vite)

Dieses UI spricht mit dem HTTP-Endpoint des Ollama MCP Clients in
[PurposeAwareMCP/src/zodiac-mcp-client/ollama-mcp-client.py](../PurposeAwareMCP/src/zodiac-mcp-client/ollama-mcp-client.py).

## Lokales Setup (nicht empfohlen)

```bash
npm install
npm run dev
```

## Konfiguration

Erstelle optional eine `.env` Datei im Projektordner und überschreibe die Defaults:

```
VITE_CHAT_API_BASE=http://localhost:8000
VITE_CHAT_API_PATH=/chat
```

Alternativ kannst du Base URL und Pfad direkt in der UI anpassen.

## K8s (empfohlen)

Aktualisieren Sie Ihre HiveZODIAC/k8s/deployment.yaml
```
kubectl apply -f HiveZODIAC/k8s/deployment.yaml
```
Ein Portforward noch

```
kubectl -n zodiac port-forward svc/orion-ui 8081:80
```
und dann [http://localhost:8081/](http://localhost:8081/) öffnen.

```
kubectl -n zodiac port-forward svc/mcp-client-service 8000:8000 --address 0.0.0.0
```