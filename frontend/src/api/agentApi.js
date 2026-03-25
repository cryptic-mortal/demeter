import {
  USE_MOCK_DATA,
  MOCK_SEARCH_RESULT,
  MOCK_DASHBOARD,
} from "../data/mockData";

const API_URL = process.env.REACT_APP_AGENT_API_URL || "http://localhost:8000";

export const agentService = {
  /**
   * Uploads an image + sensors to create a new FMU (Functional Memory Unit)
   */
  async uploadFMU(file, sensors) {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 500));
      return { status: "success", fmu_id: "mock-fmu-ingest-001" };
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "sensors",
      JSON.stringify({
        pH: parseFloat(sensors.pH),
        EC: parseFloat(sensors.EC),
        temp: parseFloat(sensors.temp),
        humidity: parseFloat(sensors.humidity),
        crop_id: sensors.crop_id || undefined,
      }),
    );
    formData.append(
      "metadata",
      JSON.stringify({
        crop: sensors.crop,
        stage: sensors.stage,
        crop_id: sensors.crop_id || undefined,
      }),
    );

    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },

  /**
   * Searches for similar memories and gets an Agent Decision
   */
  async searchFMU(file, sensors) {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 1200));
      return MOCK_SEARCH_RESULT;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "sensors",
      JSON.stringify({
        pH: parseFloat(sensors.pH),
        EC: parseFloat(sensors.EC),
        temp: parseFloat(sensors.temp),
        humidity: parseFloat(sensors.humidity),
        crop: sensors.crop,
        stage: sensors.stage,
        crop_id: sensors.crop_id || undefined,
      }),
    );

    const res = await fetch(`${API_URL}/search`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },

  /**
   * Translates a natural language query into a database filter using LLM
   */
  async queryText(text, cropId = null) {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 600));
      return {
        status: "success",
        results: MOCK_DASHBOARD.slice(0, 3).map((d, i) => ({
          id: d.id,
          score: 0.95 - i * 0.08,
          payload: d.payload,
        })),
        query_logic: {
          must: [
            { key: "crop", match: "Tomato" },
            { key: "outcome", match: "Positive" },
          ],
        },
      };
    }

    const formData = new FormData();
    formData.append("query", text);
    if (cropId) formData.append("crop_id", cropId);

    const res = await fetch(`${API_URL}/query-text`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },

  /**
   * Finds cosine-similar crops via Qdrant vector search
   */
  async querySimilarCrops(cropId, cropName, payload) {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 400));
      return {
        status: "success",
        results: MOCK_DASHBOARD.slice(1, 4).map((d, i) => ({
          id: d.id,
          score: 0.91 - i * 0.07,
          payload: d.payload,
        })),
      };
    }

    const formData = new FormData();
    formData.append("crop_id", cropId);
    formData.append("crop_name", cropName || "");
    formData.append("payload", JSON.stringify(payload || {}));

    const res = await fetch(`${API_URL}/query-similar`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },

  /**
   * Processes voice input
   */
  async queryAudio(audioBlob) {
    if (USE_MOCK_DATA) {
      await new Promise((r) => setTimeout(r, 1500));
      return {
        status: "success",
        transcription: "Find me healthy tomato crops",
        results: MOCK_DASHBOARD.slice(0, 2).map((d, i) => ({
          id: d.id,
          score: 0.98 - i * 0.05,
          payload: d.payload,
        })),
      };
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const res = await fetch(`${API_URL}/query-audio`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  },

  /**
   * Ask Demeter a natural language question
   */
  async askDemeter(query, context, lang) {
    const formData = new FormData();
    formData.append("query", query);
    formData.append("context", context);
    formData.append("language", lang);

    const res = await fetch(`${API_URL}/ask-demeter`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },
};
