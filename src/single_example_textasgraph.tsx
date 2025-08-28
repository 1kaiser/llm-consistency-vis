/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { observer } from 'mobx-react';

interface Props {
    generations: string[];
    selectedWord?: string;
}

const padding = 30;
const wordSpacing = 30;
const fontSize = 30;
const charWidth = calcCharWidth();
const steelblue = d3.color('steelblue');
const blue = steelblue!.darker(-0.5);
const blueDark = steelblue!.darker(2);

function calcCharWidth() {
    const spanSel = d3.select('body').append('span').text('x')
        .style('font-family', 'monospace')
        .style('font-size', fontSize + 'px');
    const w = (spanSel.node() as HTMLElement).offsetWidth;
    spanSel.remove();
    return w;
}

class TextAsGraphViz {
    private rectSel: any;
    private textSel: any;
    private inputNode: HTMLInputElement;
    private rectData: any[];
    private sel: any;
    private wordsHolder: any;
    private coords = [null, null];
    private adjMatSel: any;

    constructor(containerRef: HTMLDivElement, initialText: string = '') {
        this.sel = d3.select(containerRef);
        this.sel.selectAll('*').remove(); // Clear any existing content

        // Make the z index lower to make overflow go behind words.
        this.sel.style('z-index', '-1');
        
        this.wordsHolder = this.sel.append('div');
        
        const c = this.createConventions();
        const [svgSel, divSel] = c.layers;

        divSel.style('left', padding + 'px')
            .style('top', (20 + padding) + 'px')
            .style('height', '30px');

        const that = this;
        const inputSel = divSel.append('input')
            .style('word-spacing', wordSpacing + 'px')
            .style('font-size', fontSize + 'px')
            .attr('maxlength', 30)
            .on('input', () => this.render())
            .on('mousemove', (event: MouseEvent) => {
                const target = event.target as HTMLInputElement;
                const rect = target.getBoundingClientRect();
                const x = event.clientX - rect.left;
                let offset = 0;
                let wordIdx = 0;
                for (let l of [...target.value]) {
                    const isSpace = l === ' ';
                    offset += isSpace ? charWidth + wordSpacing : charWidth;
                    wordIdx += isSpace ? 1 : 0;
                    if (offset > x) {
                        that.hover(wordIdx, isSpace ? wordIdx - 1 : wordIdx);
                        return;
                    }
                }
            })
            .on('mouseout', () => this.hover());

        this.inputNode = inputSel.node() as HTMLInputElement;
        this.inputNode.value = initialText || 'Graphs are all around us';

        const height = 100;

        this.rectData = d3.range(20).map(i => ({ i }));

        this.rectSel = svgSel.selectAll('rect')
            .data(this.rectData)
            .enter()
            .append('rect')
            .attr('stroke', '#000')
            .attr('fill', () => `hsl(51, 100%, ${Math.random() * 75 + 25}%)`)
            .attr('height', height / 2)
            .attr('y', height / 4)
            .attr('rx', height / 6)
            .attr('ry', height / 6)
            .attr('transform', `translate(${padding}, 0)`);

        this.rectSel.each((d: any, i: number, nodes: any[]) => { 
            d.rectSel = d3.select(nodes[i] as SVGRectElement); 
        });

        this.textSel = svgSel.selectAll('text')
            .data(this.rectData)
            .enter()
            .append('text')
            .text('→')
            .attr('y', height / 2)
            .attr('dy', '.33em')
            .attr('text-anchor', 'middle')
            .attr('fill', blue as any)
            .style('font-size', '30px')
            .attr('transform', `translate(${padding}, 0)`);

        this.textSel.each((d: any, i: number, nodes: any[]) => { 
            d.textSel = d3.select(nodes[i] as SVGTextElement); 
        });

        this.adjMatSel = this.sel.append('svg')
            .style('position', 'absolute')
            .style('top', '150px')
            .style('left', '50px');

        this.render();
    }

    private createConventions() {
        const width = 800;
        const height = 250;
        const margin = { left: 0, top: 0, right: 0, bottom: 0 };

        const svg = this.wordsHolder.append('svg')
            .attr('width', width)
            .attr('height', height);

        const div = this.wordsHolder.append('div')
            .style('position', 'absolute');

        return {
            layers: [svg, div],
            width,
            height,
            margin
        };
    }

    private render() {
        this.rectSel.attr('opacity', 0);
        this.textSel.attr('opacity', 0);

        const words = this.inputNode.value.split(' ').map((word, i) => ({ word, i }));

        let x = 0;
        const pad = 5;
        const spaceWidth = charWidth + wordSpacing;

        words.forEach(d => {
            const width = d.word.length * charWidth;

            // Only update if we have a rectSel for this index
            if (d.i < this.rectData.length && this.rectData[d.i] && this.rectData[d.i].rectSel) {
                this.rectData[d.i].rectSel
                    .attr('opacity', 1)
                    .attr('x', x - pad)
                    .attr('width', width + pad * 2);
            }

            x += width + spaceWidth;

            if (!words[d.i + 1]) return; // skip arrow for last word

            // Only update if we have a textSel for this index
            if (d.i < this.rectData.length && this.rectData[d.i] && this.rectData[d.i].textSel) {
                this.rectData[d.i].textSel
                    .attr('opacity', 1)
                    .attr('x', x - spaceWidth / 2);
            }
        });

        // Center the words
        const containerWidth = (this.wordsHolder.node() as HTMLElement).getBoundingClientRect().width;
        this.wordsHolder.style('left', (containerWidth - x) / 2 + 'px');

        this.makeAdjMat(words);
    }

    private makeAdjMat(words: any[]) {
        this.adjMatSel.selectAll('*').remove();

        this.adjMatSel
            .attr('font-size', 12)
            .attr('fill', 'gray');

        const pairs = d3.cross(words, words);
        const w = 20;
        
        this.adjMatSel
            .selectAll('rect')
            .data(pairs)
            .enter()
            .append('rect')
            .attr('width', w)
            .attr('height', w)
            .attr('transform', (d: any) => `translate(${d[0].i * w}, ${d[1].i * w})`)
            .attr('fill', (d: any) => this.isEdge(d) ? blue as any : 'white')
            .attr('stroke', '#aaa')
            .attr('stroke-width', 0.2)
            .on('mouseover', (event: MouseEvent, d: any) => this.hover(d[0].i, d[1].i))
            .on('mouseout', (event: MouseEvent) => this.hover());

        // Center adj matrix
        const containerWidth = (this.wordsHolder.node() as HTMLElement).getBoundingClientRect().width;
        this.adjMatSel.style('left', (containerWidth - w * words.length) / 2 + 'px');

        // Add top words
        this.adjMatSel.selectAll('text.top')
            .data(words)
            .enter()
            .append('text')
            .classed('top', true)
            .attr('transform', (d: any) => `translate(${d.i * w + w / 2}, -5) rotate(-90)`)
            .text((d: any) => d.word);

        // Add side words
        this.adjMatSel.selectAll('text.side')
            .data(words)
            .enter()
            .append('text')
            .classed('side', true)
            .attr('transform', (d: any) => `translate(-5, ${(d.i + 0.75) * w})`)
            .attr('text-anchor', 'end')
            .text((d: any) => d.word);
    }

    private isEdge(d: any) {
        return d[0].i - d[1].i === 1;
    }

    private hover(i?: number, j?: number) {
        if (this.coords[0] === i && this.coords[1] === j) {
            return;
        }
        this.coords = [i as any, j as any];
        
        // Update the adj mat square color
        this.adjMatSel.selectAll('rect')
            .attr('fill', (d: any) => !this.isEdge(d) ? 'white' : (d[0].i === i && d[1].i === j ? blueDark as any : blue as any));

        // Highlight the text on the adj mat
        const highlightColor = '#000';
        this.adjMatSel.selectAll('text.top')
            .attr('fill', (d: any) => d.i === i ? highlightColor : 'gray')
            .style('font-weight', (d: any) => d.i === i ? 'bold' : '');
        
        this.adjMatSel.selectAll('text.side')
            .attr('fill', (d: any) => d.i === j ? highlightColor : 'gray');

        this.rectSel.each((dRectSel: any) => {
            if (dRectSel && dRectSel.rectSel) {
                dRectSel.rectSel.attr('stroke', (d: any) => (d.i === i || d.i === j) ? highlightColor : '#000')
                    .attr('stroke-width', (d: any) => (d.i === i || d.i === j) ? 3 : 1);
            }
            
            if (dRectSel && dRectSel.textSel) {
                dRectSel.textSel.attr('stroke', (d: any) => (d.i === j && j === i! - 1) ? blueDark as any : blue as any)
                    .attr('stroke-width', (d: any) => (d.i === j && j === i! - 1) ? 4 : 0)
                    .attr('fill', (d: any) => (d.i === j && j === i! - 1) ? blueDark as any : blue as any);
            }
        });
    }

    public updateText(text: string) {
        this.inputNode.value = text;
        this.render();
    }
}

const SingleExampleTextAsGraph = React.forwardRef<any, Props>(({ generations, selectedWord }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vizRef = useRef<TextAsGraphViz | null>(null);

    // Expose the updateText method via ref
    React.useImperativeHandle(ref, () => ({
        updateText: (text: string) => {
            if (vizRef.current) {
                vizRef.current.updateText(text);
            }
        }
    }));

    useEffect(() => {
        if (containerRef.current) {
            // Initialize with first generation or default text
            const initialText = generations.length > 0 ? generations[0] : 'Graphs are all around us';
            vizRef.current = new TextAsGraphViz(containerRef.current, initialText);
        }

        return () => {
            if (containerRef.current) {
                d3.select(containerRef.current).selectAll('*').remove();
            }
        };
    }, []);

    useEffect(() => {
        if (vizRef.current && generations.length > 0) {
            // Update with first generation when generations change
            vizRef.current.updateText(generations[0]);
        }
    }, [generations]);

    return (
        <div className="text-as-graph-container" style={{ 
            position: 'relative',
            minHeight: '400px',
            width: '100%',
            padding: '20px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
        }}>
            <h3 style={{ 
                color: '#495057', 
                fontSize: '16px', 
                marginBottom: '15px',
                textAlign: 'center'
            }}>
                🔗 Text-to-Graph Adjacency Analysis
            </h3>
            <div className="instruction-text" style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginBottom: '15px',
                textAlign: 'center'
            }}>
                Interactive text input with real-time adjacency matrix. Edit the text above to see word relationships. 
                Hover over matrix cells to highlight word connections.
                <br />
                <strong style={{ color: '#28a745' }}>
                    💡 Click any word in the main graph above to see it transformed into an adjacency matrix!
                </strong>
            </div>
            <div 
                ref={containerRef}
                id="text-as-graph"
                style={{ 
                    position: 'relative',
                    width: '100%',
                    minHeight: '350px'
                }}
            />
        </div>
    );
});

export default observer(SingleExampleTextAsGraph);