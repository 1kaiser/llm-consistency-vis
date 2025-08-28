// WebGPU type definitions for TypeScript
declare interface Navigator {
    gpu?: GPU;
}

declare interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

declare interface GPURequestAdapterOptions {
    powerPreference?: "low-power" | "high-performance";
}

declare interface GPUAdapter {
    limits: GPUSupportedLimits;
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

declare interface GPUDeviceDescriptor {
    requiredFeatures?: GPUFeatureName[];
    requiredLimits?: Record<string, number>;
}

declare interface GPUSupportedLimits {
    maxComputeWorkgroupStorageSize: number;
    maxStorageBufferBindingSize: number;
}

declare interface GPUDevice {
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
    createCommandEncoder(): GPUCommandEncoder;
    queue: GPUQueue;
}

declare interface GPUBufferDescriptor {
    size: number;
    usage: number;
}

declare interface GPUBuffer {
    size: number;
    mapAsync(mode: number): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
    destroy(): void;
}

declare interface GPUShaderModuleDescriptor {
    code: string;
}

declare interface GPUShaderModule {}

declare interface GPUComputePipelineDescriptor {
    layout: "auto" | GPUPipelineLayout;
    compute: {
        module: GPUShaderModule;
        entryPoint: string;
    };
}

declare interface GPUComputePipeline {
    getBindGroupLayout(index: number): GPUBindGroupLayout;
}

declare interface GPUBindGroupDescriptor {
    layout: GPUBindGroupLayout;
    entries: GPUBindGroupEntry[];
}

declare interface GPUBindGroupEntry {
    binding: number;
    resource: GPUBindingResource;
}

declare interface GPUBindingResource {
    buffer?: GPUBuffer;
}

declare interface GPUBindGroup {}
declare interface GPUBindGroupLayout {}
declare interface GPUPipelineLayout {}

declare interface GPUCommandEncoder {
    beginComputePass(): GPUComputePassEncoder;
    copyBufferToBuffer(source: GPUBuffer, sourceOffset: number, destination: GPUBuffer, destinationOffset: number, size: number): void;
    finish(): GPUCommandBuffer;
}

declare interface GPUComputePassEncoder {
    setPipeline(pipeline: GPUComputePipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup): void;
    dispatchWorkgroups(x: number): void;
    end(): void;
}

declare interface GPUCommandBuffer {}

declare interface GPUQueue {
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource): void;
    submit(commandBuffers: GPUCommandBuffer[]): void;
    onSubmittedWorkDone(): Promise<void>;
}

declare enum GPUBufferUsage {
    STORAGE = 0x80,
    COPY_DST = 0x08,
    COPY_SRC = 0x04,
    MAP_READ = 0x01
}

declare enum GPUMapMode {
    READ = 0x01
}

type GPUFeatureName = string;