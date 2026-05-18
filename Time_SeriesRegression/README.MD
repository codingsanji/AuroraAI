# Phase II: Temporal Kp-Index Regression

Phase II transitions from a simple "Yes/No" to a quantitative forecast. This model predicts the **exact Kp-Index value** for $t+1$, $t+3$, and $t+6$ hours.

## Deep Learning Architecture
The magnetosphere behaves like a system with "hysteresis" (it has memory). Therefore, we utilize **Recurrent Neural Networks (RNNs)**:
* **LSTM Units:** Designed to prevent the vanishing gradient problem, allowing the model to "remember" solar flares from 48 hours ago.
* **Attention Mechanism:** To weigh the importance of sudden spikes in $B_z$ (Magnetic Field) versus steady increases in Solar Speed.

## Technical Implementation
* **Sequence Processing:** Converting time-series data into 3D tensors $(samples, time\_steps, features)$.
* **Loss Function:** Mean Squared Error (MSE) with a custom penalty for under-predicting high-intensity storms.
* **Normalization:** StandardScalar application to handle the wide variance in proton density.

## Additional Features in Mind
(Future Goal) Integration with a real-time dashboard to provide live Aurora alerts.