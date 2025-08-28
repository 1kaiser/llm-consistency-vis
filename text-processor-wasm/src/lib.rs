use wasm_bindgen::prelude::*;
use js_sys::{Array, Object, Reflect};
use web_sys::console;
use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

// Import the `console.log` function from the `web-sys` crate
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Define a macro to make logging easier
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Set up panic hook and allocator for smaller WASM size
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    #[cfg(feature = "wee_alloc")]
    {
        use wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WordMetadata {
    word: String,
    count: u32,
    sentences: Vec<usize>,
    word_indices: Vec<usize>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphNode {
    word: String,
    count: u32,
    sentences: Vec<usize>,
    word_indices: Vec<usize>,
    children: Vec<String>,
    parents: Vec<String>,
    is_root: bool,
    is_end: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphLink {
    source: String,
    target: String,
    weight: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphData {
    nodes: Vec<GraphNode>,
    links: Vec<GraphLink>,
    total_words: u32,
    unique_words: u32,
}

#[wasm_bindgen]
pub struct TextProcessor {
    word_cache: HashMap<String, WordMetadata>,
    stop_words: HashSet<String>,
    generation_count: usize,
}

#[wasm_bindgen]
impl TextProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TextProcessor {
        let stop_words = [
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
            "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
            "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall",
            "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me",
            "him", "her", "us", "them", "my", "your", "his", "their", "our"
        ].iter().map(|s| s.to_string()).collect();

        console_log!("🚀 TextProcessor WASM initialized with {} stop words", stop_words.len());

        TextProcessor {
            word_cache: HashMap::new(),
            stop_words,
            generation_count: 0,
        }
    }

    #[wasm_bindgen]
    pub fn tokenize_generations(&mut self, generations: &JsValue) -> Result<JsValue, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Convert JS array to Rust Vec
        let generations_array: Array = generations.clone().into();
        let mut generations_vec = Vec::new();
        
        for i in 0..generations_array.length() {
            if let Some(gen) = generations_array.get(i).as_string() {
                generations_vec.push(gen);
            }
        }

        console_log!("📊 Processing {} generations", generations_vec.len());
        self.generation_count = generations_vec.len();
        
        // Clear previous cache
        self.word_cache.clear();
        
        // Process each generation
        for (sent_idx, generation) in generations_vec.iter().enumerate() {
            self.process_sentence(generation, sent_idx);
        }

        let processing_time = js_sys::Date::now() - start_time;
        console_log!("⚡ WASM tokenization completed in {:.2}ms", processing_time);
        console_log!("📈 Found {} unique words", self.word_cache.len());

        // Convert to JS object
        let result = Object::new();
        let words_array = Array::new();
        
        for (word, metadata) in &self.word_cache {
            let word_obj = Object::new();
            Reflect::set(&word_obj, &"word".into(), &word.clone().into())?;
            Reflect::set(&word_obj, &"count".into(), &metadata.count.into())?;
            
            let sentences_array: Array = metadata.sentences.iter().map(|&i| i.into()).collect();
            Reflect::set(&word_obj, &"sentences".into(), &sentences_array.into())?;
            
            let indices_array: Array = metadata.word_indices.iter().map(|&i| i.into()).collect();
            Reflect::set(&word_obj, &"wordIndices".into(), &indices_array.into())?;
            
            words_array.push(&word_obj);
        }
        
        Reflect::set(&result, &"words".into(), &words_array.into())?;
        Reflect::set(&result, &"processingTime".into(), &processing_time.into())?;
        Reflect::set(&result, &"totalGenerations".into(), &(generations_vec.len() as u32).into())?;
        
        Ok(result.into())
    }

    #[wasm_bindgen]
    pub fn build_word_graph(&self, min_frequency: u32) -> Result<JsValue, JsValue> {
        let start_time = js_sys::Date::now();
        
        console_log!("🔗 Building word graph with min frequency: {}", min_frequency);
        
        // Filter words by frequency
        let filtered_words: Vec<_> = self.word_cache.iter()
            .filter(|(_, metadata)| metadata.count >= min_frequency)
            .collect();
            
        console_log!("📊 Filtered to {} words (freq >= {})", filtered_words.len(), min_frequency);
        
        let mut nodes = Vec::new();
        let mut links = Vec::new();
        let mut word_to_index = HashMap::new();
        
        // Create nodes
        for (idx, (word, metadata)) in filtered_words.iter().enumerate() {
            word_to_index.insert(word.clone(), idx);
            
            nodes.push(GraphNode {
                word: word.to_string(),
                count: metadata.count,
                sentences: metadata.sentences.clone(),
                word_indices: metadata.word_indices.clone(),
                children: Vec::new(),
                parents: Vec::new(),
                is_root: false,
                is_end: false,
            });
        }
        
        // Calculate co-occurrence links
        let mut co_occurrence = HashMap::new();
        
        // For each pair of words, check if they appear in the same sentences
        for (word1, meta1) in &filtered_words {
            for (word2, meta2) in &filtered_words {
                if word1 != word2 {
                    let common_sentences: HashSet<_> = meta1.sentences.iter()
                        .filter(|s| meta2.sentences.contains(s))
                        .collect();
                    
                    if !common_sentences.is_empty() {
                        let key = if word1 < word2 { 
                            format!("{}|{}", word1, word2) 
                        } else { 
                            format!("{}|{}", word2, word1) 
                        };
                        co_occurrence.insert(key, common_sentences.len() as u32);
                    }
                }
            }
        }
        
        // Create links from co-occurrence data
        for (key, weight) in co_occurrence {
            let parts: Vec<&str> = key.split('|').collect();
            if parts.len() == 2 {
                links.push(GraphLink {
                    source: parts[0].to_string(),
                    target: parts[1].to_string(),
                    weight,
                });
            }
        }
        
        let graph_data = GraphData {
            nodes,
            links,
            total_words: self.word_cache.values().map(|m| m.count).sum(),
            unique_words: self.word_cache.len() as u32,
        };
        
        let processing_time = js_sys::Date::now() - start_time;
        console_log!("⚡ Graph built in {:.2}ms: {} nodes, {} links", 
                    processing_time, graph_data.nodes.len(), graph_data.links.len());
        
        // Convert to JS
        let result = serde_wasm_bindgen::to_value(&graph_data)?;
        Ok(result)
    }

    #[wasm_bindgen]
    pub fn get_word_frequencies(&self) -> JsValue {
        let frequencies = Object::new();
        
        for (word, metadata) in &self.word_cache {
            let _ = Reflect::set(&frequencies, &word.clone().into(), &metadata.count.into());
        }
        
        frequencies.into()
    }

    #[wasm_bindgen]
    pub fn get_performance_stats(&self) -> JsValue {
        let stats = Object::new();
        let _ = Reflect::set(&stats, &"totalWords".into(), &(self.word_cache.values().map(|m| m.count).sum::<u32>()).into());
        let _ = Reflect::set(&stats, &"uniqueWords".into(), &(self.word_cache.len() as u32).into());
        let _ = Reflect::set(&stats, &"generations".into(), &(self.generation_count as u32).into());
        let _ = Reflect::set(&stats, &"averageWordsPerGeneration".into(), &((self.word_cache.values().map(|m| m.count).sum::<u32>() as f64) / (self.generation_count as f64)).into());
        
        stats.into()
    }

    // Private helper methods
    fn process_sentence(&mut self, sentence: &str, sent_idx: usize) {
        let words = self.tokenize_sentence(sentence);
        
        for (word_idx, word) in words.iter().enumerate() {
            if !self.stop_words.contains(word) && word.len() > 2 {
                let entry = self.word_cache.entry(word.clone()).or_insert_with(|| {
                    WordMetadata {
                        word: word.clone(),
                        count: 0,
                        sentences: Vec::new(),
                        word_indices: Vec::new(),
                    }
                });
                
                entry.count += 1;
                if !entry.sentences.contains(&sent_idx) {
                    entry.sentences.push(sent_idx);
                }
                entry.word_indices.push(word_idx);
            }
        }
    }
    
    fn tokenize_sentence(&self, sentence: &str) -> Vec<String> {
        sentence
            .to_lowercase()
            .chars()
            .map(|c| if c.is_alphabetic() || c.is_whitespace() { c } else { ' ' })
            .collect::<String>()
            .split_whitespace()
            .filter(|word| !word.is_empty())
            .map(|word| word.to_string())
            .collect()
    }
}

// Export utility functions
#[wasm_bindgen]
pub fn benchmark_tokenization(text: &str, iterations: u32) -> f64 {
    let start_time = js_sys::Date::now();
    
    for _ in 0..iterations {
        let _words: Vec<String> = text
            .to_lowercase()
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();
    }
    
    let end_time = js_sys::Date::now();
    let total_time = end_time - start_time;
    
    console_log!("🏁 Tokenization benchmark: {} iterations in {:.2}ms", iterations, total_time);
    
    total_time / iterations as f64
}

#[wasm_bindgen]
pub fn get_wasm_memory_usage() -> u32 {
    // Return current WASM memory usage in pages (64KB each)
    wasm_bindgen::memory()
        .buffer()
        .byte_length() / (64 * 1024)
}