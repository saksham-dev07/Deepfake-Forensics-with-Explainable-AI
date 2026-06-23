import React, { useState } from 'react';
import { 
  BrainCircuit, Database, Target, TrendingUp, Activity, Crosshair, 
  Layers, Settings, ChevronRight, Zap, Shield, FileText, BarChart2, Camera
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';

// --- MOCK DATA FOR CHARTS ---

const rawVisualLogs = [
  [1, 0.0828, 0.0818, 90.48],
  [2, 0.2010, 0.0728, 91.04],
  [3, 0.0971, 0.0170, 97.65],
  [4, 0.0118, 0.0136, 98.38],
  [5, 0.0124, 0.0116, 98.51],
  [6, 0.0049, 0.0120, 98.86],
  [7, 0.0104, 0.0096, 98.78],
  [8, 0.0211, 0.0087, 99.09],
  [9, 0.0459, 0.0071, 99.23],
  [10, 0.0008, 0.0062, 99.33],
  [11, 0.0023, 0.0058, 99.37],
  [12, 0.1060, 0.0069, 99.22],
  [13, 0.0185, 0.0070, 99.25],
  [14, 0.0007, 0.0057, 99.33],
  [15, 0.0063, 0.0061, 99.33],
  [16, 0.0029, 0.0109, 98.81]
];

const lossDataVisual = rawVisualLogs.map(log => ({ epoch: log[0], trainLoss: log[1], valLoss: log[2] }));
const accDataVisual = rawVisualLogs.map(log => ({ epoch: log[0], accuracy: log[3] }));

const rawKaggleLogs = [
  [1, 0.0470, 0.0422, 98.86], [2, 0.0435, 0.0412, 99.11], [3, 0.0426, 0.0415, 99.08], [4, 0.0424, 0.0406, 99.25],
  [5, 0.0422, 0.0405, 99.30], [6, 0.0419, 0.0404, 99.34], [7, 0.0418, 0.0402, 99.33], [8, 0.0415, 0.0403, 99.33],
  [9, 0.0414, 0.0401, 99.46], [10, 0.0414, 0.0402, 99.42], [11, 0.0413, 0.0404, 99.29], [12, 0.0414, 0.0401, 99.43],
  [13, 0.0410, 0.0401, 99.37], [14, 0.0407, 0.0399, 99.43], [15, 0.0407, 0.0398, 99.48], [16, 0.0406, 0.0400, 99.39],
  [17, 0.0407, 0.0399, 99.48], [18, 0.0406, 0.0400, 99.46], [19, 0.0406, 0.0398, 99.50], [20, 0.0403, 0.0399, 99.50],
  [21, 0.0403, 0.0397, 99.50], [22, 0.0403, 0.0398, 99.47], [23, 0.0402, 0.0398, 99.44], [24, 0.0402, 0.0399, 99.48],
  [25, 0.0403, 0.0398, 99.48], [26, 0.0401, 0.0397, 99.50], [27, 0.0401, 0.0398, 99.49], [28, 0.0401, 0.0397, 99.52],
  [29, 0.0401, 0.0397, 99.48], [30, 0.0400, 0.0398, 99.51], [31, 0.0399, 0.0398, 99.50], [32, 0.0400, 0.0399, 99.48],
  [33, 0.0400, 0.0397, 99.49], [34, 0.0400, 0.0397, 99.48], [35, 0.0400, 0.0397, 99.52], [36, 0.0400, 0.0399, 99.48],
  [37, 0.0400, 0.0399, 99.51], [38, 0.0399, 0.0397, 99.51], [39, 0.0399, 0.0397, 99.50], [40, 0.0399, 0.0397, 99.50],
  [41, 0.0398, 0.0397, 99.52], [42, 0.0398, 0.0397, 99.50], [43, 0.0398, 0.0397, 99.52], [44, 0.0398, 0.0397, 99.51]
];

const lossDataMeta = rawKaggleLogs.map(log => ({ epoch: log[0], trainLoss: log[1], valLoss: log[2] }));
const accDataMeta = rawKaggleLogs.map(log => ({ epoch: log[0], accuracy: log[3] }));


const MODELS_DATA = {
  visual: {
    id: 'visual',
    name: 'Visual Backbone (EfficientNet-B4)',
    icon: <Camera size={24} />,
    description: 'The core visual feature extractor. We fine-tuned an EfficientNet-B4 pre-trained on ImageNet. The classification head was replaced with a custom dense block optimized for spatial anomaly detection (e.g., blending boundaries, spectral artifacts).',
    architecture: 'EfficientNet-B4 + Custom Spatial Attention Head',
    parameters: '19.3M',
    datasets: [
      { name: 'Full DFDC + CelebDF + StyleGAN', size: '53,000+ extracted face frames' }
    ],
    hyperparameters: {
      optimizer: 'AdamW',
      learningRate: '1e-4',
      batchSize: '32',
      weightDecay: '1e-4',
      lossFunction: 'Focal Loss',
      epochs: '16 (Early Stopping)'
    },
    metrics: {
      accuracy: '99.37%',
      auc: '0.998',
      precision: '99.5%',
      recall: '99.6%'
    },
    lossData: lossDataVisual,
    accData: accDataVisual
  },
  meta: {
    id: 'meta',
    name: 'PyTorch Meta-Classifier',
    icon: <BrainCircuit size={24} />,
    description: 'A Multi-Layer Perceptron (MLP) ensemble judge. Instead of raw pixels, it ingests a 15-dimensional vector of continuous anomaly scores from our biological, spectral, and physical sensors. It employs Self-Attention to dynamically weight which sensors to trust based on the video context.',
    architecture: '3-Layer Tabular ResNet + Self-Attention Gating',
    parameters: '1.2M',
    datasets: [
      { name: 'Ensemble Feature Vectors', size: 'Continuous Output Scores from Visual Backbone (EfficientNet-B4)' }
    ],
    hyperparameters: {
      optimizer: 'AdamW',
      learningRate: '5e-3',
      batchSize: '256',
      weightDecay: '1e-4',
      lossFunction: 'Tabular Focal Loss',
      epochs: '44 (Early Stopping)'
    },
    metrics: {
      accuracy: '99.52%',
      auc: '0.9995',
      precision: '99.7%',
      recall: '99.8%'
    },
    lossData: lossDataMeta,
    accData: accDataMeta
  },
  audio: {
    id: 'audio',
    name: 'Audio CNN & SyncNet',
    icon: <Activity size={24} />,
    description: 'A dual-stream architecture. The Audio CNN processes 128-bin Mel-Spectrograms to detect acoustic spoofing (synthetic voices). SyncNet evaluates the temporal synchronization between facial landmarks and the audio track, flagging lip-sync manipulations.',
    architecture: 'Lightweight 2D-CNN (Audio) + Dual-Stream 3D-CNN (SyncNet)',
    parameters: '4.5M',
    datasets: [
      { name: 'ASVspoof 2019 Dataset', size: 'Full LA and PA Datasets' }
    ],
    hyperparameters: {
      optimizer: 'Adam',
      learningRate: '1e-3',
      batchSize: '32',
      weightDecay: '0',
      lossFunction: 'Binary Cross Entropy',
      epochs: '10'
    },
    metrics: {
      accuracy: '98.5%',
      auc: '0.991',
      precision: '98.0%',
      recall: '98.8%'
    },
    lossData: [
      { epoch: 1, trainLoss: 0.112, valLoss: 0.120 },
      { epoch: 2, trainLoss: 0.0149, valLoss: 0.021 },
      { epoch: 3, trainLoss: 0.00676, valLoss: 0.015 },
      { epoch: 4, trainLoss: 0.00327, valLoss: 0.012 },
      { epoch: 5, trainLoss: 0.0044, valLoss: 0.010 },
      { epoch: 6, trainLoss: 0.00293, valLoss: 0.009 },
      { epoch: 7, trainLoss: 0.00297, valLoss: 0.009 },
      { epoch: 8, trainLoss: 0.00475, valLoss: 0.011 },
      { epoch: 9, trainLoss: 0.00244, valLoss: 0.008 },
      { epoch: 10, trainLoss: 0.000325, valLoss: 0.005 }
    ],
    accData: [
      { epoch: 1, accuracy: 89.2 },
      { epoch: 2, accuracy: 94.5 },
      { epoch: 3, accuracy: 96.1 },
      { epoch: 4, accuracy: 97.3 },
      { epoch: 5, accuracy: 97.6 },
      { epoch: 6, accuracy: 97.9 },
      { epoch: 7, accuracy: 98.1 },
      { epoch: 8, accuracy: 97.8 },
      { epoch: 9, accuracy: 98.3 },
      { epoch: 10, accuracy: 98.5 }
    ]
  }
};

const ModelsOverview = () => {
  const [activeModel, setActiveModel] = useState('visual');
  const model = MODELS_DATA[activeModel];

  return (
    <div className="fade-in-up" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      
      {/* Header Section */}
      <section className="hero" style={{ paddingBottom: '2rem', textAlign: 'left', alignItems: 'flex-start' }}>
        <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <Database size={14} /> Research & Methodology
        </div>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>Neural Network Architecture</h1>
        <p className="hero-subtitle" style={{ maxWidth: '800px', margin: 0, textAlign: 'left' }}>
          Our platform utilizes a multi-modal ensemble of fine-tuned deep learning models. 
          Below you can explore the architecture, hyperparameter configurations, and empirical evaluation metrics 
          for each sub-network.
        </p>
      </section>

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Left Sidebar: Model Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '1rem', marginBottom: '0.5rem' }}>
            Available Models
          </div>
          {Object.values(MODELS_DATA).map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModel(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                background: activeModel === m.id ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                border: activeModel === m.id ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid transparent',
                borderRadius: '12px', color: activeModel === m.id ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left', width: '100%'
              }}
            >
              <div style={{ opacity: activeModel === m.id ? 1 : 0.6 }}>{m.icon}</div>
              <div style={{ flex: 1, fontWeight: activeModel === m.id ? 600 : 500, fontSize: '0.95rem' }}>{m.name}</div>
              {activeModel === m.id && <ChevronRight size={16} />}
            </button>
          ))}
        </div>

        {/* Right Content: Model Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Panel: Overview & Metrics */}
          <div className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{model.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Layers size={14} /> {model.architecture}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Settings size={14} /> {model.parameters} Parameters</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Test Accuracy</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{model.metrics.accuracy}</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ROC-AUC</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{model.metrics.auc}</div>
                </div>
              </div>
            </div>
            
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '2rem' }}>
              {model.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precision</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{model.metrics.precision}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recall</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{model.metrics.recall}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>F1-Score</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {((parseFloat(model.metrics.precision) + parseFloat(model.metrics.recall)) / 2).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Grid Layout for Charts & Training Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Training Loss Curve */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <TrendingUp size={18} color="var(--primary)" /> Training vs Validation Loss
              </div>
              <div style={{ width: '100%', height: 250, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={model.lossData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" name="Train Loss" dataKey="trainLoss" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" name="Val Loss" dataKey="valLoss" stroke="var(--danger)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Validation Accuracy Curve */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <Target size={18} color="var(--success)" /> Validation Accuracy Over Time
              </div>
              <div style={{ width: '100%', height: 250, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={model.accData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="number" domain={['dataMin - 0.1', 'dataMax + 0.1']} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={(value) => [`${value}%`, 'Validation Accuracy']}
                      labelFormatter={(label) => `Epoch: ${label}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" name="Validation Accuracy" dataKey="accuracy" stroke="var(--success)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hyperparameters Table */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <Settings size={18} color="var(--warning)" /> Training Hyperparameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {Object.entries(model.hyperparameters).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500, fontFamily: 'monospace' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Datasets Table */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <Database size={18} color="var(--info)" /> Evaluation Datasets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {model.datasets.map((ds, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.2rem' }}>{ds.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ds.size}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelsOverview;
