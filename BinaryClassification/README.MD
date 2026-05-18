# Phase I: Binary Occurrence Classification

The goal of this phase is to build a classifier that identifies "Geomagnetic Storm Conditions." Using historical solar wind data, the model predicts whether the Kp-Index will cross the critical threshold of **Kp $\ge$ 5**.

## Methodology
1.  **Data Ingestion:** Scraped 1-minute cadence solar wind data from NOAA SWPC.
2.  **Labeling:** Transformed continuous Kp-Index values into binary classes:
    * `0`: Quiet / Unsettled (Kp < 5)
    * `1`: Storm / Aurora Likely (Kp $\ge$ 5)
3.  **Feature Engineering:** Implemented "Rolling Windows" to capture the momentum of solar particle acceleration.

## Experiments
We compared three primary models:
* **Logistic Regression:** For statistical interpretability.
* **Random Forest:** To handle non-linear relationships between Density and Speed.
* **XGBoost:** Optimized for high-precision event detection.

## Performance Metrics
Because Aurora events are relatively rare, we prioritize the **F1-Score** and **Precision-Recall Curve** over simple Accuracy.