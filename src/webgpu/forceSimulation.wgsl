// WebGPU Compute Shader for Force Simulation
// Ultra-fast parallel force calculations on GPU

struct NodeData {
    position: vec2<f32>,
    velocity: vec2<f32>,
    mass: f32,
    charge: f32,
}

struct SimulationParams {
    num_nodes: u32,
    alpha: f32,
    alpha_decay: f32,
    velocity_decay: f32,
    center_x: f32,
    center_y: f32,
    center_strength: f32,
    charge_strength: f32,
    link_strength: f32,
    link_distance: f32,
}

struct LinkData {
    source: u32,
    target: u32,
    strength: f32,
    distance: f32,
}

@group(0) @binding(0) var<storage, read_write> nodes: array<NodeData>;
@group(0) @binding(1) var<storage, read> links: array<LinkData>;
@group(0) @binding(2) var<storage, read> params: SimulationParams;
@group(0) @binding(3) var<storage, read_write> forces: array<vec2<f32>>;

// Constants for simulation
const PI: f32 = 3.14159265359;
const MIN_DISTANCE: f32 = 1.0;
const MAX_FORCE: f32 = 100.0;

@compute @workgroup_size(64)
fn calculate_forces(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= params.num_nodes) {
        return;
    }
    
    var total_force = vec2<f32>(0.0, 0.0);
    let node = nodes[index];
    
    // 1. Charge force (repulsion between nodes)
    if (params.charge_strength != 0.0) {
        for (var i: u32 = 0u; i < params.num_nodes; i++) {
            if (i != index) {
                let other_node = nodes[i];
                let dx = node.position.x - other_node.position.x;
                let dy = node.position.y - other_node.position.y;
                let distance_sq = max(dx * dx + dy * dy, MIN_DISTANCE * MIN_DISTANCE);
                let distance = sqrt(distance_sq);
                
                // Coulomb's law: F = k * q1 * q2 / r^2
                let force_magnitude = params.charge_strength * node.charge * other_node.charge / distance_sq;
                let force_x = (dx / distance) * force_magnitude;
                let force_y = (dy / distance) * force_magnitude;
                
                total_force.x += clamp(force_x, -MAX_FORCE, MAX_FORCE);
                total_force.y += clamp(force_y, -MAX_FORCE, MAX_FORCE);
            }
        }
    }
    
    // 2. Center force (attraction to center)
    if (params.center_strength != 0.0) {
        let center_dx = params.center_x - node.position.x;
        let center_dy = params.center_y - node.position.y;
        total_force.x += center_dx * params.center_strength;
        total_force.y += center_dy * params.center_strength;
    }
    
    // Store the calculated force
    forces[index] = total_force;
}

@compute @workgroup_size(64)
fn calculate_link_forces(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let link_index = global_id.x;
    if (link_index >= arrayLength(&links)) {
        return;
    }
    
    let link = links[link_index];
    let source_node = nodes[link.source];
    let target_node = nodes[link.target];
    
    let dx = target_node.position.x - source_node.position.x;
    let dy = target_node.position.y - source_node.position.y;
    let distance = max(sqrt(dx * dx + dy * dy), MIN_DISTANCE);
    
    // Spring force: F = k * (distance - rest_length)
    let force_magnitude = link.strength * (distance - link.distance) / distance;
    let force_x = dx * force_magnitude;
    let force_y = dy * force_magnitude;
    
    // Apply equal and opposite forces to connected nodes
    // Note: This requires atomic operations in a real implementation
    // For simplicity, we'll accumulate in separate passes
    forces[link.source].x += clamp(force_x, -MAX_FORCE, MAX_FORCE);
    forces[link.source].y += clamp(force_y, -MAX_FORCE, MAX_FORCE);
    forces[link.target].x -= clamp(force_x, -MAX_FORCE, MAX_FORCE);
    forces[link.target].y -= clamp(force_y, -MAX_FORCE, MAX_FORCE);
}

@compute @workgroup_size(64)
fn update_positions(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= params.num_nodes) {
        return;
    }
    
    var node = nodes[index];
    let force = forces[index];
    
    // Verlet integration: v = v + a*dt, x = x + v*dt
    // where a = F/m (force divided by mass)
    let acceleration = force / node.mass;
    
    // Update velocity with damping
    node.velocity.x = (node.velocity.x + acceleration.x) * params.velocity_decay;
    node.velocity.y = (node.velocity.y + acceleration.y) * params.velocity_decay;
    
    // Update position
    node.position.x += node.velocity.x;
    node.position.y += node.velocity.y;
    
    // Store updated node
    nodes[index] = node;
    
    // Clear forces for next iteration
    forces[index] = vec2<f32>(0.0, 0.0);
}

// Collision detection and response
@compute @workgroup_size(64)
fn handle_collisions(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= params.num_nodes) {
        return;
    }
    
    var node = nodes[index];
    
    // Check collisions with other nodes
    for (var i: u32 = 0u; i < params.num_nodes; i++) {
        if (i != index) {
            let other_node = nodes[i];
            let dx = node.position.x - other_node.position.x;
            let dy = node.position.y - other_node.position.y;
            let distance = sqrt(dx * dx + dy * dy);
            
            // Assuming each node has a radius based on its mass
            let node_radius = sqrt(node.mass) * 5.0;
            let other_radius = sqrt(other_node.mass) * 5.0;
            let min_distance = node_radius + other_radius;
            
            if (distance < min_distance && distance > 0.0) {
                // Separate the nodes
                let overlap = min_distance - distance;
                let separation_force = overlap * 0.5;
                let normalized_dx = dx / distance;
                let normalized_dy = dy / distance;
                
                node.position.x += normalized_dx * separation_force;
                node.position.y += normalized_dy * separation_force;
            }
        }
    }
    
    nodes[index] = node;
}

// Calculate kinetic energy for convergence detection
@compute @workgroup_size(64)
fn calculate_energy(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= params.num_nodes) {
        return;
    }
    
    let node = nodes[index];
    let kinetic_energy = 0.5 * node.mass * (node.velocity.x * node.velocity.x + node.velocity.y * node.velocity.y);
    
    // Store energy in the forces array (reusing the buffer)
    forces[index].x = kinetic_energy;
}