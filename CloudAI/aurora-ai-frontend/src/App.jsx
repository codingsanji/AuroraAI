import React, { useState, useEffect } from 'react';
import './App.css';

const DEFAULT_PREDICT = { probability: 0, g_scale: 'G0', latitude_bands: { '65N': 0, '60N': 0, '55N': 0 } };

const App = () => {
  const [metrics, setMetrics] = useState({ kp: null, mag: null, plasma: null });
  const [predict, setPredict] = useState(DEFAULT_PREDICT);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [liveRes, predictRes] = await Promise.all([
          fetch('/api/live'),
          fetch('/api/predict'),
        ]);
        if (!liveRes.ok || !predictRes.ok) throw new Error('Backend fetch failed');
        const [live, pred] = await Promise.all([liveRes.json(), predictRes.json()]);
        setMetrics({ kp: live.kp, mag: live.mag, plasma: live.plasma });
        setPredict(pred);
      } catch {
        setError('Backend unavailable — retrying in 60s');
      }
    };
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, []);

  const kpVal     = metrics.kp?.kp_index ?? 0;
  const { probability, g_scale, latitude_bands } = predict;

  return (
    <div className="app-container">
      <header style={{ padding: '24px' }}>
        <h1 className="aurora-title">AURORA AI</h1>
        <div style={{color: 'var(--muted)', fontSize: '12px', marginTop: '4px'}}>
          Predicting visible aurora projections via SageMaker
        </div>
        {error && <div className="error-banner">{error}</div>}
      </header>

      <main className="dashboard-grid">
        {/* ROW 1: METRICS */}
        <section className="card span-3">
          <h2>Current Kp</h2>
          <div style={{display: 'flex', alignItems: 'baseline', gap: '12px'}}>
            <div className="big">{kpVal || "—"}</div>
            <span className={`tag ${kpVal >= 5 ? 'bad' : 'ok'}`}>{kpVal >= 5 ? 'STORM' : 'QUIET'}</span>
          </div>
        </section>

        <section className="card span-4">
          <h2>Solar Wind</h2>
          <div className="solar-grid">
            <div><div className="k">BZ</div><div className="v">{metrics.mag?.bz_gsm ?? "—"}</div></div>
            <div><div className="k">Speed</div><div className="v">{metrics.plasma?.speed ?? "—"}</div></div>
            <div><div className="k">Density</div><div className="v">{metrics.plasma?.density ?? "—"}</div></div>
          </div>
        </section>

        <section className="card span-5">
          <h2>NOAA Scales</h2>
          <div className="big" style={{fontSize: '32px', color: kpVal >= 5 ? '#ff5d7a' : 'var(--muted)'}}>
            {g_scale}
          </div>
        </section>

        {/* ROW 2: INFERENCE */}
        <section className="card span-12">
          <div style={{textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginBottom: '20px'}}>
            AURORA AI INFERENCE — PROBABILITY OF VISIBLE AURORA
          </div>
          <div style={{display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap'}}>
            <div className="intensity-ring" style={{ '--pct': probability }}>
              <div className="val" style={{ position: 'relative', fontSize: '22px', fontWeight: 700 }}>{probability}%</div>
            </div>
            <div style={{flex: '1 1 300px'}}>
              <div style={{fontWeight: 600, fontSize: '16px'}}>Inference Projection</div>
              <p style={{color: 'var(--muted)', fontSize: '12px', marginTop: '8px'}}>
                Computed by AWS SageMaker XGBoost based on real-time NOAA data.
              </p>
            </div>
            <div style={{flex: '1 1 300px'}}>
              {[{ lat: 65, key: '65N' }, { lat: 60, key: '60N' }, { lat: 55, key: '55N' }].map(({ lat, key }) => (
                <div className="band" key={lat}>
                  <div className="lat">{lat}°N</div>
                  <div className="bar"><div className="fill" style={{width: `${latitude_bands[key]}%`}}></div></div>
                  <div className="pct">{latitude_bands[key]}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROW 3: FOOTER */}
        <section className="card span-8" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{color: 'var(--muted)'}}>7-Day History — Coming in Phase D</div>
        </section>
        <section className="card span-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{textAlign: 'center'}}>
            <h2>Dst Index</h2>
            <div style={{color: 'var(--muted)'}}>Latest: — nT</div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
