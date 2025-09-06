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
}

// Helper functions
// function lerp(x0: number, x1: number, t: number) {
//     return x0 + t * (x1 - x0);
// }

function lerp2([x0, y0]: [number, number], [x1, y1]: [number, number], t: number): [number, number] {
    const x = x0 + t * (x1 - x0);
    const y = y0 + t * (y1 - y0);
    return [x, y];
}

function addVec2([x0, y0]: [number, number], [x1, y1]: [number, number]): [number, number] {
    return [x0 + x1, y0 + y1];
}

function makeDrag(simulation: any) {
    return d3.drag()
        .on('start', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.2).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });
}

function fontColor(d: any) {
    if (d.character) {
        return '#fff'; // White text on character background
    }
    return d.isOn ? '#fff' : '#777';
}

function pixelColor(d: any) {
    if (d.character) {
        return d.character.color;
    }
    return d.isOn ? pixColors[0] : pixColors[1];
}

const pixColors = [d3.color('#c69700'), d3.color('#fff2ca')];
const blue = 'steelblue';
const dBlue = d3.color(blue)!.darker(-0.5);
const lBlue = d3.color(blue)!.darker(2);

// Authentic Othello characters from Distill GNN publication
const othelloCharacters = [
    { name: 'Othello', id: 'O', color: '#1f77b4' },
    { name: 'Iago', id: 'I', color: '#ff7f0e' },
    { name: 'Desdemona', id: 'D', color: '#2ca02c' },
    { name: 'Emilia', id: 'E', color: '#d62728' },
    { name: 'Cassio', id: 'C', color: '#9467bd' },
    { name: 'Brabantio', id: 'B', color: '#8c564b' },
    { name: 'Roderigo', id: 'R', color: '#e377c2' },
    { name: 'Duke', id: 'U', color: '#7f7f7f' },
    { name: 'Lodovico', id: 'L', color: '#bcbd22' },
    { name: 'Gratiano', id: 'G', color: '#17becf' },
    { name: 'Montano', id: 'M', color: '#ff9896' },
    { name: 'Bianca', id: 'A', color: '#98df8a' },
    { name: 'Clown', id: 'W', color: '#c49c94' },
    { name: 'Officer', id: 'F', color: '#f7b6d3' },
    { name: 'Gentlemen', id: 'N', color: '#c7c7c7' },
    { name: 'Sailor', id: 'S', color: '#dbdb8d' },
    { name: 'Messenger', id: 'X', color: '#9edae5' },
    { name: 'Musician', id: 'Y', color: '#ffbb78' },
    { name: 'Senator', id: 'T', color: '#ff98a0' }
];

// Based on authentic adjacency matrix from Distill GNN - main characters with key relationships
const othelloInteractions = [
    //O  I  D  E  C  B  R  U  L  G  M  A  W  F  N  S  X  Y  T
    [0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1], // Othello
    [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0], // Iago  
    [1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // Desdemona
    [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // Emilia
    [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0], // Cassio
    [0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1], // Brabantio  
    [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0], // Roderigo
    [1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1], // Duke
    [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1], // Lodovico
    [0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0], // Gratiano
    [1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0], // Montano
    [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Bianca
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // Clown
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0], // Officer
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1], // Gentlemen
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1], // Sailor  
    [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0], // Messenger
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0], // Musician
    [1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0]  // Senator
];

// Scene representation - showing key character positions in a 7x7 grid
const img = `
.O.I.D.
S..U..E
.B.F.C.
N..L..G
.R.M.A.
T..X..W
.......
`.trim();

class ImageAsGraphViz {
    private pixels: any[] = [];
    private pairs: any[] = [];
    private links: any[] = [];
    private simulation: any;
    private iRectSel: any;
    private iTextSel: any;
    private iPathSel: any;
    private gRectSel: any;
    private gTextSel: any;
    private fNodeSel: any;
    private fLinkSel: any;
    private fTextSel: any;
    private containerSel: any;

    constructor(containerRef: HTMLDivElement) {
        this.containerSel = d3.select(containerRef);
        this.containerSel.selectAll('*').remove();
        this.init();
    }

    private createConventions(parent: any, className: string, width: number, height: number) {
        const margin = { left: 0.5, right: 0, top: 0.5, bottom: 0 };
        const div = parent.append('div').classed(className, true);
        const svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        return { svg, g, width, height, margin };
    }

    private init() {
        const n = img.split('\n').length;
        const s = n * 12;
        const w = s * n;

        this.containerSel.style('margin-bottom', '20px');

        // Initialize pixels (characters)
        img.split('\n').forEach((row, j) => {
            row.split('').forEach((d, i) => {
                const character = othelloCharacters.find(c => c.id === d);
                this.pixels.push({
                    i, j, 
                    char: d,
                    character: character,
                    isOn: d !== '.', 
                    pos: [i * s, j * s], 
                    x: i * s, 
                    y: j * s
                });
            });
        });

        this.pixels.forEach((d, i) => {
            d.pixelIndex = i;
            d.str = d.character ? d.character.name : '';
        });

        const p = s / n;
        this.pairs = d3.cross(this.pixels, this.pixels);
        this.pairs.forEach(d => {
            const [a, b] = d;
            d.dist = Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
            d.pos = [a.pixelIndex * p, b.pixelIndex * p];
            
            // Check character interaction matrix
            d.hasInteraction = false;
            if (a.character && b.character) {
                const aIdx = othelloCharacters.findIndex(c => c.id === a.character.id);
                const bIdx = othelloCharacters.findIndex(c => c.id === b.character.id);
                if (aIdx >= 0 && bIdx >= 0) {
                    d.hasInteraction = othelloInteractions[aIdx][bIdx] === 1;
                }
            }
        });

        // Create three visualizations
        const i = this.createConventions(this.containerSel, 'image', w, w);
        const g = this.createConventions(this.containerSel, 'graph', w, w);
        const f = this.createConventions(this.containerSel, 'force', w, w);

        // Add labels
        this.containerSel.selectAll('svg').each((d: any, index: number, nodes: any[]) => {
            const labels = ['Scene from Othello', 'Character Adjacency Matrix', 'Character Interaction Graph'];
            d3.select(nodes[index])
                .append('text')
                .classed('chart-label', true)
                .text(labels[index])
                .attr('x', w / 2)
                .attr('y', w + 20)
                .attr('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('fill', '#333');
        });

        this.setupImageView(i, s, w);
        this.setupGraphView(g, p);
        this.setupForceView(f, w);

        this.updateOn();
        this.updateActivePair(this.pairs[202] || this.pairs[0]);
    }

    private setupImageView(i: any, s: number, w: number) {
        i.svg.append('rect')
            .attr('width', w)
            .attr('height', w)
            .attr('fill-opacity', 1)
            .attr('fill', '#aaa');

        i.svg.on('mouseleave', () => this.updateActivePixel(null));

        this.iRectSel = i.svg.selectAll('rect.pixel')
            .data(this.pixels)
            .enter()
            .append('rect')
            .classed('pixel', true)
            .attr('height', s - 1)
            .attr('width', s - 1)
            .attr('transform', (d: any) => `translate(${d.pos[0]}, ${d.pos[1]})`)
            .call(this.attachPixelHandlers.bind(this));

        this.iTextSel = i.svg.selectAll('text.pixel-label')
            .data(this.pixels)
            .enter()
            .append('text')
            .classed('pixel-label', true)
            .text((d: any) => d.str)
            .attr('transform', (d: any) => `translate(${d.pos[0]}, ${d.pos[1]})`)
            .attr('font-size', 10)
            .attr('fill', (d: any) => fontColor(d))
            .attr('x', s / 2)
            .attr('y', s / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '.33em');

        this.iPathSel = i.svg.selectAll('path.edge')
            .data(this.pairs.filter((d: any) => d.dist === 1))
            .enter()
            .append('path')
            .classed('edge', true)
            .attr('stroke', lBlue as any)
            .attr('d', this.pairPath.bind(this, s))
            .attr('pointer-events', 'none')
            .attr('stroke-width', 3);
    }

    private setupGraphView(g: any, p: number) {
        this.gRectSel = g.svg.selectAll('rect.matrix-cell')
            .data(this.pairs)
            .enter()
            .append('rect')
            .classed('matrix-cell', true)
            .attr('height', p - 0.2)
            .attr('width', p - 0.2)
            .attr('fill', (d: any) => d.hasInteraction ? dBlue as any : '#fff')
            .attr('transform', (d: any) => `translate(${d.pos[0]}, ${d.pos[1]})`)
            .on('mouseover', (event: MouseEvent, d: any) => this.updateActivePair(d));

        const topLabels = g.svg.selectAll('g.top-label')
            .data(this.pixels)
            .enter()
            .append('g')
            .classed('top-label', true)
            .attr('transform', (d: any) => `translate(${d.pixelIndex * p + p / 2}, -10)`);

        topLabels.append('text')
            .attr('transform', 'rotate(-90)');

        g.svg.selectAll('text.side-label')
            .data(this.pixels)
            .enter()
            .append('text')
            .classed('side-label', true)
            .attr('transform', (d: any) => `translate(-10, ${d.pixelIndex * p + p / 2})`);

        this.gTextSel = g.svg.selectAll('text')
            .filter((d: any) => d && d.str)
            .text((d: any) => d.str)
            .attr('font-size', 6)
            .attr('fill', '#999')
            .attr('text-anchor', 'middle')
            .attr('dy', '.33em')
            .call(this.attachPixelHandlers.bind(this));
    }

    private setupForceView(f: any, w: number) {
        f.svg.style('background', '#fff');

        this.links = this.pairs
            .filter((d: any) => d.hasInteraction)
            .filter((d: any) => d[0].pixelIndex < d[1].pixelIndex);

        this.links.forEach((d: any) => {
            d.source = d[0].pixelIndex;
            d.target = d[1].pixelIndex;
        });

        this.simulation = d3.forceSimulation()
            .nodes(this.pixels)
            .force('charge', d3.forceManyBody().strength(-300))
            .force('link', d3.forceLink().distance(40).links(this.links).id((d: any) => d.pixelIndex))
            .force('x', d3.forceX(w / 2))
            .force('y', d3.forceY(w / 2))
            .on('tick', () => {
                this.fNodeSel.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
                this.fLinkSel.attr('d', (d: any) => 
                    ['M', d.source.x, d.source.y, 'L', d.target.x, d.target.y].join(' ')
                );
            });

        this.fLinkSel = f.svg.append('g').selectAll('path.link')
            .data(this.links)
            .enter()
            .append('path')
            .classed('link', true)
            .attr('stroke', dBlue as any)
            .on('mouseover', (event: MouseEvent, d: any) => this.updateActivePair(d));

        this.fNodeSel = f.svg.selectAll('g.node')
            .data(this.pixels)
            .enter()
            .append('g')
            .classed('node', true)
            .call(makeDrag(this.simulation) as any)
            .call(this.attachPixelHandlers.bind(this))
            .on('mouseleave', () => this.updateActivePixel(null));

        this.fNodeSel.append('circle')
            .attr('stroke', '#000')
            .attr('r', 15);

        this.fTextSel = this.fNodeSel.append('text')
            .text((d: any) => d.str)
            .attr('font-size', 10)
            .attr('fill', '#999')
            .attr('text-anchor', 'middle')
            .attr('dy', '.33em');
    }

    private pairPath(s: number, [a, b]: [any, any]) {
        const pos0 = addVec2(a.pos, [s / 2, s / 2]);
        const pos1 = addVec2(b.pos, [s / 2, s / 2]);
        return ['M', lerp2(pos0, pos1, 0.2), 'L', lerp2(pos0, pos1, 1 - 0.2)].join(' ');
    }

    private attachPixelHandlers(selection: any) {
        selection
            .on('mouseover', (event: MouseEvent, d: any) => this.updateActivePixel(d))
            .on('click', (event: MouseEvent, d: any) => {
                d.isOn = !d.isOn;
                this.updateOn();
            })
            .style('cursor', 'pointer');
    }

    private updateOn() {
        this.iRectSel.style('fill', (d: any) => pixelColor(d));
        this.fNodeSel.select('circle').style('fill', (d: any) => pixelColor(d));
        
        // Update text display for character names
        this.iTextSel.text((d: any) => d.character ? d.character.name : '');
        this.fTextSel.text((d: any) => d.character ? d.character.id : '');
    }

    private updateActivePixel(pixel: any) {
        this.iPathSel.style('opacity', (e: any) => e[0] === pixel ? 1 : 0);
        this.fLinkSel.classed('active', (e: any) => e[0] === pixel || e[1] === pixel);
        this.gRectSel
            .filter((d: any) => d.hasInteraction)
            .style('fill', !pixel ? dBlue : (e: any) => 
                e[0] === pixel || e[1] === pixel ? lBlue : dBlue
            );
    }

    private updateActivePair(activePair: any) {
        if (!activePair) return;

        this.gTextSel
            .attr('fill', '#999')
            .classed('active', false)
            .filter((d: any, i: number) => d === activePair[i > this.pixels.length - 1 ? 1 : 0])
            .classed('active', true)
            .attr('fill', '#000');

        this.iTextSel
            .attr('fill', (d: any) => fontColor(d))
            .classed('active', false)
            .filter((d: any) => activePair.includes(d))
            .classed('active', true)
            .attr('fill', '#000');

        this.fTextSel
            .attr('fill', (d: any) => fontColor(d))
            .classed('active', false)
            .filter((d: any) => activePair.includes(d))
            .classed('active', true)
            .attr('fill', '#000');

        this.iPathSel.style('opacity', (d: any) => d === activePair ? 1 : 0);

        this.pairs.forEach((d: any) => {
            d.isActive = d === activePair || (d[0] === activePair[1] && d[1] === activePair[0]);
        });

        this.fLinkSel.classed('active', (d: any) => d.isActive);

        this.gRectSel
            .filter((d: any) => d.hasInteraction)
            .style('fill', (d: any) => d.isActive ? lBlue : dBlue);
    }
}

const SingleExampleImageAsGraph: React.FC<Props> = observer(({ generations }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vizRef = useRef<ImageAsGraphViz | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            vizRef.current = new ImageAsGraphViz(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                d3.select(containerRef.current).selectAll('*').remove();
            }
        };
    }, []);

    return (
        <div className="image-as-graph-container" style={{ 
            position: 'relative',
            minHeight: '300px',
            width: '100%',
            padding: '20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderRadius: '8px',
            border: '1px solid #2196f3'
        }}>
            <h3 style={{ 
                color: '#1565c0', 
                fontSize: '16px', 
                marginBottom: '10px',
                textAlign: 'center'
            }}>
                🎭 Othello Character Interaction Network (from Distill GNN)
            </h3>
            <div className="instruction-text" style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginBottom: '15px',
                textAlign: 'center',
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '4px'
            }}>
                <strong>From Distill's "A Gentle Introduction to Graph Neural Networks":</strong><br/>
                "(Left) Image of a scene from the play 'Othello'. (Center) Adjacency matrix of the interaction between characters in the play. (Right) Graph representation of these interactions."<br/>
                <em>Click character pixels to toggle visibility, hover to explore connections, drag nodes in the graph view.</em>
            </div>
            
            {/* Character Legend */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '15px',
                marginBottom: '15px',
                flexWrap: 'wrap'
            }}>
                {othelloCharacters.map(char => (
                    <div key={char.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: '#fff',
                        border: `2px solid ${char.color}`,
                        color: '#333'
                    }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: char.color,
                            marginRight: '6px',
                            borderRadius: '2px'
                        }}></div>
                        <strong>{char.id}</strong> - {char.name}
                    </div>
                ))}
            </div>
            <div 
                ref={containerRef}
                id="image-as-graph"
                style={{ 
                    position: 'relative',
                    width: '100%',
                    minHeight: '250px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '20px'
                }}
            />
        </div>
    );
});

export default SingleExampleImageAsGraph;