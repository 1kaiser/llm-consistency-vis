#!/usr/bin/env python3
"""
LLM Consistency Visualization Server Launcher
Single-command execution with uv support

Usage:
    uvx --from git+https://github.com/1kaiser/llm-consistency-vis.git llm-consistency-vis
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_node():
    """Check if Node.js is available"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✅ Node.js found: {version}")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ Node.js not found. Please install Node.js from https://nodejs.org/")
    return False

def check_npm():
    """Check if npm is available"""
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✅ npm found: {version}")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ npm not found. Please install Node.js which includes npm.")
    return False

def install_dependencies():
    """Install npm dependencies"""
    print("📦 Installing dependencies...")
    try:
        result = subprocess.run(['npm', 'install', '--legacy-peer-deps'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Dependencies installed successfully")
            return True
        else:
            print(f"❌ Dependency installation failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def start_server():
    """Start the development server"""
    print("🚀 Starting LLM Consistency Visualization server...")
    print("📊 Server will be available at http://localhost:3000")
    print("🌐 Features: Neo4j Ultra-Optimized 3D Graph, WASM Performance, WebGL Acceleration")
    print()
    
    try:
        # Run npm start in foreground so user can see output and stop with Ctrl+C
        subprocess.run(['npm', 'start'], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Server failed to start: {e}")
        return False
    except FileNotFoundError:
        print("❌ npm command not found")
        return False
    
    return True

def main():
    """Main entry point for uv execution"""
    print("🎯 LLM Consistency Visualization - Ultra-Optimized Edition")
    print("🔬 Exploring LLM response distributions with advanced visualizations")
    print()
    
    # Check system requirements
    if not check_node() or not check_npm():
        print("\n💡 Install Node.js from: https://nodejs.org/")
        print("   Then run this command again")
        sys.exit(1)
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    print(f"📁 Working directory: {script_dir}")
    
    # Install dependencies if needed
    if not Path('node_modules').exists():
        if not install_dependencies():
            sys.exit(1)
    else:
        print("✅ Dependencies already installed")
    
    # Start the server
    print()
    if not start_server():
        sys.exit(1)

if __name__ == '__main__':
    main()