import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="forensic-panel view-error" role="alert"><AlertTriangle size={32} /><h2>This view could not be displayed</h2><p>Your report and the other views are still available. Retry this view, or choose another section.</p><button type="button" className="btn btn-outline" onClick={() => this.setState({ failed: false })}><RotateCcw size={16} /> Retry view</button></section>;
  }
}
