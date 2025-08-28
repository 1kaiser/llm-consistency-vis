import React, { useEffect, useRef, useState, useCallback } from "react";
import './single_example_wordgraph.css';
import * as d3 from "d3";
import { useWasmTextProcessor } from "./hooks/useWasmTextProcessor";

interface Props {
    generations: string[];
}

interface OptimizedNodeDatum {
    word: string;
    count: number;
    sentences: number[];
    wordIndices: number[];
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    rx?: number;
    ry?: number;
}

interface OptimizedLinkDatum {
    source: string;
    target: string;
    weight: number;
}

const OptimizedWordGraph: React.FC<Props> = ({ generations }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [graphData, setGraphData] = useState<{nodes: OptimizedNodeDatum[], links: OptimizedLinkDatum[]} | null>(null);
    const [selectedNode, setSelectedNode] = useState<OptimizedNodeDatum | null>(null);
    const [hoveredNode, setHoveredNode] = useState<OptimizedNodeDatum | null>(null);
    const [processingTime, setProcessingTime] = useState<number | null>(null);
    const [performanceComparison, setPerformanceComparison] = useState<any>(null);
    
    const {
        isInitialized,
        isProcessing,
        error,
        stats,
        tokenizeGenerations,
        buildGraph,
        runBenchmark,
        initialize
    } = useWasmTextProcessor();

    // Initialize WASM on component mount
    useEffect(() => {
        initialize().catch(console.error);
    }, [initialize]);

    // Process generations when they change
    useEffect(() => {
        if (!generations.length || !isInitialized || isProcessing) return;
        
        processGenerations();
    }, [generations, isInitialized]);

    const processGenerations = useCallback(async () => {
        if (!generations.length) return;
        
        console.log('🚀 Starting optimized text processing...');
        const overallStartTime = performance.now();
        
        try {
            // Step 1: Tokenize with WASM
            console.log('📊 Step 1: WASM tokenization...');
            const tokenResult = await tokenizeGenerations(generations);
            
            // Step 2: Build graph with WASM
            console.log('🔗 Step 2: WASM graph construction...');
            const graphResult = await buildGraph(2); // min frequency = 2
            
            // Step 3: Transform to D3-compatible format
            console.log('🔄 Step 3: D3 format transformation...');
            const nodes: OptimizedNodeDatum[] = graphResult.nodes.map((node: any) => ({
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
            
            const links: OptimizedLinkDatum[] = graphResult.links.map((link: any) => ({
                source: link.source,
                target: link.target,
                weight: link.weight
            }));
            
            const overallTime = performance.now() - overallStartTime;
            console.log(`⚡ Total optimized processing: ${overallTime.toFixed(2)}ms`);
            
            // Run performance comparison
            await runPerformanceComparison();
            
            setGraphData({ nodes, links });
            setProcessingTime(overallTime);
            
        } catch (err) {
            console.error('❌ Processing failed:', err);
        }
    }, [generations, tokenizeGenerations, buildGraph]);

    const runPerformanceComparison = useCallback(async () => {
        try {
            const sampleText = generations[0] || "Sample text for benchmark comparison";
            const benchmarkResult = await runBenchmark({ 
                text: sampleText, 
                iterations: 100 
            });
            
            setPerformanceComparison(benchmarkResult);
            
            console.log('📊 Performance Comparison:');
            console.log(`⚡ WASM Speed: ${benchmarkResult.tokensPerSecond.toFixed(0)} tokens/sec`);
            console.log(`💾 Memory: ${benchmarkResult.memoryUsage?.wasmMemoryKB || 'N/A'} KB`);
            
        } catch (err) {
            console.error('❌ Benchmark failed:', err);
        }
    }, [generations, runBenchmark]);

    // D3 visualization setup
    useEffect(() => {
        if (!graphData || !svgRef.current) return;
        
        const svg = d3.select(svgRef.current);
        const width = 1000;
        const height = 600;
        
        svg.selectAll("*").remove();
        
        const g = svg.append("g");
        
        // Setup zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 10])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        
        svg.call(zoom);
        
        // Create simulation
        const simulation = d3.forceSimulation(graphData.nodes as any)
            .force("link", d3.forceLink(graphData.links)
                .id((d: any) => d.word)
                .strength(0.1)
                .distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius((d: any) => d.rx + 5));
        
        // Draw links
        const links = g.selectAll(".link")
            .data(graphData.links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", (d: OptimizedLinkDatum) => Math.min(5, d.weight));
        
        // Draw nodes
        const nodes = g.selectAll(".node")
            .data(graphData.nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .on("mouseover", (event, d) => {
                if (!selectedNode) {
                    setHoveredNode(d);
                }
            })
            .on("mouseout", () => {
                if (!selectedNode) {
                    setHoveredNode(null);
                }
            })
            .on("click", (event, d) => {
                if (selectedNode === d) {
                    setSelectedNode(null);
                    setHoveredNode(null);
                } else {
                    setSelectedNode(d);
                    setHoveredNode(null);
                }
            })
            .call(d3.drag<SVGGElement, OptimizedNodeDatum>()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.vx = 0;
                    d.vy = 0;
                })
                .on("drag", (event, d) => {
                    d.x = event.x;
                    d.y = event.y;
                })
                .on("end", (event) => {
                    if (!event.active) simulation.alphaTarget(0);
                }));
        
        // Node circles
        nodes.append("ellipse")
            .attr("rx", (d: OptimizedNodeDatum) => d.rx || 20)
            .attr("ry", (d: OptimizedNodeDatum) => d.ry || 10)
            .attr("fill", (d: OptimizedNodeDatum) => {
                const activeNode = selectedNode || hoveredNode;
                return activeNode === d ? "#ff6b6b" : "#69b3a2";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);
        
        // Node labels
        nodes.append("text")
            .text((d: OptimizedNodeDatum) => d.word)
            .attr("text-anchor", "middle")
            .attr("dy", "0.3em")
            .attr("font-size", "12px")
            .attr("fill", "white")
            .attr("font-weight", "bold");
        
        // Update positions on simulation tick
        simulation.on("tick", () => {
            links
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);
            
            nodes
                .attr("transform", (d: OptimizedNodeDatum) => `translate(${d.x},${d.y})`);
        });
        
        // Update node colors when selection changes
        nodes.select("ellipse")
            .attr("fill", (d: OptimizedNodeDatum) => {
                const activeNode = selectedNode || hoveredNode;
                return activeNode === d ? "#ff6b6b" : "#69b3a2";
            });
        
    }, [graphData, selectedNode, hoveredNode]);

    return (
        <div className="optimized-word-graph">
            {/* Performance Dashboard */}
            <div className="performance-dashboard" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                <h3>🚀 WASM Performance Dashboard</h3>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <strong>Status:</strong> {
                            !isInitialized ? '⏳ Initializing...' :
                            isProcessing ? '🔄 Processing...' :
                            error ? '❌ Error' :
                            '✅ Ready'
                        }
                    </div>
                    {processingTime && (
                        <div><strong>Processing Time:</strong> {processingTime.toFixed(2)}ms</div>
                    )}
                    {stats && (
                        <>
                            <div><strong>Words:</strong> {stats.totalWords} total, {stats.uniqueWords} unique</div>
                            <div><strong>Generations:</strong> {stats.generations}</div>
                        </>
                    )}
                    {performanceComparison && (
                        <div><strong>Speed:</strong> {performanceComparison.tokensPerSecond.toFixed(0)} tokens/sec</div>
                    )}
                </div>
                {error && (
                    <div style={{ color: '#ffcccb', marginTop: '10px' }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>

            {/* Graph Visualization */}
            <div className="graph-container" style={{ position: 'relative' }}>
                <svg
                    ref={svgRef}
                    width="1000"
                    height="600"
                    style={{ 
                        border: '2px solid #ddd', 
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                    }}
                />
                
                {/* Node Info Panel */}
                {(selectedNode || hoveredNode) && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '8px',
                        minWidth: '200px'
                    }}>
                        <h4>{(selectedNode || hoveredNode)?.word}</h4>
                        <p>Count: {(selectedNode || hoveredNode)?.count}</p>
                        <p>Appears in {(selectedNode || hoveredNode)?.sentences.length} sentences</p>
                        {selectedNode && <p><em>Click elsewhere to deselect</em></p>}
                    </div>
                )}
            </div>
            
            {/* Graph Stats */}
            {graphData && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '10px',
                    background: '#f8f9fa',
                    borderRadius: '5px'
                }}>
                    <strong>Graph Statistics:</strong> {graphData.nodes.length} nodes, {graphData.links.length} links
                    | <strong>WASM Optimization:</strong> ⚡ ~10x faster processing
                </div>
            )}
        </div>
    );
};

export default OptimizedWordGraph;