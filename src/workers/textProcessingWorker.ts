// Web Worker for WASM-accelerated text processing
import init, { TextProcessor } from '../../text-processor-wasm/pkg/text_processor_wasm';

interface WorkerMessage {
    id: string;
    type: 'INIT' | 'TOKENIZE' | 'BUILD_GRAPH' | 'BENCHMARK';
    payload?: any;
}

interface WorkerResponse {
    id: string;
    type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
    data?: any;
    error?: string;
}

class TextProcessingWorker {
    private textProcessor: TextProcessor | null = null;
    private isInitialized = false;

    constructor() {
        self.addEventListener('message', this.handleMessage.bind(this));
        console.log('🔧 TextProcessingWorker initialized');
    }

    private async handleMessage(event: MessageEvent<WorkerMessage>) {
        const { id, type, payload } = event.data;
        
        try {
            switch (type) {
                case 'INIT':
                    await this.initialize();
                    this.postSuccess(id, { initialized: true });
                    break;
                    
                case 'TOKENIZE':
                    const tokenResult = await this.tokenizeGenerations(payload.generations);
                    this.postSuccess(id, tokenResult);
                    break;
                    
                case 'BUILD_GRAPH':
                    const graphResult = await this.buildGraph(payload.minFrequency || 2);
                    this.postSuccess(id, graphResult);
                    break;
                    
                case 'BENCHMARK':
                    const benchmarkResult = await this.runBenchmark(payload);
                    this.postSuccess(id, benchmarkResult);
                    break;
                    
                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
        } catch (error) {
            this.postError(id, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    private async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing WASM TextProcessor...');
        const startTime = performance.now();
        
        // Initialize the WASM module
        await init();
        
        // Create TextProcessor instance
        this.textProcessor = new TextProcessor();
        
        const initTime = performance.now() - startTime;
        console.log(`⚡ WASM TextProcessor initialized in ${initTime.toFixed(2)}ms`);
        
        this.isInitialized = true;
    }

    private async tokenizeGenerations(generations: string[]): Promise<any> {
        if (!this.textProcessor) {
            throw new Error('TextProcessor not initialized');
        }

        console.log(`📊 Processing ${generations.length} generations with WASM...`);
        const startTime = performance.now();

        // Convert to JS array format expected by WASM
        const generationsArray = generations;
        
        // Call WASM tokenization
        const result = this.textProcessor.tokenize_generations(generationsArray);
        
        const processingTime = performance.now() - startTime;
        console.log(`⚡ WASM tokenization completed in ${processingTime.toFixed(2)}ms`);

        // Add performance metrics
        const performanceStats = this.textProcessor.get_performance_stats();
        
        return {
            ...result,
            performanceMetrics: {
                wasmProcessingTime: processingTime,
                memoryUsage: this.getMemoryUsage(),
                ...performanceStats
            }
        };
    }

    private async buildGraph(minFrequency: number): Promise<any> {
        if (!this.textProcessor) {
            throw new Error('TextProcessor not initialized');
        }

        console.log(`🔗 Building graph with min frequency: ${minFrequency}`);
        const startTime = performance.now();
        
        const graphData = this.textProcessor.build_word_graph(minFrequency);
        
        const buildTime = performance.now() - startTime;
        console.log(`⚡ Graph built in ${buildTime.toFixed(2)}ms`);

        return {
            ...graphData,
            buildTime,
            memoryUsage: this.getMemoryUsage()
        };
    }

    private async runBenchmark(options: any): Promise<any> {
        if (!this.textProcessor) {
            throw new Error('TextProcessor not initialized');
        }

        const { text = "This is a sample text for benchmarking tokenization performance", iterations = 1000 } = options;
        
        console.log(`🏁 Running benchmark: ${iterations} iterations`);
        
        // Import benchmark function
        const { benchmark_tokenization } = await import('../../text-processor-wasm/pkg/text_processor_wasm');
        
        const avgTime = benchmark_tokenization(text, iterations);
        
        return {
            averageTimeMs: avgTime,
            iterations,
            tokensPerSecond: (text.split(' ').length / avgTime) * 1000,
            memoryUsage: this.getMemoryUsage()
        };
    }

    private getMemoryUsage(): any {
        if (!this.textProcessor) return null;
        
        // Import memory function
        import('../../text-processor-wasm/pkg/text_processor_wasm').then(({ get_wasm_memory_usage }) => {
            return {
                wasmMemoryPages: get_wasm_memory_usage(),
                wasmMemoryKB: get_wasm_memory_usage() * 64,
                jsMemoryMB: (performance as any).memory ? (performance as any).memory.usedJSHeapSize / (1024 * 1024) : null
            };
        });
        
        return null;
    }

    private postSuccess(id: string, data: any): void {
        const response: WorkerResponse = {
            id,
            type: 'SUCCESS',
            data
        };
        self.postMessage(response);
    }

    private postError(id: string, error: string): void {
        const response: WorkerResponse = {
            id,
            type: 'ERROR',
            error
        };
        self.postMessage(response);
    }

    private postProgress(id: string, progress: any): void {
        const response: WorkerResponse = {
            id,
            type: 'PROGRESS',
            data: progress
        };
        self.postMessage(response);
    }
}

// Initialize the worker
new TextProcessingWorker();

export {};  // Make this a module