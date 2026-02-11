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
VITE_CHAT_API_BASE=http://localhost:8001
VITE_CHAT_API_PATH=/chat
```

Alternativ kannst du Base URL und Pfad direkt in der UI anpassen.

## K8s (empfohlen)

Aktualisieren Sie Ihre k8s/deployment.yaml
```
kubectl apply -f k8s/deployment.yaml
```
Ein Portforward noch

```
kubectl -n zodiac port-forward svc/orion-ui 8081:80
```
und dann [http://localhost:8081/](http://localhost:8081/) öffnen.

```
kubectl -n zodiac port-forward svc/mcp-client-service 8001:8001 --address 0.0.0.0
```
### How to open the UI in browser:
1. Get the IP of the Cluster Node:
```bash
kubectl get nodes -o wide
```
2. Open the UI in your browser using the Node IP:
```
http://<NODE_IP>:30081/
```

### Image Tagging script:
If you want to build and push new images to your registry, you can use the following script to build and then tag the images with the digest.

To use the flag --token-file, create a file named token-file.txt and add your registry token in it
```bash
./image_tagging_script.sh -f ./Dockerfile --token-file token-file.txt --username git git.tu-berlin.de:5000/zodiac/zodiac-meta/orion-ui k8s/deployment.yaml
```

