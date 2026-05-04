import axios from "axios";

const BASE = "http://localhost:8000";

export const api = axios.create({ baseURL: BASE });

export function createSSEStream(
  streamUrl: string,
  onChunk: (text: string) => void,
  onDone: (messageId: string) => void,
  onError: (msg: string) => void,
) {
  const es = new EventSource(`${BASE}${streamUrl}`);

  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === "chunk") {
      onChunk(data.content);
    } else if (data.type === "done") {
      onDone(data.messageId);
      es.close();
    } else if (data.type === "error") {
      onError(data.message);
      es.close();
    }
  };

  es.onerror = () => {
    onError("stream connection error");
    es.close();
  };

  return es;
}
