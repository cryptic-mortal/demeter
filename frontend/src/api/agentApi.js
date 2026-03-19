const API_URL = "http://localhost:8000";

export const agentService = {
  /**
   * Uploads an image + sensors to create a new FMU (Functional Memory Unit)
   */
  async uploadFMU(file, sensors) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "sensors",
      JSON.stringify({
        pH: parseFloat(sensors.pH),
        EC: parseFloat(sensors.EC),
        temp: parseFloat(sensors.temp),
        humidity: parseFloat(sensors.humidity),
      }),
    );
    formData.append(
      "metadata",
      JSON.stringify({ crop: sensors.crop, stage: sensors.stage }),
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
        crop_id: sensors.crop_id || "",
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
   * Queries the RAG/Agent via Text
   */
  async queryText(text) {
    const formData = new FormData();
    formData.append("query", text);
    const res = await fetch(`${API_URL}/query-text`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  /**
   * Queries the RAG/Agent via Audio
   */
  async queryAudio(audioBlob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    const res = await fetch(`${API_URL}/query-audio`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },
};
