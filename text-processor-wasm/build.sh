#!/bin/bash

echo "🚀 Building WASM Text Processor module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WASM module with optimizations
wasm-pack build \
    --target web \
    --out-dir pkg \
    --release \
    --scope llm-viz

echo "📦 WASM module built successfully!"
echo "📊 Module size:"
ls -lh pkg/*.wasm

echo "✅ Ready for integration with React app"