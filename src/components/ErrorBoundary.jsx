import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/30 rounded-xl p-8 max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-gray-400 text-sm mb-4">{this.state.error?.message || "An unexpected error occurred"}</p>
            </div>
            <button
              onClick={this.reset}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-white font-medium transition-all"
              style={{ backgroundColor: "var(--color-primary,#f97316)" }}
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}