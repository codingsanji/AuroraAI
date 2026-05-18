# AuroraAI: A Multi-Phase Study in Geomagnetic Forecasting

AuroraAI is a Machine Learning ecosystem designed to bridge heliophysics and predictive analytics. The project is divided into two distinct phases, moving from binary event classification to temporal regression.

---

## Project Structure
The repository is organized into two primary research modules:

### [Phase I: Binary Occurrence Classification](./Phase-I-Classification/)
* **Focus:** Determining the probability of an Aurora event (Yes/No) based on real-time solar wind vectors.
* **Goal:** Establish a high-precision baseline for geomagnetic storm detection.
* **Tech:** Scikit-Learn, Random Forests, XGBoost.

### [Phase II: Temporal Kp-Index Regression](./Phase-II-Regression/)
* **Focus:** Predicting the specific magnitude of the Kp-Index over a 6-hour horizon.
* **Goal:** Solve the "intensity" problem using deep temporal architectures.
* **Tech:** PyTorch, LSTM (Long Short-Term Memory), Temporal Fusion Transformers.

---

## Global Requirements
* Python 3.9+
* Pandas / NumPy
* Matplotlib / Seaborn
* NASA/NOAA API Access

Kindly refer to the Notes folder to understand more on this topic and what was used for each module.