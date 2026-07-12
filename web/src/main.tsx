import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Last-resort guard: without a boundary, any uncaught render error unmounts the whole
// tree and leaves a blank white page with no way back but a manual reload.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: unknown }> {
  state = { err: null as unknown }
  static getDerivedStateFromError(err: unknown) {
    return { err }
  }
  render() {
    if (this.state.err != null) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center', background: '#edf4fc', color: '#0F1E33', fontFamily: 'Inter,system-ui,sans-serif' }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>Aster hit an unexpected error.</div>
          <div style={{ fontSize: 13.5, color: '#46556A' }}>Your data is untouched — reloading brings it right back.</div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, padding: '10px 22px', borderRadius: 999, border: '1px solid rgba(41,55,74,0.18)', background: '#ffffff', color: '#0F1E33', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 10px 26px rgba(40,70,130,0.1)' }}
          >
            Reload Aster
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
