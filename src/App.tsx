import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Layers, 
  Radio, 
  BrainCircuit, 
  Sliders, 
  Bell, 
  Wrench, 
  BarChart3, 
  Cpu,
  AlertTriangle,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { DigitalTwinViewer } from './components/DigitalTwinViewer';
import { SensorTrendsView } from './components/SensorTrendsView';
import { VibrationFFTView } from './components/VibrationFFTView';
import { AIMLView } from './components/AIMLView';
import { SimulatorControlsView } from './components/SimulatorControlsView';
import { AlertsView } from './components/AlertsView';
import { MaintenanceView } from './components/MaintenanceView';
import { AnalyticsOEEView } from './components/AnalyticsOEEView';
import { ESP32View } from './components/ESP32View';
import { 
  Telemetry, 
  Features, 
  Predictions, 
  DigitalTwinState, 
  Alert, 
  MaintenanceRecord, 
  Statistics 
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('twin');
  const [mqttConnected, setMqttConnected] = useState<boolean>(true);
  const [connectionLost, setConnectionLost] = useState<boolean>(false);

  // Core Real-Time State
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwinState | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<Telemetry[]>([]);

  // Simulator / Demo State
  const [simMode, setSimMode] = useState<string>('NORMAL');
  const [simLoad, setSimLoad] = useState<number>(65.0);
  const [simDegradation, setSimDegradation] = useState<number>(0.0);
  const [demoActive, setDemoActive] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);

  // Active Critical Banner
  const [toastAlert, setToastAlert] = useState<Alert | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Establish Real-Time WebSocket stream (Section 33 requirements)
  useEffect(() => {
    let reconnectTimeout: any;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/machine/MTR-001`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setMqttConnected(true);
        setConnectionLost(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_STATE' || data.type === 'STREAM_UPDATE') {
            if (data.telemetry) {
              setTelemetry(data.telemetry);
              setTelemetryHistory((prev) => [...prev.slice(-60), data.telemetry]);
              if (data.telemetry.operating_mode) setSimMode(data.telemetry.operating_mode);
              if (data.telemetry.load) setSimLoad(data.telemetry.load);
              if (data.telemetry.degradation !== undefined) setSimDegradation(data.telemetry.degradation);
            }
            if (data.features) setFeatures(data.features);
            if (data.predictions) setPredictions(data.predictions);
            if (data.digital_twin) setDigitalTwin(data.digital_twin);
            if (data.recent_alerts) setAlerts(data.recent_alerts);
            if (data.new_alerts && data.new_alerts.length > 0) {
              setAlerts((prev) => [...data.new_alerts, ...prev].slice(0, 50));
              // Trigger toast for critical alerts
              const crit = data.new_alerts.find((a: Alert) => a.severity === 'CRITICAL');
              if (crit) {
                setToastAlert(crit);
                setTimeout(() => setToastAlert(null), 8000);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setMqttConnected(false);
        setConnectionLost(true);
        // Retry connection after 2 seconds
        reconnectTimeout = setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        setMqttConnected(false);
      };
    };

    connectWs();

    // Initial fetch of maintenance & statistics
    fetch('/api/maintenance')
      .then((r) => r.json())
      .then((data) => setMaintenanceRecords(data))
      .catch((err) => console.error(err));

    fetch('/api/statistics/MTR-001')
      .then((r) => r.json())
      .then((data) => setStatistics(data))
      .catch((err) => console.error(err));

    fetch('/api/simulator/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.mode) setSimMode(data.mode);
        if (data.demo_active !== undefined) setDemoActive(data.demo_active);
        if (data.demo_step !== undefined) setDemoStep(data.demo_step);
      })
      .catch((err) => console.error(err));

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Poll simulator status to keep demo progress indicator synchronized
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/simulator/status')
        .then((r) => r.json())
        .then((data) => {
          setDemoActive(data.demo_active);
          setDemoStep(data.demo_step);
          setSimMode(data.mode);
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulator fault mode dispatcher (flows through backend MQTT pipeline)
  const handleSetSimulatorMode = async (mode: string, load?: number, degradation?: number) => {
    try {
      const res = await fetch('/api/simulator/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, load, degradation }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSimMode(data.mode);
      }
    } catch (e) {
      console.error('Error changing simulator mode:', e);
    }
  };

  const handleToggleDemo = async () => {
    const action = demoActive ? 'stop' : 'start';
    try {
      await fetch(`/api/simulator/demo?action=${action}`, { method: 'POST' });
      setDemoActive(!demoActive);
    } catch (e) {
      console.error('Error toggling demo:', e);
    }
  };

  const handleAcknowledgeAlert = async (id: number) => {
    try {
      await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
    } catch (e) {
      console.error('Error acknowledging alert:', e);
    }
  };

  const handleAddMaintenance = async (record: {
    maintenance_type: string;
    description: string;
    technician: string;
    status: string;
    downtime: number;
  }) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: 'MTR-001', ...record }),
      });
      const created = await res.json();
      setMaintenanceRecords((prev) => [created, ...prev]);
    } catch (e) {
      console.error('Error logging maintenance record:', e);
    }
  };

  const criticalAlertsCount = alerts.filter(
    (a) => a.severity === 'CRITICAL' && !a.acknowledged
  ).length;

  const navTabs = [
    { id: 'twin', label: 'Digital Twin', icon: Layers },
    { id: 'trends', label: 'Sensor Trends', icon: Activity },
    { id: 'vibration', label: 'Vibration & FFT', icon: Radio },
    { id: 'ai', label: 'Predictive ML & RUL', icon: BrainCircuit },
    { id: 'simulator', label: 'Machine Simulator', icon: Sliders },
    { 
      id: 'alerts', 
      label: 'Alerts', 
      icon: Bell, 
      badge: criticalAlertsCount > 0 ? criticalAlertsCount : undefined 
    },
    { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
    { id: 'analytics', label: 'Analytics & OEE', icon: BarChart3 },
    { id: 'esp32', label: 'ESP32 Hardware', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased">
      {/* Connection Lost Notification Banner (Section 38 requirements) */}
      {connectionLost && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 px-4 py-2 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-rose-400 animate-pulse" />
            <span className="font-bold">MQTT CONNECTION LOST</span>
            <span>- Attempting automated reconnect to broker...</span>
          </div>
          <span className="text-[11px] text-rose-400">Reconnecting</span>
        </div>
      )}

      {/* Critical Floating Toast Alert */}
      {toastAlert && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-rose-950 border-2 border-rose-500 rounded-xl p-4 shadow-2xl animate-bounce">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase">
                  CRITICAL ALARM TRIP
                </span>
                <span className="text-[10px] text-rose-300 font-mono">
                  {toastAlert.alert_type}
                </span>
              </div>
              <p className="text-xs text-white font-bold mt-1">
                {toastAlert.message}
              </p>
              <p className="text-[11px] text-rose-200 mt-1">
                Action: {toastAlert.recommended_action}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Industrial SCADA Header */}
      <Header
        twin={digitalTwin}
        mqttConnected={mqttConnected}
        demoActive={demoActive}
        demoStep={demoStep}
        onToggleDemo={handleToggleDemo}
        criticalAlertsCount={criticalAlertsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* 8 Primary KPI Cards (Section 22 requirements) */}
        <KPICards
          telemetry={telemetry}
          features={features}
          predictions={predictions}
        />

        {/* Industrial Navigation Tabs */}
        <div className="border-b border-zinc-800 flex items-center gap-1 overflow-x-auto select-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs font-mono font-bold tracking-wide uppercase transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  active
                    ? 'border-cyan-400 text-white bg-zinc-900/60 shadow-sm'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tab View */}
        <div className="pt-1">
          {activeTab === 'twin' && (
            <div className="space-y-6">
              <DigitalTwinViewer twin={digitalTwin} />

              {/* Active Critical Alerts Quick Panel on Overview (Section 20 & 22) */}
              {alerts.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-400" />
                      Active Trip & Warning Events ({alerts.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab('alerts')}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
                    >
                      View All in Alerts Engine →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alerts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className={`p-3 rounded-lg border text-xs font-mono ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                            : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">[{a.severity}] {a.alert_type}</span>
                          <span className="text-[10px] text-zinc-400">{new Date(a.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-sans text-xs text-zinc-200">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <SensorTrendsView history={telemetryHistory} />
          )}

          {activeTab === 'vibration' && (
            <VibrationFFTView features={features} telemetry={telemetry} />
          )}

          {activeTab === 'ai' && (
            <AIMLView
              predictions={predictions}
              features={features}
              telemetry={telemetry}
              history={telemetryHistory}
            />
          )}

          {activeTab === 'simulator' && (
            <SimulatorControlsView
              currentMode={simMode}
              currentLoad={simLoad}
              currentDegradation={simDegradation}
              demoActive={demoActive}
              demoStep={demoStep}
              onSetMode={handleSetSimulatorMode}
              onToggleDemo={handleToggleDemo}
              telemetry={telemetry}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              records={maintenanceRecords}
              onAddRecord={handleAddMaintenance}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsOEEView stats={statistics} />
          )}

          {activeTab === 'esp32' && (
            <ESP32View />
          )}
        </div>
      </main>

      {/* Industrial SCADA Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-800/80 py-3 text-zinc-500 text-[11px] font-mono select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>PLANT: Plant Alpha • Sector 4</span>
            <span>•</span>
            <span>TAG: MTR-001 (Induction Drive Train)</span>
            <span>•</span>
            <span className="text-emerald-400">STATUS: ONLINE</span>
          </div>
          <div>
            <span>MQTT TOPIC: factory/motor/MTR-001/telemetry • SAMPLING: 1 Hz</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
