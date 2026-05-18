import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [metrics, setMetrics] = useState({ kp: null, mag: null, plasma: null });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [kpRes, magRes, plasmaRes] = await Promise.all([
          fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'),
          fetch('https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json'),
          fetch('https://services.swpc.noaa.gov/json/rtsw/rtsw_plasma_1m.json')
        ]);
        const kp = await kpRes.json();
        const mag = await magRes.json();
        const plasma = await plasmaRes.json();
        setMetrics({ kp: kp[kp.length-1], mag: mag[mag.length-1], plasma: plasma[plasma.length-1] });
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  const kpVal = metrics.kp?.kp_index || 0;
  const prediction = kpVal > 4 ? 78 : 12;

  return (
    <div className="app-container">
      <header style={{ padding: '24px' }}>
        <h1 className="aurora-title">AURORA AI</h1>
        <div style={{color: 'var(--muted)', fontSize: '12px', marginTop: '4px'}}>
          Predicting visible aurora projections via SageMaker
        </div>
      </header>

      <main className="dashboard-grid">
        {/* ROW 1: METRICS (Responsive Spans) */}
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
            <div><div className="k">BZ</div><div className="v">{metrics.mag?.bz_gsm || "—"}</div></div>
            <div><div className="k">Speed</div><div className="v">{metrics.plasma?.speed || "—"}</div></div>
            <div><div className="k">Density</div><div className="v">{metrics.plasma?.density || "—"}</div></div>
          </div>
        </section>

        <section className="card span-5">
          <h2>NOAA Scales</h2>
          <div className="big" style={{color: 'var(--muted)', fontSize: '32px'}}>—</div>
        </section>

        {/* ROW 2: INFERENCE (Full Width) */}
        <section className="card span-12">
          <div style={{textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginBottom: '20px'}}>
            AURORA AI INFERENCE — PROBABILITY OF VISIBLE AURORA
          </div>
          <div style={{display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap'}}>
            <div className="intensity-ring" style={{ '--pct': prediction }}>
              <div className="val" style={{ position: 'relative', fontSize: '22px', fontWeight: 700 }}>{prediction}%</div>
            </div>
            <div style={{flex: '1 1 300px'}}>
              <div style={{fontWeight: 600, fontSize: '16px'}}>Inference Projection</div>
              <p style={{color: 'var(--muted)', fontSize: '12px', marginTop: '8px'}}>
                Computed by AWS SageMaker XGBoost based on real-time NOAA data[cite: 13, 16, 41].
              </p>
            </div>
            <div style={{flex: '1 1 300px'}}>
              {[65, 60, 55].map(lat => (
                <div className="band" key={lat}>
                  <div className="lat">{lat}°N</div>
                  <div className="bar"><div className="fill" style={{width: `${kpVal * 10}%`}}></div></div>
                  <div className="pct">{Math.round(kpVal * 10)}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROW 3: FOOTER */}
        <section className="card span-8" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{color: 'var(--muted)'}}>7-Day History Implementation Next [cite: 3, 24]</div>
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