import base64
import time
import os
import json
import threading
import uvicorn
import numpy as np
import torch
import torch.nn as nn
from io import BytesIO
from collections import deque
from dataclasses import dataclass, asdict
from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# --- AZURE DIGITAL TWINS CONFIG ---
try:
    from azure.identity import DefaultAzureCredential
    from azure.digitaltwins.core import DigitalTwinsClient

    credential = DefaultAzureCredential()
    adt_url = os.environ.get("ADT_URL", "simulator.api.krc.digitaltwins.azure.net")
    client = DigitalTwinsClient(adt_url, credential)
    twin_id = "HydrophonicTank"
    AZURE_ENABLED = True
except Exception as e:
    print(f"Azure Digital Twins disabled: {e}")
    AZURE_ENABLED = False


def sync_to_azure(state):
    if not AZURE_ENABLED:
        return
    ph, ec, water_temp, air_temp, humidity, vpd, biomass = state
    payload = {
        "ph": float(ph),
        "ec": float(ec),
        "water_temp": float(water_temp),
        "air_temp": float(air_temp),
        "humidity": float(humidity),
        "vpd": float(vpd),
        "biomass_g": float(biomass),
    }
    try:
        client.publish_telemetry(twin_id, payload)
    except Exception as e:
        print(f"Azure Sync Error: {e}")


# --- CONFIG ---
MODEL_PATH = "models/PPO/lettuce_brain_v1.zip"
HISTORY_LEN = 20


# --- DATA MODELS ---
@dataclass
class FarmStateData:
    ph: float
    ec: float
    water_temp: float
    air_temp: float
    humidity: float
    vpd: float
    biomass_g: float
    tank_volume_l: float


class FarmAction(BaseModel):
    acid_dosage_ml: float = 0.0
    base_dosage_ml: float = 0.0
    nutrient_dosage_ml: float = 0.0
    fan_speed_pct: float = 0.0
    water_refill_l: float = 0.0
    debug_force_ph: float | None = None


# --- PHYSICS ENGINE (Research Grade) ---
class ResidualPhysicsNet(torch.nn.Module):
    def __init__(self, state_dim, action_dim):
        super().__init__()
        self.net = torch.nn.Sequential(
            torch.nn.Linear(state_dim + action_dim, 64),
            torch.nn.Tanh(),
            torch.nn.Linear(64, 64),
            torch.nn.ReLU(),
            torch.nn.Linear(64, state_dim),
        )

    def forward(self, state, action):
        x = torch.cat([state, action], dim=-1)
        return self.net(x)


class DigitalTwin:
    def __init__(self):
        # Initial State: [pH, EC, WaterT, AirT, Hum, VPD, Biomass]
        self.state = np.array([6.0, 1.5, 20.0, 24.0, 60.0, 1.0, 10.0], dtype=np.float32)
        self.tank_volume = 100.0
        self.plant_health = 100.0
        self.crop_id = "BATCH-VERDANT-X1"

        self.residual_model = ResidualPhysicsNet(7, 4)

        # History
        self.history = {
            "ph": deque([6.0] * 5, maxlen=HISTORY_LEN),
            "ec": deque([1.5] * 5, maxlen=HISTORY_LEN),
            "water_temp": deque([20.0] * 5, maxlen=HISTORY_LEN),
            "air_temp": deque([24.0] * 5, maxlen=HISTORY_LEN),
            "humidity": deque([60.0] * 5, maxlen=HISTORY_LEN),
            "co2": deque([400.0] * 5, maxlen=HISTORY_LEN),
            "light_intensity": deque([0.0] * 5, maxlen=HISTORY_LEN),
            "vpd": deque([1.0] * 5, maxlen=HISTORY_LEN),
        }

    def _calculate_vpd(self, temp, hum):
        es = 0.61078 * np.exp((17.27 * temp) / (temp + 237.3))
        ea = es * (hum / 100.0)
        return max(0.0, es - ea)

    def step(self, action: FarmAction = None):
        if action is None:
            action = FarmAction()

        u = np.array(
            [
                action.acid_dosage_ml / 10.0,
                action.base_dosage_ml / 10.0,
                action.nutrient_dosage_ml / 20.0,
                action.fan_speed_pct / 100.0,
            ],
            dtype=np.float32,
        )

        # 1. Physics Calculations
        ph, ec, wt, at, hum, vpd, bio = self.state

        d_ph = (u[1] * 0.5) - (u[0] * 0.5) + (0.001 * bio)
        if action.debug_force_ph:
            self.state[0] = action.debug_force_ph

        uptake = 0.02 * bio * vpd
        d_ec = (u[2] * 0.2) - (uptake / self.tank_volume)

        d_at = 0.1 - (u[3] * 1.5)
        d_hum = 1.0 - (u[3] * 5.0)

        stress = abs(vpd - 1.0)
        growth = 0.1 * bio * (1.0 - min(stress, 1.0))

        physics_delta = np.array(
            [d_ph, d_ec, 0, d_at, d_hum, 0, growth], dtype=np.float32
        )

        # 2. Neural Residual
        with torch.no_grad():
            nn_delta = self.residual_model(
                torch.tensor(self.state), torch.tensor(u)
            ).numpy()

        # 3. Update State
        self.state += physics_delta + (nn_delta * 0.05)

        # Clip & Recalc
        self.state[3] = np.clip(self.state[3], 0, 50)
        self.state[4] = np.clip(self.state[4], 0, 100)
        self.state[5] = self._calculate_vpd(self.state[3], self.state[4])
        self.state[6] = max(0.1, self.state[6])

        # Calculate Health
        ph_score = max(0, 1.0 - abs(self.state[0] - 6.0))
        vpd_score = max(0, 1.0 - abs(self.state[5] - 1.0))

        # FIX: Ensure calculation results in a standard float
        health_calc = (float(ph_score) + float(vpd_score)) * 50.0
        self.plant_health = max(0.0, min(100.0, health_calc))

        self._update_history()
        return self._generate_image()

    def _update_history(self):
        s = self.state
        # FIX: Explicit float() casting prevents numpy errors in JSON
        self.history["ph"].append(float(s[0]))
        self.history["ec"].append(float(s[1]))
        self.history["water_temp"].append(float(s[2]))
        self.history["air_temp"].append(float(s[3]))
        self.history["humidity"].append(float(s[4]))
        self.history["vpd"].append(float(s[5]))
        self.history["co2"].append(400.0)
        self.history["light_intensity"].append(0.0)

    def _generate_image(self):
        bucket = int(self.plant_health // 10) * 10
        bucket = max(0, min(90, bucket))
        filename = f"{bucket}.png"

        if os.path.exists(filename):
            return Image.open(filename)
        return Image.new("RGB", (512, 512), (50, 50, 50))


# --- SERVER ---
app = FastAPI()
sim = DigitalTwin()


@app.get("/simulation/state")
async def get_state():
    pil_img = sim.step()

    buf = BytesIO()
    pil_img.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    # FIX: Casting numpy values to python types for JSON serialization
    return {
        "sensor_window": {k: list(v) for k, v in sim.history.items()},
        "metadata": {
            "crop": "lettuce",
            "stage": "vegetative" if sim.state[6] > 5.0 else "seedling",
            # FIX: Convert health to float before rounding
            "health": round(float(sim.plant_health), 1),
            "crop_id": sim.crop_id,
            "biomass_est": round(float(sim.state[6]), 2),
        },
        "image": img_b64,
    }


@app.get("/azure/state")
async def fetch_from_azure():
    if not AZURE_ENABLED:
        return {"status": "error", "message": "Azure Digital Twins is disabled."}

    try:
        twin = client.get_digital_twin(twin_id)

        biomass = float(twin.get("biomass_g", 0.0))

        return {
            "sensor_window": {
                "ph": [twin.get("ph", 0.0)],
                "ec": [twin.get("ec", 0.0)],
                "water_temp": [twin.get("water_temp", 0.0)],
                "air_temp": [twin.get("air_temp", 0.0)],
                "humidity": [twin.get("humidity", 0.0)],
                "vpd": [twin.get("vpd", 0.0)],
            },
            "metadata": {
                "crop": "lettuce",
                "stage": "vegetative" if biomass > 5.0 else "seedling",
                "health": 100.0,
                "crop_id": twin.get("$dtId", "Unknown"),
                "biomass_est": round(biomass, 2),
            },
            "image": "",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/simulation/action")
async def take_action(action: FarmAction):
    sim.step(action)

    sync_to_azure(sim.state)

    return {
        "status": "success",
        "new_state": {"ph": float(sim.state[0]), "ec": float(sim.state[1])},
    }


if __name__ == "__main__":
    port = int(os.environ.get("SIMULATOR_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
