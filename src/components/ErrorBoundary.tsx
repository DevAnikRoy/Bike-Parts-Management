import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty" style={{ padding: 24 }}>
          <h1>কিছু একটা ভুল হয়েছে</h1>
          <p className="muted">পেজ রিফ্রেশ করে আবার চেষ্টা করুন। সমস্যা থাকলে লগআউট করে লগইন করুন।</p>
          <button type="button" className="btn" onClick={() => window.location.assign('/')}>
            হোমে যান
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
