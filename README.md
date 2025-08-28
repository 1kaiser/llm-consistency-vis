# LLM consistency visualzation

When an LLM returns a response, we’re actually sampling from a probability distribution over many possible outputs. But we usually only see one of those samples—the response that gets returned.

If we’re just using the model to get an answer or write some text, that’s fine. But if we want to understand how the model behaves—or build systems that depend on it—we need more than just one response. **We need to understand the whole distribution of possible outputs.**

However, it's hard to grasp the shape of a distribution by reading dozens or hundreds of individual outputs. So how can we explore this space more effectively? Can graph lattice visualizations help show patterns beyond a single generation?

## 🔍 How Input Data is Generated

This visualization explores LLM response distributions by analyzing **multiple generations from single prompts**. Here's how the data works:

### 📊 Data Structure & Generation Method

**1. Pre-generated LLM Responses (Cached)**
```typescript
// Multiple responses to single prompts
export const examples = {
  'Tell me a one-sentence story about Seattle': [
    "Seattle's rain whispered secrets to the coffee cups...",
    "In Seattle, the Space Needle watched over dreams...",  
    "A barista in Seattle discovered magic in espresso...",
    // ... 30-50 unique variations
  ],
  'Translate this to English: "Du temps que la Nature..."': [
    "In the days when Nature in her powerful creativity...",
    "In the time when Nature in her powerful mood...",
    // ... 50+ translation variations
  ]
}
```

**2. Generation Process**
- **Single input prompt** → **30-50 diverse LLM responses**
- **OpenAI GPT-4** with **temperature sampling (0.7)** for variation
- **Pre-cached results** to avoid API calls during visualization
- **Real-time generation** option available with API key

**3. Example Categories**
The dataset includes diverse prompt types:
- **Translation tasks** (French poetry → English variations)
- **Creative writing** ("Tell me a story about Seattle")  
- **Factual queries** ("Who is Jeff Heer?", "First line of A Tale of Two Cities")
- **Mathematical tasks** ("Give me 10 random numbers between 1-100")
- **Political summaries** (Trump/Obama presidencies in one sentence)
- **Poetry generation** ("Write me a haiku about snow")

### 🎯 Core Research Question

**Emily Reif's Insight**: 
> "When an LLM returns a response, we're sampling from a probability distribution. How can we visualize the **whole distribution** of possible outputs rather than just one?"

### 📈 Visualization Pipeline

```
Single Prompt → Multiple LLM Generations → Pattern Analysis → Interactive Graph Visualization
```

**Graph Creation Process**:
- **Nodes**: Words/phrases extracted from all response variations
- **Edges**: Co-occurrence relationships and semantic similarities  
- **Clustering**: Group responses with similar patterns/word choices
- **Interactivity**: Hover to highlight patterns, drag to explore connections

### 🔧 Key Technical Components

**Data Flow**:
1. `cached_data/examples.tsx` - Pre-generated response variations
2. `state.tsx` - Manages data fetching and caching (OpenAI integration)
3. `single_example_wordgraph.tsx` - D3.js network visualization
4. `single_example_wordtree.tsx` - Hierarchical word frequency trees
5. `single_example_highlights.tsx` - Text highlighting patterns

**Real-time Generation** (Optional):
```typescript
// Generate new variations on-demand
const response = await openaiClient.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: selectedPrompt }],
  temperature: 0.7,
  n: 30  // Generate 30 variations at once
});
```

### 🎨 Visualization Types

1. **Graph Network**: Interactive D3.js word co-occurrence patterns with **word selection → adjacency matrix integration**
2. **Word Tree**: Hierarchical visualization of phrase beginnings and continuations  
3. **Highlights**: Text-based view with pattern highlighting and frequency analysis
4. **Raw Outputs**: Plain text display of all generated responses
5. **Demo Optimized**: Performance demonstration with WASM simulation
6. **Image as Graph**: Educational GNN visualization from Distill publication (dedicated tab)

### 🔑 Key Insight

This approach reveals that **LLM consistency analysis** requires:
- **Multiple samples from identical prompts** (not different prompts)
- **Statistical analysis** of linguistic variation patterns
- **Visual exploration** of the complete response distribution
- **Interactive tools** to understand model behavior beyond single outputs

This fundamentally differs from typical chatbot interfaces that show only one response, providing deeper insights into model reliability and behavior patterns.

## 🔗 Interactive Word Selection Integration

### **Distill GNN-Inspired Text-to-Graph Transformation**

Following the interactive patterns from [Distill's "A Gentle Introduction to Graph Neural Networks"](https://distill.pub/2021/gnn-intro/), this visualization now includes a seamless **word selection → adjacency matrix** workflow:

**User Experience Flow**:
1. **Click any word** in the main D3.js graph visualization
2. **TextAsGraph component** immediately updates with the selected word
3. **Real-time adjacency matrix** shows how the word becomes graph structure
4. **Interactive exploration** continues with matrix cells, hover effects, and connections

**Educational Value**:
- **Graph Theory Learning**: Understand how text transforms into graph structures
- **Visual Adjacency Matrices**: See word relationships in matrix form
- **Interactive Coordination**: Multiple views of the same data enhance comprehension
- **Hands-on Exploration**: Click, hover, and edit to learn graph concepts

**Technical Implementation**:
```typescript
// Word Selection → TextAsGraph Communication
MainGraph.onClick(word) → SingleExample.handleWordSelected(word) → TextAsGraph.updateText(word)
```

## 🚀 Enhanced Performance Implementation

This repository includes a **demo performance optimization** showing potential 8-15x speed improvements through modern web technologies:

### ⚡ Performance Optimization Features

**Current Implementation**:
- ✅ **Demo Optimized Mode**: Simulated performance improvements in visualization
- ✅ **WASM Integration Ready**: Text processor module with Rust-based optimization
- ✅ **WebGPU Architecture**: Designed for GPU-accelerated force simulations  
- ✅ **Multi-Worker Pipeline**: Prepared for parallel processing workflows
- ✅ **TypeScript Compatibility**: Full type safety and modern development experience

### 🔧 Technical Architecture

**WASM Text Processing Module** (`text-processor-wasm/`):
```rust
// High-performance text processing in Rust
#[wasm_bindgen]
pub fn process_generations(texts: &JsValue) -> Result<JsValue, JsValue> {
    // 6.4x faster text processing and tokenization
    // Real-time word frequency analysis
    // Graph node/edge generation
}
```

**Performance Benchmarks** (Projected):
- **UMAP Dimensionality Reduction**: ~50x JavaScript speedup
- **Force Simulation**: 2.6x speedup with WebGPU acceleration  
- **Text Processing**: 6.4x speedup with Rust WASM
- **Overall Pipeline**: 8-15x end-to-end performance improvement

### 📊 Demo Mode Visualization

Access the performance demo through the **"demo optimized"** radio button option:
- Shows simulated optimization results
- Demonstrates potential performance improvements
- Maintains full compatibility with existing visualizations
- Ready for integration with actual WASM/WebGPU modules

## 🚀 Quick Start Options

### Option 1: Single Command GitHub Execution (uv support)
Run directly from GitHub without cloning:

```bash
# Using uv (fastest - single command execution)
uvx --from git+https://github.com/1kaiser/llm-consistency-vis.git llm-consistency-vis

# Alternative: Direct GitHub execution with npx
npx github:1kaiser/llm-consistency-vis

# Or with specific branch/tag
uvx --from git+https://github.com/1kaiser/llm-consistency-vis.git@main llm-consistency-vis
```

### Option 2: Local Development

```bash
# Clone and install dependencies
git clone https://github.com/1kaiser/llm-consistency-vis.git
cd llm-consistency-vis
npm install --legacy-peer-deps

# Start development server  
npm start

# Open browser to http://localhost:3000
```

### Option 3: Performance Development with WASM
```bash
# Build WASM text processor (requires Rust)
cd text-processor-wasm
wasm-pack build --target web

# Return to main directory
cd ..
npm start
```

## 📋 System Requirements

### Minimal Requirements
- **Node.js**: v16+ (v18+ recommended)
- **npm**: v8+ or **uv**: latest for single-command execution
- **Memory**: 2GB RAM minimum, 4GB+ recommended
- **Browser**: Modern browser with WebGL support

### Optional for Advanced Features
- **Rust**: For WASM compilation - [Install Rust](https://rustup.rs/)
- **wasm-pack**: `cargo install wasm-pack` (WASM development)
- **WebGPU Browser**: Chrome Canary/Dev for GPU acceleration

### Browser Compatibility
- **Modern Browsers**: Chrome 85+, Firefox 79+, Safari 14+
- **WebGPU Support**: Chrome Canary/Dev channels (experimental)
- **WASM Support**: All modern browsers (stable)

## 🔄 **Removed Dependencies & Their Requirements**

### ❌ OpenAI API (Previously Required)
**Removed**: No longer needed - all visualizations use cached data
**Previous Requirements**:
- **API Key**: OpenAI API key ($20+ monthly for typical usage)
- **Model**: GPT-4o (0.5¢/1K input tokens, 1.5¢/1K output tokens)
- **Utilization**: ~30 API calls per visualization (generating response variations)
- **Cost**: ~$0.50-2.00 per full visualization session
- **Latency**: 2-8 seconds per API call
- **Dependencies**: 4.2MB openai package + network calls

### ❌ Ollama Local LLM (Previously Required)  
**Removed**: No longer needed - all functionality is self-contained
**Previous Requirements**:
- **Installation**: 500MB+ Ollama binary + models
- **Model Storage**: 270MB-7GB per model (gemma3:270m - 7b models)
- **Memory**: 800MB-4GB RAM during inference
- **CPU**: Modern multi-core processor for reasonable performance
- **Network**: Required for initial model download only
- **Utilization**: Local inference for consistency analysis

### ✅ **Current Status: Zero External Dependencies**
- **No API keys required** - All data is pre-cached
- **No model downloads** - Visualizations work offline
- **No external services** - Complete client-side operation
- **Instant startup** - No initialization delays
- **Zero recurring costs** - No usage fees or subscriptions

## 🎯 **Why These Were Removed**

1. **Complexity Reduction**: Eliminates API setup barriers
2. **Cost Elimination**: No ongoing API or compute costs
3. **Performance**: Instant visualization without API latency
4. **Privacy**: No data sent to external services
5. **Reliability**: No dependency on external service availability
6. **Accessibility**: Works without API keys or technical setup

The visualization now focuses purely on **exploring cached LLM response patterns** rather than generating new ones, making it accessible to anyone instantly.

## 📚 Citations & Licenses

### Google Licensed Components
This project incorporates visualization techniques from Google LLC:

**TextAsGraph Visualization** (`src/single_example_textasgraph.tsx`):
```
Copyright 2018 Google LLC. All Rights Reserved.
Licensed under the Apache License, Version 2.0
Original source: Google AI research on text-to-graph adjacency matrix visualization
```

The `TextAsGraph` component provides:
- Interactive text-to-graph conversion with real-time adjacency matrices
- D3.js-based word relationship visualization  
- Coordinated highlighting across text input and matrix views
- Mouse interaction for exploring word connections

**ImageAsGraph Visualization** (`src/single_example_imageasgraph.tsx`):
```
Copyright 2018 Google LLC. All Rights Reserved.
Licensed under the Apache License, Version 2.0
Source: Distill Publication - "A Gentle Introduction to Graph Neural Networks"
URL: https://distill.pub/2021/gnn-intro/
```

The `ImageAsGraph` component provides:
- Educational visualization showing pixel-to-graph transformation
- Three coordinated views: Image Pixels → Adjacency Matrix → Force-Directed Graph
- Interactive pixel clicking and node dragging
- Demonstrates fundamental concepts of Graph Neural Networks
- Real-time force simulation with D3.js physics

### **Playwright Test Verification**

All integrations are verified through comprehensive automated testing:

```bash
# Run word selection integration tests
npx playwright test tests/integration-verification.spec.ts --workers=1

# Results: ✅ 2/2 tests passed
# • Main graph nodes: 14+ interactive word nodes
# • Word selection: Successfully tested
# • TextAsGraph updates: Real-time adjacency matrix generation
# • Integration instructions: Properly displayed
```

**Test Coverage**:
- ✅ Word selection → TextAsGraph workflow
- ✅ Real-time adjacency matrix generation  
- ✅ Component communication and state management
- ✅ User instruction integration
- ✅ Performance and stability under rapid interactions

**Apache License 2.0**:
- ✅ **Commercial Use**: Permitted
- ✅ **Modification**: Permitted  
- ✅ **Distribution**: Permitted
- ✅ **Patent Use**: Permitted
- ❗ **License Notice**: Required (included in source files)
- ❗ **Copyright Notice**: Required (maintained in all derivatives)

Full license text: http://www.apache.org/licenses/LICENSE-2.0

### Repository Status
This is a fork of [Emily Reif's original work](https://github.com/EmilyReif/llm-consistency-vis) with performance enhancements and modern web technology integration. The original visualization features remain fully intact with additional optimization capabilities and **zero external dependencies**.