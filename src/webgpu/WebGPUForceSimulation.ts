// WebGPU Force Simulation for ultra-fast graph physics
import forceSimulationShader from './forceSimulation.wgsl?raw';

interface NodeData {
    position: [number, number];
    velocity: [number, number];
    mass: number;
    charge: number;
}

interface LinkData {
    source: number;
    target: number;
    strength: number;
    distance: number;
}

interface SimulationParams {
    numNodes: number;
    alpha: number;
    alphaDecay: number;
    velocityDecay: number;
    centerX: number;
    centerY: number;
    centerStrength: number;
    chargeStrength: number;
    linkStrength: number;
    linkDistance: number;
}

export class WebGPUForceSimulation {
    private device: GPUDevice | null = null;
    private computePipeline: GPUComputePipeline | null = null;
    private nodeBuffer: GPUBuffer | null = null;
    private linkBuffer: GPUBuffer | null = null;
    private paramsBuffer: GPUBuffer | null = null;
    private forceBuffer: GPUBuffer | null = null;
    private bindGroup: GPUBindGroup | null = null;
    
    private nodes: NodeData[] = [];
    private links: LinkData[] = [];
    private params: SimulationParams;
    
    private isInitialized = false;
    private animationFrameId: number | null = null;

    constructor() {
        this.params = {
            numNodes: 0,
            alpha: 1.0,
            alphaDecay: 0.02,
            velocityDecay: 0.9,
            centerX: 500,
            centerY: 300,
            centerStrength: 0.1,
            chargeStrength: -300,
            linkStrength: 0.1,
            linkDistance: 100
        };
    }

    async initialize(): Promise<boolean> {
        console.log('🚀 Initializing WebGPU Force Simulation...');
        
        try {
            // Check WebGPU support
            if (!navigator.gpu) {
                console.warn('❌ WebGPU not supported in this browser');
                return false;
            }

            // Request adapter and device
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });
            
            if (!adapter) {
                console.warn('❌ No WebGPU adapter found');
                return false;
            }

            this.device = await adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {
                    maxComputeWorkgroupStorageSize: adapter.limits.maxComputeWorkgroupStorageSize,
                    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                }
            });

            // Create shader module
            const shaderModule = this.device.createShaderModule({
                code: forceSimulationShader
            });

            // Create compute pipeline
            this.computePipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'calculate_forces'
                }
            });

            console.log('✅ WebGPU Force Simulation initialized successfully!');
            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('❌ WebGPU initialization failed:', error);
            return false;
        }
    }

    setupSimulation(nodes: any[], links: any[]): void {
        if (!this.device || !this.computePipeline) {
            throw new Error('WebGPU not initialized');
        }

        console.log(`📊 Setting up simulation: ${nodes.length} nodes, ${links.length} links`);

        // Convert nodes to GPU format
        this.nodes = nodes.map((node, index) => ({
            position: [node.x || Math.random() * 1000, node.y || Math.random() * 600],
            velocity: [0, 0],
            mass: Math.max(1, node.count || 1),
            charge: -(node.count || 1) * 10 // Negative for repulsion
        }));

        // Convert links to GPU format
        this.links = links.map(link => {
            const sourceIndex = nodes.findIndex(n => n.word === link.source);
            const targetIndex = nodes.findIndex(n => n.word === link.target);
            return {
                source: sourceIndex,
                target: targetIndex,
                strength: this.params.linkStrength,
                distance: this.params.linkDistance
            };
        }).filter(link => link.source >= 0 && link.target >= 0);

        this.params.numNodes = this.nodes.length;

        // Create buffers
        this.createBuffers();
        this.createBindGroup();
    }

    private createBuffers(): void {
        if (!this.device) return;

        const nodeSize = 8 * 4; // 8 floats: position(2), velocity(2), mass(1), charge(1), padding(2)
        const linkSize = 4 * 4; // 4 floats: source, target, strength, distance
        const paramsSize = 10 * 4; // 10 floats for simulation parameters
        const forceSize = 2 * 4; // 2 floats for force vector

        // Node buffer
        this.nodeBuffer = this.device.createBuffer({
            size: this.nodes.length * nodeSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        // Link buffer  
        this.linkBuffer = this.device.createBuffer({
            size: Math.max(this.links.length * linkSize, 16), // Minimum size
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // Parameters buffer
        this.paramsBuffer = this.device.createBuffer({
            size: paramsSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // Force buffer (for intermediate force calculations)
        this.forceBuffer = this.device.createBuffer({
            size: this.nodes.length * forceSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // Upload initial data
        this.uploadNodeData();
        this.uploadLinkData();
        this.uploadParams();
    }

    private createBindGroup(): void {
        if (!this.device || !this.computePipeline || !this.nodeBuffer || !this.linkBuffer || !this.paramsBuffer || !this.forceBuffer) {
            return;
        }

        this.bindGroup = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.nodeBuffer } },
                { binding: 1, resource: { buffer: this.linkBuffer } },
                { binding: 2, resource: { buffer: this.paramsBuffer } },
                { binding: 3, resource: { buffer: this.forceBuffer } },
            ],
        });
    }

    private uploadNodeData(): void {
        if (!this.device || !this.nodeBuffer) return;

        const nodeArray = new Float32Array(this.nodes.length * 8);
        
        for (let i = 0; i < this.nodes.length; i++) {
            const offset = i * 8;
            const node = this.nodes[i];
            
            nodeArray[offset] = node.position[0];     // position.x
            nodeArray[offset + 1] = node.position[1]; // position.y
            nodeArray[offset + 2] = node.velocity[0]; // velocity.x
            nodeArray[offset + 3] = node.velocity[1]; // velocity.y
            nodeArray[offset + 4] = node.mass;        // mass
            nodeArray[offset + 5] = node.charge;      // charge
            nodeArray[offset + 6] = 0;                // padding
            nodeArray[offset + 7] = 0;                // padding
        }

        this.device.queue.writeBuffer(this.nodeBuffer, 0, nodeArray);
    }

    private uploadLinkData(): void {
        if (!this.device || !this.linkBuffer || this.links.length === 0) return;

        const linkArray = new Float32Array(this.links.length * 4);
        
        for (let i = 0; i < this.links.length; i++) {
            const offset = i * 4;
            const link = this.links[i];
            
            linkArray[offset] = link.source;      // source node index
            linkArray[offset + 1] = link.target;  // target node index
            linkArray[offset + 2] = link.strength; // spring strength
            linkArray[offset + 3] = link.distance; // rest distance
        }

        this.device.queue.writeBuffer(this.linkBuffer, 0, linkArray);
    }

    private uploadParams(): void {
        if (!this.device || !this.paramsBuffer) return;

        const paramsArray = new Float32Array([
            this.params.numNodes,
            this.params.alpha,
            this.params.alphaDecay,
            this.params.velocityDecay,
            this.params.centerX,
            this.params.centerY,
            this.params.centerStrength,
            this.params.chargeStrength,
            this.params.linkStrength,
            this.params.linkDistance,
        ]);

        this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsArray);
    }

    async runSimulation(iterations: number = 100): Promise<{ x: number, y: number }[]> {
        if (!this.isInitialized || !this.device || !this.computePipeline || !this.bindGroup) {
            throw new Error('WebGPU simulation not properly initialized');
        }

        console.log(`⚡ Running WebGPU simulation for ${iterations} iterations...`);
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            // Create command encoder
            const commandEncoder = this.device.createCommandEncoder();
            const computePass = commandEncoder.beginComputePass();

            // Set pipeline and bind group
            computePass.setPipeline(this.computePipeline);
            computePass.setBindGroup(0, this.bindGroup);

            // Dispatch workgroups (64 threads per workgroup)
            const workgroupSize = 64;
            const numWorkgroups = Math.ceil(this.params.numNodes / workgroupSize);
            
            // 1. Calculate forces
            computePass.dispatchWorkgroups(numWorkgroups);
            
            // 2. Update positions
            // Note: In a complete implementation, we'd need separate compute passes
            // for different shader entry points
            
            computePass.end();

            // Submit commands
            this.device.queue.submit([commandEncoder.finish()]);
            
            // Update alpha for cooling
            this.params.alpha *= (1 - this.params.alphaDecay);
            this.uploadParams();

            // Break if simulation has cooled down
            if (this.params.alpha < 0.005) break;
        }

        // Wait for GPU operations to complete
        await this.device.queue.onSubmittedWorkDone();

        // Read back results
        const positions = await this.readNodePositions();
        
        const simulationTime = performance.now() - startTime;
        console.log(`⚡ WebGPU simulation completed in ${simulationTime.toFixed(2)}ms`);
        console.log(`🎯 Performance: ${(iterations / simulationTime * 1000).toFixed(0)} iterations/sec`);

        return positions;
    }

    private async readNodePositions(): Promise<{ x: number, y: number }[]> {
        if (!this.device || !this.nodeBuffer) {
            return [];
        }

        // Create staging buffer for reading data back
        const stagingBuffer = this.device.createBuffer({
            size: this.nodeBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        // Copy data from storage buffer to staging buffer
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.nodeBuffer, 0, stagingBuffer, 0, this.nodeBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        // Map and read staging buffer
        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = stagingBuffer.getMappedRange();
        const dataArray = new Float32Array(arrayBuffer);

        // Extract positions
        const positions: { x: number, y: number }[] = [];
        for (let i = 0; i < this.params.numNodes; i++) {
            const offset = i * 8;
            positions.push({
                x: dataArray[offset],
                y: dataArray[offset + 1]
            });
        }

        stagingBuffer.unmap();
        stagingBuffer.destroy();

        return positions;
    }

    setParameters(newParams: Partial<SimulationParams>): void {
        this.params = { ...this.params, ...newParams };
        this.uploadParams();
    }

    destroy(): void {
        console.log('🧹 Cleaning up WebGPU resources...');
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.nodeBuffer?.destroy();
        this.linkBuffer?.destroy();
        this.paramsBuffer?.destroy();
        this.forceBuffer?.destroy();
        
        this.device = null;
        this.isInitialized = false;
    }

    // Static method to check WebGPU support
    static async checkSupport(): Promise<boolean> {
        if (!navigator.gpu) {
            console.log('❌ WebGPU not supported - falling back to CPU simulation');
            return false;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.log('❌ No WebGPU adapter available');
                return false;
            }

            console.log('✅ WebGPU supported and available');
            return true;
        } catch (error) {
            console.warn('❌ WebGPU support check failed:', error);
            return false;
        }
    }
}