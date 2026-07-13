/**
 * Military Pass - Performance Baseline Measurement
 * =================================================
 * API endpoint to establish performance baseline before optimization
 */

import { NextRequest, NextResponse } from "next/server";
import { getPerformanceMonitor } from "@/lib/performanceMonitor";

export async function POST(request: NextRequest) {
  const monitor = getPerformanceMonitor();
  
  try {
    const body = await request.json();
    const { operation, iterations = 10 } = body;
    
    if (!operation) {
      return NextResponse.json({ error: "Missing operation parameter" }, { status: 400 });
    }

    // Run baseline measurement
    const measurements: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      // Simulate operation (replace with actual operation call)
      await measureOperation(operation);
      
      const duration = performance.now() - start;
      measurements.push(duration);
      monitor.track(`${operation}_baseline`, duration);
    }

    // Calculate statistics
    const sorted = measurements.sort((a, b) => a - b);
    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const baseline = {
      operation,
      iterations,
      measurements: {
        avg: avg.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        p50: p50.toFixed(2),
        p95: p95.toFixed(2),
        p99: p99.toFixed(2),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, baseline });
  } catch (error) {
    console.error("[Baseline measurement error]", error);
    return NextResponse.json({ error: "Baseline measurement failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const monitor = getPerformanceMonitor();
  const report = monitor.getReport() as PerformanceReport;
  
  return NextResponse.json({
    success: true,
    currentBaseline: report,
    recommendations: generateRecommendations(report),
  });
}

async function measureOperation(operation: string): Promise<void> {
  // Simulate different operations with their typical latencies
  const delays: Record<string, number> = {
    'face_swap': 80,
    'voice_transform': 120,
    'api_call': 50,
    'gpu_operation': 30,
    'network_request': 100,
  };
  
  const delay = delays[operation] || 50;
  await new Promise(resolve => setTimeout(resolve, delay));
}

interface OperationStats {
  avgLatency: number;
  errorRate: number;
  count?: number;
}

interface PerformanceReport {
  overall: OperationStats;
  byOperation: Record<string, OperationStats>;
}

function generateRecommendations(report: PerformanceReport): string[] {
  const recommendations: string[] = [];
  const { overall, byOperation } = report;

  // Face swap recommendations
  if (byOperation.face_swap && byOperation.face_swap.avgLatency > 50) {
    recommendations.push("Face swap latency >50ms: Consider TensorRT optimization");
  }
  if (byOperation.face_swap && byOperation.face_swap.avgLatency > 30) {
    recommendations.push("Face swap latency >30ms: Implement CUDA stream parallelization");
  }

  // Voice transform recommendations
  if (byOperation.voice_transform && byOperation.voice_transform.avgLatency > 100) {
    recommendations.push("Voice transform latency >100ms: Optimize WORLD vocoder implementation");
  }

  // GPU recommendations
  if (byOperation.gpu_operation && byOperation.gpu_operation.avgLatency > 20) {
    recommendations.push("GPU operation latency >20ms: Implement zero-copy GPU operations");
  }

  // Network recommendations
  if (byOperation.network_request && byOperation.network_request.avgLatency > 80) {
    recommendations.push("Network latency >80ms: Implement WebSocket communication");
  }

  // Overall recommendations
  if (overall.avgLatency > 40) {
    recommendations.push("Overall latency >40ms: Implement multi-stage processing pipeline");
  }
  if (overall.errorRate > 5) {
    recommendations.push("Error rate >5%: Implement retry logic with exponential backoff");
  }

  if (recommendations.length === 0) {
    recommendations.push("Performance is within acceptable ranges");
  }

  return recommendations;
}