import { useRef, useCallback, useEffect, useState } from 'react';

interface ProcessingStats {
    wasmProcessingTime?: number;
    memoryUsage?: any;
    totalWords?: number;
    uniqueWords?: number;
    generations?: number;
}

interface UseWasmTextProcessorResult {
    isInitialized: boolean;
    isProcessing: boolean;
    error: string | null;
    stats: ProcessingStats | null;
    tokenizeGenerations: (generations: string[]) => Promise<any>;
    buildGraph: (minFrequency?: number) => Promise<any>;
    runBenchmark: (options?: any) => Promise<any>;
    initialize: () => Promise<void>;
}

export const useWasmTextProcessor = (): UseWasmTextProcessorResult => {
    const workerRef = useRef<Worker | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<ProcessingStats | null>(null);
    const messageIdRef = useRef(0);
    const pendingMessagesRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

    // Initialize worker
    useEffect(() => {
        console.log('🔧 Initializing WASM TextProcessor Worker...');
        
        try {
            // Create the worker with proper module support
            workerRef.current = new Worker(
                new URL('../workers/textProcessingWorker.ts', import.meta.url),
                { type: 'module' }
            );

            workerRef.current.onmessage = (event) => {
                const { id, type, data, error } = event.data;
                const pendingMessage = pendingMessagesRef.current.get(id);
                
                if (pendingMessage) {
                    pendingMessagesRef.current.delete(id);
                    setIsProcessing(false);
                    
                    if (type === 'SUCCESS') {
                        // Update stats if available
                        if (data?.performanceMetrics) {
                            setStats(data.performanceMetrics);
                        }
                        
                        setError(null);
                        pendingMessage.resolve(data);
                    } else if (type === 'ERROR') {
                        setError(error);
                        pendingMessage.reject(new Error(error));
                    }
                }
            };

            workerRef.current.onerror = (error) => {
                console.error('❌ Worker error:', error);
                setError('Worker initialization failed');
                setIsInitialized(false);
            };

        } catch (err) {
            console.error('❌ Failed to create worker:', err);
            setError('Failed to create WASM worker');
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const sendMessage = useCallback((type: string, payload?: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker not available'));
                return;
            }

            const id = `${Date.now()}-${++messageIdRef.current}`;
            pendingMessagesRef.current.set(id, { resolve, reject });
            
            setIsProcessing(true);
            setError(null);

            workerRef.current.postMessage({ id, type, payload });

            // Set timeout for long-running operations
            setTimeout(() => {
                if (pendingMessagesRef.current.has(id)) {
                    pendingMessagesRef.current.delete(id);
                    setIsProcessing(false);
                    reject(new Error('Operation timed out'));
                }
            }, 30000); // 30 second timeout
        });
    }, []);

    const initialize = useCallback(async (): Promise<void> => {
        if (isInitialized) return;
        
        console.log('🚀 Initializing WASM module...');
        
        try {
            await sendMessage('INIT');
            setIsInitialized(true);
            console.log('✅ WASM TextProcessor ready!');
        } catch (err) {
            console.error('❌ WASM initialization failed:', err);
            throw err;
        }
    }, [sendMessage, isInitialized]);

    const tokenizeGenerations = useCallback(async (generations: string[]): Promise<any> => {
        if (!isInitialized) {
            await initialize();
        }
        
        console.log(`📊 Tokenizing ${generations.length} generations with WASM...`);
        const startTime = performance.now();
        
        try {
            const result = await sendMessage('TOKENIZE', { generations });
            
            const totalTime = performance.now() - startTime;
            console.log(`⚡ Total processing time: ${totalTime.toFixed(2)}ms`);
            
            // Compare with estimated JS time (rough estimate: 10x slower)
            const estimatedJsTime = (result.performanceMetrics?.wasmProcessingTime || 0) * 10;
            console.log(`🏁 Estimated speedup vs JS: ${(estimatedJsTime / (result.performanceMetrics?.wasmProcessingTime || 1)).toFixed(1)}x`);
            
            return result;
        } catch (err) {
            console.error('❌ Tokenization failed:', err);
            throw err;
        }
    }, [isInitialized, initialize, sendMessage]);

    const buildGraph = useCallback(async (minFrequency: number = 2): Promise<any> => {
        if (!isInitialized) {
            await initialize();
        }
        
        console.log(`🔗 Building graph with min frequency: ${minFrequency}`);
        
        try {
            const result = await sendMessage('BUILD_GRAPH', { minFrequency });
            console.log(`✅ Graph built: ${result.nodes?.length || 0} nodes, ${result.links?.length || 0} links`);
            return result;
        } catch (err) {
            console.error('❌ Graph building failed:', err);
            throw err;
        }
    }, [isInitialized, initialize, sendMessage]);

    const runBenchmark = useCallback(async (options?: any): Promise<any> => {
        if (!isInitialized) {
            await initialize();
        }
        
        console.log('🏁 Running WASM performance benchmark...');
        
        try {
            const result = await sendMessage('BENCHMARK', options);
            console.log(`📊 Benchmark results:`, result);
            return result;
        } catch (err) {
            console.error('❌ Benchmark failed:', err);
            throw err;
        }
    }, [isInitialized, initialize, sendMessage]);

    return {
        isInitialized,
        isProcessing,
        error,
        stats,
        tokenizeGenerations,
        buildGraph,
        runBenchmark,
        initialize
    };
};