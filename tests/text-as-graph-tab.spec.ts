/**
 * Test for Text-as-Graph Tab Implementation
 * Verifies the new dedicated tab functionality
 */

import { test, expect } from '@playwright/test';

test.describe('🔗 Text-as-Graph Tab Implementation', () => {
  test('should have text as graph radio button option', async ({ page }) => {
    console.log('🔍 Testing Text-as-Graph tab implementation...');
    
    // Step 1: Load application
    await page.goto('http://localhost:3000/llm-consistency-vis');
    await page.waitForSelector('.single-example', { timeout: 10000 });
    console.log('✅ Step 1: Application loaded successfully');
    
    // Step 2: Check if "text as graph" radio button exists
    const radioButtons = await page.locator('input[type="radio"]').allTextContents();
    const radioLabels = await page.locator('label').allTextContents();
    
    console.log('📋 Available radio options:', radioLabels);
    
    // Step 3: Look for "text as graph" option (radio buttons are hidden by CSS)
    const radioExists = await page.locator('input[type="radio"][value="text as graph"]').count();
    expect(radioExists).toBeGreaterThan(0);
    console.log('✅ Step 3: "text as graph" radio button found in DOM');
    
    // Step 4: Select the "text as graph" option using JavaScript (radio inputs are CSS hidden)
    const clickResult = await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][value="text as graph"]') as HTMLInputElement;
      if (radio) {
        radio.click();
        return { success: true, checked: radio.checked };
      }
      return { success: false, checked: false };
    });
    expect(clickResult.success).toBe(true);
    expect(clickResult.checked).toBe(true);
    await page.waitForTimeout(2000); // Allow time for component to render
    console.log('✅ Step 4: Selected "text as graph" tab');
    
    // Step 5: Verify TextAsGraph component is now visible
    await page.waitForSelector('#text-as-graph', { timeout: 5000 });
    const textInput = page.locator('#text-as-graph input');
    await expect(textInput).toBeVisible();
    console.log('✅ Step 5: TextAsGraph component is visible after tab selection');
    
    // Step 6: Test the input functionality
    await textInput.fill('neural networks test');
    await page.waitForTimeout(1500);
    
    const matrixRects = await page.locator('#text-as-graph svg rect').count();
    console.log(`📊 Step 6: Generated ${matrixRects} adjacency matrix cells`);
    expect(matrixRects).toBeGreaterThan(0);
    
    // Step 7: Check for Distill-style example buttons
    const exampleButtons = page.locator('.example-buttons button');
    const buttonCount = await exampleButtons.count();
    console.log(`🎯 Step 7: Found ${buttonCount} example buttons`);
    expect(buttonCount).toBeGreaterThan(0);
    
    // Step 8: Test an example button
    if (buttonCount > 0) {
      await exampleButtons.first().click();
      await page.waitForTimeout(1000);
      
      const newValue = await textInput.inputValue();
      console.log(`✅ Step 8: Example button clicked, input updated to: "${newValue}"`);
      expect(newValue.length).toBeGreaterThan(0);
    }
    
    console.log('🎉 VERIFICATION COMPLETE: Text-as-Graph tab working correctly!');
  });
  
  test('should show appropriate instruction text for text as graph', async ({ page }) => {
    await page.goto('http://localhost:3000/llm-consistency-vis');
    await page.waitForSelector('.single-example', { timeout: 10000 });
    
    // Select text as graph tab (radio inputs are CSS hidden)
    const clickResult = await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][value="text as graph"]') as HTMLInputElement;
      if (radio) {
        radio.click();
        return { success: true, checked: radio.checked };
      }
      return { success: false, checked: false };
    });
    expect(clickResult.success).toBe(true);
    await page.waitForTimeout(1000);
    
    // Check instruction text
    const instructionText = page.locator('.graph-controls-section .instruction-text');
    const text = await instructionText.textContent();
    
    expect(text).toContain('Interactive text-to-graph adjacency matrix');
    expect(text).toContain('Distill');
    expect(text).toContain('graph structure');
    
    console.log('✅ Instruction text properly shows Distill GNN educational content');
  });
});