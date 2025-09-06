/**
 * Test for Othello Image-as-Graph Implementation
 * Verifies the Distill GNN Othello example functionality
 */

import { test, expect } from '@playwright/test';

test.describe('🎭 Othello Character Interaction Graph', () => {
  test('should display Othello character visualization correctly', async ({ page }) => {
    console.log('🎭 Testing Othello Image-as-Graph implementation...');
    
    // Step 1: Load application
    await page.goto('http://localhost:3000/llm-consistency-vis');
    await page.waitForSelector('.single-example', { timeout: 10000 });
    console.log('✅ Step 1: Application loaded successfully');
    
    // Step 2: Select "image as graph" tab
    const clickResult = await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][value="image as graph"]') as HTMLInputElement;
      if (radio) {
        radio.click();
        return { success: true, checked: radio.checked };
      }
      return { success: false, checked: false };
    });
    expect(clickResult.success).toBe(true);
    await page.waitForTimeout(2000); // Allow component to render
    console.log('✅ Step 2: Selected "image as graph" tab');
    
    // Step 3: Verify Othello-specific content
    await page.waitForSelector('#image-as-graph', { timeout: 5000 });
    
    const title = page.locator('h3').filter({ hasText: 'Othello Character Interaction Network' });
    await expect(title).toBeVisible();
    console.log('✅ Step 3: Othello title displayed correctly');
    
    // Step 4: Check for Distill reference
    const distillRef = page.locator('text=From Distill\'s "A Gentle Introduction to Graph Neural Networks"');
    await expect(distillRef).toBeVisible();
    console.log('✅ Step 4: Distill GNN reference present');
    
    // Step 5: Verify character legend is present
    const legendItems = page.locator('div').filter({ hasText: /^[OIDCE] - / });
    const legendCount = await legendItems.count();
    expect(legendCount).toBe(5); // Should have 5 characters
    console.log(`✅ Step 5: Character legend with ${legendCount} characters displayed`);
    
    // Step 6: Verify three visualizations are present
    const svgElements = await page.locator('#image-as-graph svg').count();
    expect(svgElements).toBe(3); // Image, Matrix, Graph
    console.log(`✅ Step 6: All three visualizations present (${svgElements} SVG elements)`);
    
    // Step 7: Check chart labels
    const chartLabels = await page.locator('#image-as-graph text.chart-label').allTextContents();
    expect(chartLabels).toContain('Scene from Othello');
    expect(chartLabels).toContain('Character Adjacency Matrix');
    expect(chartLabels).toContain('Character Interaction Graph');
    console.log('✅ Step 7: Chart labels correctly updated for Othello theme');
    
    // Step 8: Test character pixel interaction
    const characterPixels = await page.locator('#image-as-graph rect.pixel').count();
    console.log(`📊 Step 8: Found ${characterPixels} character pixels`);
    expect(characterPixels).toBeGreaterThan(0);
    
    // Step 9: Test adjacency matrix cells
    const matrixCells = await page.locator('#image-as-graph rect.matrix-cell').count();
    console.log(`📊 Step 9: Generated ${matrixCells} adjacency matrix cells`);
    expect(matrixCells).toBeGreaterThan(0);
    
    console.log('🎉 VERIFICATION COMPLETE: Othello Character Interaction Graph working correctly!');
    console.log('');
    console.log('📋 SUMMARY:');
    console.log(`   • Character legend items: ${legendCount}`);
    console.log(`   • Character pixels: ${characterPixels}`);
    console.log(`   • Adjacency matrix cells: ${matrixCells}`);
    console.log(`   • Visualization panels: ${svgElements}`);
    console.log(`   • Chart labels: ${chartLabels.join(', ')}`);
  });
  
  test('should demonstrate proper Distill GNN educational pattern', async ({ page }) => {
    console.log('🎓 DEMONSTRATION: Distill GNN Othello Pattern Implementation');
    
    await page.goto('http://localhost:3000/llm-consistency-vis');
    await page.waitForSelector('.single-example', { timeout: 10000 });
    
    // Select image as graph tab
    const clickResult = await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][value="image as graph"]') as HTMLInputElement;
      if (radio) {
        radio.click();
        return { success: true };
      }
      return { success: false };
    });
    expect(clickResult.success).toBe(true);
    await page.waitForTimeout(2000);
    
    console.log('📚 Pattern: Othello Character Scene → Adjacency Matrix → Graph (from Distill GNN)');
    console.log('🔄 Implementation:');
    console.log('   1. Left: Scene representation with character placement');
    console.log('   2. Center: Character interaction adjacency matrix');
    console.log('   3. Right: Force-directed character relationship graph');
    console.log('   4. Interactive legend showing character color coding');
    console.log('   5. Educational citation to original Distill publication');
    
    // Verify the pattern components are implemented
    const hasOthelloTitle = await page.locator('text=Othello Character Interaction Network').count() > 0;
    const hasDistillRef = await page.locator('text=From Distill\'s').count() > 0;
    const hasCharacterLegend = await page.locator('div').filter({ hasText: /^[OIDCE] - / }).count() > 0;
    const hasThreeViews = await page.locator('#image-as-graph svg').count() === 3;
    
    expect(hasOthelloTitle).toBe(true);
    expect(hasDistillRef).toBe(true);
    expect(hasCharacterLegend).toBe(true);
    expect(hasThreeViews).toBe(true);
    
    console.log('✅ All components of the Distill GNN Othello pattern are present');
    console.log('🎯 Educational value: Users learn graph representation of character relationships');
    console.log('📖 Interactive learning: Three coordinated views of same character data');
    console.log('🎭 Cultural context: Shakespeare\'s Othello as relatable example');
    
    console.log('🎉 DISTILL GNN OTHELLO PATTERN SUCCESSFULLY IMPLEMENTED!');
  });
});