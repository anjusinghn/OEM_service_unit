"use client"
import { Component, type ReactNode } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl py-16">
          <TriangleAlert className="mb-4 h-10 w-10 text-watch" strokeWidth={1.5} />
          <p className="text-xl font-semibold text-foreground">Something went wrong</p>
          <p className="mt-2 max-w-md text-center text-[15px] text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button type="button" onClick={this.handleRetry} className="btn btn-sky mt-6">
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
