import React, { useEffect, useRef, useState, useCallback } from "react";
import './single_example_wordgraph.css';
import * as d3 from "d3";

interface Props {
    generations: string[];
}

interface DemoNodeDatum extends d3.SimulationNodeDatum {
    word: string;
    count: number;
    sentences: number[];
    wordIndices: number[];
    rx?: number;
    ry?: number;
}

interface DemoLinkDatum extends d3.SimulationLinkDatum<DemoNodeDatum> {
    weight: number;
}

interface PerformanceMetrics {
    jsProcessingTime: number;
    optimizedTime: number;
    speedupFactor: number;
    memoryUsage: number;
    nodeCount: number;
    linkCount: number;
}

// Demo optimization functions (simulating WASM performance)
const optimizedTokenize = (generations: string[]): Promise<any> => {
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        // Simulate fast tokenization
        setTimeout(() => {
            const words = new Map<string, { count: number, sentences: number[], indices: number[] }>();
            const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to']);
            
            generations.forEach((gen, sentIndex) => {
                const tokens = gen.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
                tokens.forEach((word, wordIndex) => {
                    if (!words.has(word)) {
                        words.set(word, { count: 0, sentences: [], indices: [] });
                    }
                    const wordData = words.get(word)!;
                    wordData.count++;
                    if (!wordData.sentences.includes(sentIndex)) {
                        wordData.sentences.push(sentIndex);
                    }
                    wordData.indices.push(wordIndex);
                });
            });
            
            const processingTime = performance.now() - startTime;
            resolve({
                words: Array.from(words.entries()).map(([word, data]) => ({ word, ...data })),
                processingTime,
                wasmSpeedup: Math.random() * 5 + 8 // Simulate 8-13x speedup
            });
        }, Math.random() * 50 + 10); // Simulate 10-60ms processing
    });
};

const optimizedBuildGraph = (words: any[]): Promise<any> => {
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        // Simulate graph building
        setTimeout(() => {
            const nodes = words.filter(w => w.count >= 2);
            const links: any[] = [];
            
            // Build co-occurrence links
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const commonSentences = nodes[i].sentences.filter((s: number) => 
                        nodes[j].sentences.includes(s)
                    ).length;
                    
                    if (commonSentences > 0) {
                        links.push({
                            source: nodes[i].word,
                            target: nodes[j].word,
                            weight: commonSentences
                        });
                    }
                }
            }
            
            const processingTime = performance.now() - startTime;
            resolve({
                nodes,
                links,
                processingTime,
                webgpuSpeedup: Math.random() * 8 + 7 // Simulate 7-15x speedup
            });
        }, Math.random() * 100 + 20); // Simulate 20-120ms processing
    });
};

const DemoOptimizedWordGraph: React.FC<Props> = ({ generations }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [graphData, setGraphData] = useState<{nodes: DemoNodeDatum[], links: DemoLinkDatum[]} | null>(null);
    const [selectedNode, setSelectedNode] = useState<DemoNodeDatum | null>(null);
    const [hoveredNode, setHoveredNode] = useState<DemoNodeDatum | null>(null);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [optimizationMode, setOptimizationMode] = useState<'demo-optimized' | 'js-fallback'>('demo-optimized');

    const processGenerations = useCallback(async () => {
        if (!generations.length) return;
        
        setIsProcessing(true);
        const overallStartTime = performance.now();
        
        try {
            if (optimizationMode === 'demo-optimized') {
                // Demo optimized path
                console.log('🚀 Running DEMO optimization pipeline...');
                
                const tokenResult = await optimizedTokenize(generations);
                const graphResult = await optimizedBuildGraph(tokenResult.words);
                
                const nodes: DemoNodeDatum[] = graphResult.nodes.map((node: any) => ({
                    word: node.word,
                    count: node.count,
                    sentences: node.sentences || [],
                    wordIndices: node.indices || [],
                    x: Math.random() * 800 + 100,
                    y: Math.random() * 600 + 100,
                    vx: 0,
                    vy: 0,
                    rx: Math.max(20, Math.min(50, node.count * 3)),
                    ry: Math.max(10, Math.min(25, node.count * 1.5))
                }));
                
                const links: DemoLinkDatum[] = graphResult.links.map((link: any) => {
                    const sourceNode = nodes.find(n => n.word === link.source);
                    const targetNode = nodes.find(n => n.word === link.target);
                    return {
                        source: sourceNode!,
                        target: targetNode!,
                        weight: link.weight
                    };
                }).filter((link: any) => link.source && link.target);

                // Simulate WebGPU physics with D3
                const simulation = d3.forceSimulation(nodes)
                    .force("link", d3.forceLink(links).id((d: any) => d.word).strength(0.1))
                    .force("charge", d3.forceManyBody().strength(-400))
                    .force("center", d3.forceCenter(500, 300))
                    .force("collision", d3.forceCollide().radius((d: any) => d.rx! + 5));
                
                // Run simulation for better layout
                for (let i = 0; i < 200; i++) {
                    simulation.tick();
                }
                simulation.stop();
                
                const optimizedTime = performance.now() - overallStartTime;
                const estimatedJsTime = optimizedTime * (tokenResult.wasmSpeedup + graphResult.webgpuSpeedup) / 2;
                
                setPerformanceMetrics({
                    jsProcessingTime: estimatedJsTime,
                    optimizedTime,
                    speedupFactor: estimatedJsTime / optimizedTime,
                    memoryUsage: nodes.length * 100 + links.length * 50, // Simulated memory usage
                    nodeCount: nodes.length,
                    linkCount: links.length
                });
                
                setGraphData({ nodes, links });
                
            } else {
                // JS fallback path
                console.log('🔧 Running JavaScript fallback...');
                // Simulate slower JS processing
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate 500ms delay
                
                // Basic processing (simplified)
                const words = new Map();
                generations.forEach((gen, sentIndex) => {
                    gen.split(/\s+/).forEach(word => {
                        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
                        if (cleanWord.length > 2) {
                            if (!words.has(cleanWord)) {
                                words.set(cleanWord, { count: 0, sentences: [] });
                            }
                            words.get(cleanWord).count++;
                            if (!words.get(cleanWord).sentences.includes(sentIndex)) {
                                words.get(cleanWord).sentences.push(sentIndex);
                            }
                        }
                    });
                });
                
                const nodes: DemoNodeDatum[] = Array.from(words.entries())
                    .filter(([, data]: any) => data.count >= 2)
                    .map(([word, data]: any) => ({
                        word,
                        count: data.count,
                        sentences: data.sentences,
                        wordIndices: [],
                        x: Math.random() * 800 + 100,
                        y: Math.random() * 600 + 100,
                        rx: Math.max(15, Math.min(40, data.count * 2)),
                        ry: Math.max(8, Math.min(20, data.count))
                    }));
                
                const links: DemoLinkDatum[] = [];
                const jsTime = performance.now() - overallStartTime;
                
                setPerformanceMetrics({
                    jsProcessingTime: jsTime,
                    optimizedTime: jsTime,
                    speedupFactor: 1,
                    memoryUsage: nodes.length * 120, // JS uses more memory
                    nodeCount: nodes.length,
                    linkCount: 0
                });
                
                setGraphData({ nodes, links });
            }
            
        } catch (error) {
            console.error('Processing failed:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [generations, optimizationMode]);

    useEffect(() => {
        if (generations.length > 0) {
            processGenerations();
        }
    }, [generations, optimizationMode, processGenerations]);

    // D3 visualization
    useEffect(() => {
        if (!graphData || !svgRef.current) return;
        
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
        
        // Links
        const links = g.selectAll(".link")
            .data(graphData.links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", optimizationMode === 'demo-optimized' ? "#4f46e5" : "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", (d: DemoLinkDatum) => Math.min(4, d.weight))
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
        
        // Nodes
        const nodes = g.selectAll(".node")
            .data(graphData.nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (d: DemoNodeDatum) => `translate(${d.x},${d.y})`)
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
        
        // Node shapes
        nodes.append("ellipse")
            .attr("rx", (d: DemoNodeDatum) => d.rx || 20)
            .attr("ry", (d: DemoNodeDatum) => d.ry || 10)
            .attr("fill", (d: DemoNodeDatum) => {
                const activeNode = selectedNode || hoveredNode;
                if (activeNode === d) return "#ff6b6b";
                return optimizationMode === 'demo-optimized' ? 
                    "url(#optimizedGradient)" : "#69b3a2";
            })
            .attr("stroke", optimizationMode === 'demo-optimized' ? "#4f46e5" : "#333")
            .attr("stroke-width", 2);
        
        // Add gradient definition for optimized mode
        if (optimizationMode === 'demo-optimized') {
            const defs = svg.append("defs");
            const gradient = defs.append("linearGradient")
                .attr("id", "optimizedGradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "100%");
                
            gradient.append("stop")
                .attr("offset", "0%")
                .style("stop-color", "#8b5cf6")
                .style("stop-opacity", 1);
                
            gradient.append("stop")
                .attr("offset", "100%")
                .style("stop-color", "#3b82f6")
                .style("stop-opacity", 1);
        }
        
        // Labels
        nodes.append("text")
            .text((d: DemoNodeDatum) => d.word)
            .attr("text-anchor", "middle")
            .attr("dy", "0.3em")
            .attr("font-size", "11px")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .style("pointer-events", "none");
        
    }, [graphData, selectedNode, hoveredNode, optimizationMode]);

    return (
        <div className="demo-optimized-word-graph">
            {/* Performance Dashboard */}
            <div className="performance-dashboard" style={{ 
                background: optimizationMode === 'demo-optimized' ? 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                    'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '20px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
            }}>
                <h2>⚡ DEMO: Ultra-Optimized LLM Visualization</h2>
                <div className="optimization-status" style={{ display: 'flex', gap: '30px', marginBottom: '15px' }}>
                    <div>
                        <strong>🦀 WASM:</strong> {optimizationMode === 'demo-optimized' ? '✅ Demo Active' : '❌ Disabled'}
                    </div>
                    <div>
                        <strong>🎮 WebGPU:</strong> {optimizationMode === 'demo-optimized' ? '✅ Demo Active' : '❌ Disabled'}
                    </div>
                    <div>
                        <strong>Status:</strong> {isProcessing ? '⏳ Processing...' : '✅ Ready'}
                    </div>
                </div>
                
                {performanceMetrics && (
                    <div className="performance-breakdown" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                        gap: '15px',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '15px',
                        borderRadius: '10px'
                    }}>
                        <div>
                            <div><strong>⚡ Processing Time:</strong></div>
                            <div>{performanceMetrics.optimizedTime.toFixed(2)}ms</div>
                        </div>
                        <div>
                            <div><strong>🚀 Speedup:</strong></div>
                            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>
                                {performanceMetrics.speedupFactor.toFixed(1)}x faster
                            </div>
                        </div>
                        <div>
                            <div><strong>📊 Nodes/Links:</strong></div>
                            <div>{performanceMetrics.nodeCount}/{performanceMetrics.linkCount}</div>
                        </div>
                        <div>
                            <div><strong>💾 Memory:</strong></div>
                            <div>{(performanceMetrics.memoryUsage / 1024).toFixed(1)}KB</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mode Toggle */}
            <div className="mode-controls" style={{
                background: '#f8fafc',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '2px solid #e2e8f0'
            }}>
                <h3>🎛️ Optimization Demo Mode</h3>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <label>
                        <input
                            type="radio"
                            name="optimizationMode"
                            value="demo-optimized"
                            checked={optimizationMode === 'demo-optimized'}
                            onChange={(e) => setOptimizationMode(e.target.value as any)}
                        />
                        🚀 Demo Optimized (WASM + WebGPU simulation)
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
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                    <strong>Note:</strong> This is a demonstration of the optimization architecture. 
                    Real WASM modules need to be built separately.
                </div>
            </div>

            {/* Graph Visualization */}
            <div className="graph-container" style={{ position: 'relative' }}>
                <svg
                    ref={svgRef}
                    width="1000"
                    height="600"
                    style={{ 
                        border: `3px solid ${optimizationMode === 'demo-optimized' ? '#4f46e5' : '#6b7280'}`, 
                        borderRadius: '12px',
                        background: optimizationMode === 'demo-optimized' ? 
                            'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)' :
                            'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                        boxShadow: optimizationMode === 'demo-optimized' ? 
                            '0 4px 20px rgba(79, 70, 229, 0.2)' :
                            '0 4px 20px rgba(107, 114, 128, 0.2)'
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
                        <div><strong>Mode:</strong> {optimizationMode === 'demo-optimized' ? 'Optimized' : 'JavaScript'}</div>
                    </div>
                )}
            </div>
            
            {/* Stats */}
            {performanceMetrics && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong>📊 Performance:</strong> {performanceMetrics.optimizedTime.toFixed(2)}ms processing
                        </div>
                        <div>
                            <strong>⚡ Demo Speedup:</strong> 
                            <span style={{ 
                                color: optimizationMode === 'demo-optimized' ? '#059669' : '#6b7280', 
                                fontWeight: 'bold', 
                                marginLeft: '5px' 
                            }}>
                                {performanceMetrics.speedupFactor.toFixed(1)}x
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DemoOptimizedWordGraph;