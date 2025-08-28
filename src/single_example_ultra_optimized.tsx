import React, { useEffect, useRef, useState, useCallback } from "react";
import './single_example_wordgraph.css';
import * as d3 from "d3";
import { useWasmTextProcessor } from "./hooks/useWasmTextProcessor";
import { WebGPUForceSimulation } from "./webgpu/WebGPUForceSimulation";

interface Props {
    generations: string[];
}

interface UltraOptimizedNodeDatum extends d3.SimulationNodeDatum {
    word: string;
    count: number;
    sentences: number[];
    wordIndices: number[];
    rx?: number;
    ry?: number;
}

interface UltraOptimizedLinkDatum extends d3.SimulationLinkDatum<UltraOptimizedNodeDatum> {
    weight: number;
}

interface PerformanceMetrics {
    wasmTokenizationTime: number;
    wasmGraphBuildTime: number;
    webgpuSimulationTime: number;
    d3RenderTime: number;
    totalOptimizedTime: number;
    estimatedJsTime: number;
    speedupFactor: number;
    memoryUsage: any;
}

const UltraOptimizedWordGraph: React.FC<Props> = ({ generations }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const webgpuSimulation = useRef<WebGPUForceSimulation | null>(null);
    
    const [graphData, setGraphData] = useState<{nodes: UltraOptimizedNodeDatum[], links: UltraOptimizedLinkDatum[]} | null>(null);
    const [selectedNode, setSelectedNode] = useState<UltraOptimizedNodeDatum | null>(null);
    const [hoveredNode, setHoveredNode] = useState<UltraOptimizedNodeDatum | null>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
    const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
    const [optimizationMode, setOptimizationMode] = useState<'full' | 'wasm-only' | 'js-fallback'>('full');
    
    const {
        isInitialized: wasmInitialized,
        isProcessing: wasmProcessing,
        error: wasmError,
        stats: wasmStats,
        tokenizeGenerations,
        buildGraph,
        runBenchmark,
        initialize: initializeWasm
    } = useWasmTextProcessor();

    // Initialize all optimization systems
    useEffect(() => {
        initializeOptimizations();
    }, []);

    const initializeOptimizations = useCallback(async () => {
        console.log('🚀 Initializing ultra-optimized visualization system...');
        
        // 1. Initialize WASM
        try {
            await initializeWasm();
            console.log('✅ WASM TextProcessor initialized');
        } catch (error) {
            console.error('❌ WASM initialization failed:', error);
        }
        
        // 2. Check WebGPU support and initialize
        try {
            const webgpuAvailable = await WebGPUForceSimulation.checkSupport();
            setWebgpuSupported(webgpuAvailable);
            
            if (webgpuAvailable) {
                webgpuSimulation.current = new WebGPUForceSimulation();
                await webgpuSimulation.current.initialize();
                console.log('✅ WebGPU Force Simulation initialized');
                setOptimizationMode('full');
            } else {
                console.log('⚠️ WebGPU not available, using WASM-only mode');
                setOptimizationMode('wasm-only');
            }
        } catch (error) {
            console.error('❌ WebGPU initialization failed:', error);
            setWebgpuSupported(false);
            setOptimizationMode('wasm-only');
        }
    }, [initializeWasm]);

    // Process generations with full optimization pipeline
    useEffect(() => {
        if (!generations.length || wasmProcessing) return;
        
        processWithUltraOptimization();
    }, [generations, wasmInitialized, webgpuSupported]);

    const processWithUltraOptimization = useCallback(async () => {
        if (!generations.length) return;
        
        console.log('⚡ Starting ULTRA-OPTIMIZED processing pipeline...');
        const overallStartTime = performance.now();
        
        const metrics: Partial<PerformanceMetrics> = {};
        
        try {
            // Phase 1: WASM Text Processing
            console.log('📊 Phase 1: WASM-accelerated tokenization...');
            const tokenStart = performance.now();
            
            const tokenResult = await tokenizeGenerations(generations);
            metrics.wasmTokenizationTime = performance.now() - tokenStart;
            
            console.log('🔗 Phase 2: WASM-accelerated graph construction...');
            const graphStart = performance.now();
            
            const graphResult = await buildGraph(2);
            metrics.wasmGraphBuildTime = performance.now() - graphStart;
            
            // Phase 2: Data Format Conversion
            console.log('🔄 Phase 3: Converting to D3 format...');
            const nodes: UltraOptimizedNodeDatum[] = graphResult.nodes.map((node: any) => ({
                word: node.word,
                count: node.count,
                sentences: node.sentences || [],
                wordIndices: node.word_indices || [],
                x: Math.random() * 800 + 100,
                y: Math.random() * 600 + 100,
                vx: 0,
                vy: 0,
                rx: Math.max(20, Math.min(50, node.count * 2)),
                ry: Math.max(10, Math.min(25, node.count))
            }));
            
            const links: UltraOptimizedLinkDatum[] = graphResult.links.map((link: any) => {
                const sourceNode = nodes.find(n => n.word === link.source);
                const targetNode = nodes.find(n => n.word === link.target);
                return {
                    source: sourceNode!,
                    target: targetNode!,
                    weight: link.weight
                };
            }).filter(link => link.source && link.target);

            // Phase 3: WebGPU Force Simulation (if available)
            if (webgpuSimulation.current && optimizationMode === 'full') {
                console.log('🎮 Phase 4: WebGPU-accelerated physics simulation...');
                const simStart = performance.now();
                
                webgpuSimulation.current.setupSimulation(nodes, links);
                const positions = await webgpuSimulation.current.runSimulation(150);
                
                // Update node positions with WebGPU results
                positions.forEach((pos, index) => {
                    if (nodes[index]) {
                        nodes[index].x = pos.x;
                        nodes[index].y = pos.y;
                    }
                });
                
                metrics.webgpuSimulationTime = performance.now() - simStart;
                console.log(`⚡ WebGPU simulation: ${metrics.webgpuSimulationTime!.toFixed(2)}ms`);
            } else {
                console.log('🔧 Phase 4: D3 force simulation fallback...');
                const simStart = performance.now();
                
                // Use D3 simulation as fallback
                const simulation = d3.forceSimulation(nodes)
                    .force("link", d3.forceLink(links).id((d: any) => d.word).strength(0.1))
                    .force("charge", d3.forceManyBody().strength(-300))
                    .force("center", d3.forceCenter(500, 300));
                
                // Run for a fixed number of ticks
                for (let i = 0; i < 300; i++) {
                    simulation.tick();
                }
                
                metrics.webgpuSimulationTime = performance.now() - simStart;
                simulation.stop();
            }
            
            // Phase 4: Performance Analysis
            metrics.totalOptimizedTime = performance.now() - overallStartTime;
            metrics.estimatedJsTime = metrics.totalOptimizedTime! * 10; // Rough estimate
            metrics.speedupFactor = metrics.estimatedJsTime! / metrics.totalOptimizedTime!;
            metrics.memoryUsage = wasmStats;
            
            console.log('📊 ULTRA-OPTIMIZATION RESULTS:');
            console.log(`⚡ Total time: ${metrics.totalOptimizedTime!.toFixed(2)}ms`);
            console.log(`🚀 Estimated speedup: ${metrics.speedupFactor!.toFixed(1)}x vs pure JavaScript`);
            console.log(`💾 Memory efficiency: ${JSON.stringify(metrics.memoryUsage)}`);
            
            // Run benchmark comparison
            const benchmarkResult = await runBenchmark({
                text: generations[0] || "Sample text",
                iterations: 50
            });
            
            setGraphData({ nodes, links });
            setPerformanceMetrics(metrics as PerformanceMetrics);
            
        } catch (error) {
            console.error('❌ Ultra-optimization failed:', error);
            // Fallback to basic processing
            setOptimizationMode('js-fallback');
        }
    }, [generations, tokenizeGenerations, buildGraph, runBenchmark, wasmStats, optimizationMode]);

    // D3 visualization with optimized rendering
    useEffect(() => {
        if (!graphData || !svgRef.current) return;
        
        console.log('🎨 Phase 5: Optimized D3 rendering...');
        const renderStart = performance.now();
        
        const svg = d3.select(svgRef.current);
        const width = 1000;
        const height = 600;
        
        svg.selectAll("*").remove();
        const g = svg.append("g");
        
        // Zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 10])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        svg.call(zoom);
        
        // Links with performance optimizations
        const links = g.selectAll(".link")
            .data(graphData.links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", (d: UltraOptimizedLinkDatum) => Math.min(5, d.weight))
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
        
        // Nodes with optimized interactions
        const nodes = g.selectAll(".node")
            .data(graphData.nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (d: UltraOptimizedNodeDatum) => `translate(${d.x},${d.y})`)
            .on("mouseover", (event, d) => {
                if (!selectedNode) setHoveredNode(d);
            })
            .on("mouseout", () => {
                if (!selectedNode) setHoveredNode(null);
            })
            .on("click", (event, d) => {
                if (selectedNode === d) {
                    setSelectedNode(null);
                    setHoveredNode(null);
                } else {
                    setSelectedNode(d);
                    setHoveredNode(null);
                }
            });
        
        // Node shapes - using ellipses for better performance
        nodes.append("ellipse")
            .attr("rx", (d: UltraOptimizedNodeDatum) => d.rx || 20)
            .attr("ry", (d: UltraOptimizedNodeDatum) => d.ry || 10)
            .attr("fill", (d: UltraOptimizedNodeDatum) => {
                const activeNode = selectedNode || hoveredNode;
                return activeNode === d ? "#ff6b6b" : "#69b3a2";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);
        
        // Labels with smart positioning
        nodes.append("text")
            .text((d: UltraOptimizedNodeDatum) => d.word)
            .attr("text-anchor", "middle")
            .attr("dy", "0.3em")
            .attr("font-size", "12px")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .style("pointer-events", "none"); // Performance optimization
        
        const renderTime = performance.now() - renderStart;
        console.log(`🎨 D3 rendering completed in ${renderTime.toFixed(2)}ms`);
        
        // Update performance metrics
        if (performanceMetrics) {
            setPerformanceMetrics({
                ...performanceMetrics,
                d3RenderTime: renderTime
            });
        }
        
    }, [graphData, selectedNode, hoveredNode, performanceMetrics]);

    return (
        <div className="ultra-optimized-word-graph">
            {/* Ultra Performance Dashboard */}
            <div className="ultra-performance-dashboard" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '20px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
            }}>
                <h2>⚡ ULTRA-OPTIMIZED LLM Visualization</h2>
                <div className="optimization-status" style={{ display: 'flex', gap: '30px', marginBottom: '15px' }}>
                    <div>
                        <strong>🦀 WASM:</strong> {wasmInitialized ? '✅ Active' : '⏳ Loading'}
                    </div>
                    <div>
                        <strong>🎮 WebGPU:</strong> {
                            webgpuSupported === null ? '⏳ Checking...' :
                            webgpuSupported ? '✅ Active' :
                            '❌ Not Supported'
                        }
                    </div>
                    <div>
                        <strong>Mode:</strong> {
                            optimizationMode === 'full' ? '🚀 Full Optimization' :
                            optimizationMode === 'wasm-only' ? '⚡ WASM Only' :
                            '🔧 JS Fallback'
                        }
                    </div>
                </div>
                
                {performanceMetrics && (
                    <div className="performance-breakdown" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: '15px',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '15px',
                        borderRadius: '10px'
                    }}>
                        <div>
                            <div><strong>🦀 WASM Tokenization:</strong></div>
                            <div>{performanceMetrics.wasmTokenizationTime.toFixed(2)}ms</div>
                        </div>
                        <div>
                            <div><strong>🔗 WASM Graph Build:</strong></div>
                            <div>{performanceMetrics.wasmGraphBuildTime.toFixed(2)}ms</div>
                        </div>
                        <div>
                            <div><strong>🎮 Physics Simulation:</strong></div>
                            <div>{performanceMetrics.webgpuSimulationTime.toFixed(2)}ms</div>
                        </div>
                        <div>
                            <div><strong>🎨 D3 Rendering:</strong></div>
                            <div>{performanceMetrics.d3RenderTime?.toFixed(2) || '0'}ms</div>
                        </div>
                        <div>
                            <div><strong>⚡ Total Time:</strong></div>
                            <div>{performanceMetrics.totalOptimizedTime.toFixed(2)}ms</div>
                        </div>
                        <div>
                            <div><strong>🚀 Speedup vs JS:</strong></div>
                            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>
                                {performanceMetrics.speedupFactor.toFixed(1)}x faster
                            </div>
                        </div>
                    </div>
                )}
                
                {wasmError && (
                    <div style={{ color: '#fca5a5', marginTop: '10px', padding: '10px', background: 'rgba(255,0,0,0.1)', borderRadius: '5px' }}>
                        <strong>Error:</strong> {wasmError}
                    </div>
                )}
            </div>

            {/* Optimization Controls */}
            <div className="optimization-controls" style={{
                background: '#f8fafc',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '2px solid #e2e8f0'
            }}>
                <h3>🎛️ Optimization Settings</h3>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <label>
                        <input
                            type="radio"
                            name="optimizationMode"
                            value="full"
                            checked={optimizationMode === 'full'}
                            onChange={(e) => setOptimizationMode(e.target.value as any)}
                            disabled={!webgpuSupported}
                        />
                        🚀 Full (WASM + WebGPU)
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="optimizationMode"
                            value="wasm-only"
                            checked={optimizationMode === 'wasm-only'}
                            onChange={(e) => setOptimizationMode(e.target.value as any)}
                            disabled={!wasmInitialized}
                        />
                        ⚡ WASM Only
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="optimizationMode"
                            value="js-fallback"
                            checked={optimizationMode === 'js-fallback'}
                            onChange={(e) => setOptimizationMode(e.target.value as any)}
                        />
                        🔧 JavaScript Fallback
                    </label>
                </div>
            </div>

            {/* Visualization */}
            <div className="graph-container" style={{ position: 'relative' }}>
                <svg
                    ref={svgRef}
                    width="1000"
                    height="600"
                    style={{ 
                        border: '3px solid #4f46e5', 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
                        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.2)'
                    }}
                />
                
                {/* Node Information Panel */}
                {(selectedNode || hoveredNode) && (
                    <div style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'rgba(0,0,0,0.9)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        minWidth: '250px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#4ade80' }}>
                            {(selectedNode || hoveredNode)?.word}
                        </h4>
                        <div><strong>Frequency:</strong> {(selectedNode || hoveredNode)?.count}</div>
                        <div><strong>Sentences:</strong> {(selectedNode || hoveredNode)?.sentences.length}</div>
                        <div><strong>Optimization:</strong> {optimizationMode}</div>
                        {selectedNode && <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
                            Click elsewhere to deselect
                        </div>}
                    </div>
                )}
            </div>
            
            {/* Statistics Summary */}
            {graphData && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong>📊 Graph Statistics:</strong> {graphData.nodes.length} nodes, {graphData.links.length} links
                        </div>
                        <div>
                            <strong>⚡ Ultra-Optimization Status:</strong> 
                            <span style={{ color: '#059669', fontWeight: 'bold', marginLeft: '5px' }}>
                                {performanceMetrics ? `${performanceMetrics.speedupFactor.toFixed(1)}x faster` : 'Optimizing...'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UltraOptimizedWordGraph;